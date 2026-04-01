"""
Custom CAMS/KFintech CAS PDF parser using pdfplumber.

casparser's built-in PDF reader (mupdf/pdfminer) merges rows when stamp duty
entries share a line with the following transaction, causing most transactions
to be silently dropped. pdfplumber extracts each row cleanly.

This module extracts text via pdfplumber, then uses casparser's own
`process_detailed_text` by converting the space-separated output to the
double-tab-separated format casparser's regexes expect.
"""

import re
import pdfplumber

# Column x-boundaries for the CAMS/KFintech 6-column layout.
# Empirically determined from the PDF layout:
#   Date       : x0 ~ 28
#   Description: x0 ~ 74  (gap from date end ~66 is only ~8px)
#   Amount     : x0 ~ 340 (first numeric column)
#   Units      : x0 ~ 400
#   Price      : x0 ~ 460
#   Balance    : x0 ~ 530
# Words with x0 >= NUMERIC_COL_START are treated as separate (tab) columns.
NUMERIC_COL_START = 330

# Date pattern used to detect transaction rows
DATE_RE = re.compile(r"^\d{2}-\w{3}-\d{4}$")

# Matches a line that starts with a date (i.e. has numeric columns after it)
_DATE_LINE_RE = re.compile(r"^\d{2}-\w{3}-\d{4}(\t\t|$)")
# Matches a line that contains only description text (no tab separators)
_DESC_ONLY_RE = re.compile(r"^[^\t]+$")
# Known metadata/header prefixes that must NOT be merged into transaction rows
_METADATA_RE = re.compile(
    r"^(AMFI|ISIN|Folio|Registrar|RTA|Advisor|KYC|PAN|Nominee|Email|Mobile|Address|"
    r"Opening Balance|Closing Balance|Transaction)",
    re.IGNORECASE,
)


def _extract_lines_from_page(page) -> list[str]:
    """
    Extract transaction-aware lines from a single pdfplumber page.

    Strategy: use extract_words() to get word positions. For each horizontal
    row (words grouped by vertical position), reconstruct the line using
    double-tab separators between the description column and the numeric
    columns (Amount, Units, Price, Balance). Words within the date/description
    zone are joined with a single space.
    """
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    if not words:
        return []

    # Group words into rows by y-position (±2px tolerance)
    rows: dict[int, list] = {}
    for w in words:
        y = round(w["top"] / 2) * 2  # snap to 2px grid
        rows.setdefault(y, []).append(w)

    lines = []
    for y in sorted(rows):
        row_words = sorted(rows[y], key=lambda w: w["x0"])

        parts: list[str] = []
        desc_chunk = ""
        date_emitted = False

        for w in row_words:
            text = w["text"]
            x0 = w["x0"]

            if x0 >= NUMERIC_COL_START:
                # Numeric column — flush description chunk first
                if desc_chunk:
                    parts.append(desc_chunk)
                    desc_chunk = ""
                parts.append(text)
            else:
                # Date/description zone
                if not date_emitted and DATE_RE.match(text):
                    # Emit date as its own tab-separated part
                    parts.append(text)
                    date_emitted = True
                else:
                    desc_chunk = (desc_chunk + " " + text).strip()

        if desc_chunk:
            parts.append(desc_chunk)

        line = "\t\t".join(parts)
        lines.append(line)

    return lines


def _merge_split_rows(lines: list[str]) -> list[str]:
    """
    Fix rows where pdfplumber splits a single transaction across two lines.

    KFintech PDFs sometimes render the description text at a slightly different
    vertical position than the date + numeric columns, so they land in separate
    y-buckets.  Pattern:
        Line N:   "Systematic Investment (6/55)"   ← description only, no tabs
        Line N+1: "12-Jan-2022\\t\\t4999.75\\t\\t93.734\\t\\t53.34\\t\\t577.420"

    We merge them into:
        "12-Jan-2022\\t\\tSystematic Investment (6/55)\\t\\t4999.75\\t\\t..."
    """
    merged: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look-ahead: if this line is description-only and the next starts with a date.
        # Exclude metadata lines (AMFI, Folio, ISIN, etc.) — they must stay standalone.
        if (
            _DESC_ONLY_RE.match(line)
            and not DATE_RE.match(line)      # not itself a bare date
            and not _METADATA_RE.match(line) # not a header/metadata line
            and i + 1 < len(lines)
            and _DATE_LINE_RE.match(lines[i + 1])
        ):
            next_line = lines[i + 1]
            # next_line = "DD-Mon-YYYY\t\t<numbers...>"  (or bare date with no tabs)
            # Insert description after the date: "DD-Mon-YYYY\t\t<desc>\t\t<numbers...>"
            tab_pos = next_line.find("\t\t")
            if tab_pos == -1:
                # Bare date line — just append description
                merged.append(f"{next_line}\t\t{line}")
            else:
                date_part = next_line[:tab_pos]
                rest = next_line[tab_pos + 2:]  # strip leading \t\t
                merged.append(f"{date_part}\t\t{line}\t\t{rest}")
            i += 2
        else:
            merged.append(line)
            i += 1
    return merged


def extract_lines(pdf_path: str, password: str = "") -> list[str]:
    """Extract all lines from a CAS PDF using pdfplumber."""
    all_lines: list[str] = []
    open_kwargs = {"password": password} if password else {}
    with pdfplumber.open(pdf_path, **open_kwargs) as pdf:
        for page in pdf.pages:
            all_lines.extend(_extract_lines_from_page(page))
    return _merge_split_rows(all_lines)


def parse_cas_pdf(pdf_path: str, password: str = ""):
    """
    Parse a CAMS/KFintech CAS PDF using pdfplumber for text extraction
    and casparser's process_detailed_text for structure parsing.

    Returns a casparser CASData-compatible dict.
    """
    from casparser.process.cas_detailed import process_detailed_text

    lines = extract_lines(pdf_path, password)
    text = "\u2029".join(lines)
    return process_detailed_text(text)
