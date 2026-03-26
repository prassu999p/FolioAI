from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import re
import json
import logging
import urllib.request
import urllib.parse
from decimal import Decimal
from cas.pdfplumber_parser import parse_cas_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FolioAI CAS Parser", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("NEXTJS_URL", "http://localhost:3000")],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Module-level cache: scheme_name → AMFI code
_NAME_AMFI_CACHE: dict[str, str] = {}
_FILLER_WORDS = {"fund", "funds", "plan", "option", "the", "of", "and", "formerly"}


def _resolve_amfi_by_name(scheme_name: str) -> str | None:
    """
    Resolve AMFI scheme code by searching MFAPI with the scheme name.
    Handles CAS naming quirks like "Mid Cap" vs "Midcap".
    """
    if scheme_name in _NAME_AMFI_CACHE:
        return _NAME_AMFI_CACHE[scheme_name]

    clean = scheme_name.replace(" - ", " ").strip()
    # Try original and normalized variants (Mid Cap → Midcap, etc.)
    variants = [clean]
    normalized = re.sub(
        r"\b(Mid|Small|Large|Multi|Flexi)\s+(Cap)\b",
        r"\1\2", clean, flags=re.IGNORECASE,
    )
    if normalized != clean:
        variants.append(normalized)

    # Collect candidates from all search variants (de-duped by code)
    seen: set[int] = set()
    all_candidates: list[dict] = []
    for variant in variants:
        url = f"https://api.mfapi.in/mf/search?q={urllib.parse.quote(variant)}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                results = json.loads(resp.read().decode("utf-8"))
            for r in results:
                code = r.get("schemeCode")
                if code and code not in seen:
                    seen.add(code)
                    all_candidates.append(r)
        except Exception as exc:
            logger.warning(f"MFAPI search failed for '{variant}': {exc}")

    # Score all candidates by Jaccard similarity of significant words.
    # Normalize compound words: "midcap" → "mid cap", etc. so both sides match.
    def _norm_words(text: str) -> set[str]:
        t = re.sub(r"(?i)\b(mid|small|large|multi|flexi)(cap)\b", r"\1 \2", text.lower())
        return set(re.findall(r"\w+", t)) - _FILLER_WORDS

    q_words = _norm_words(clean)
    best_code, best_score = None, -1.0
    for r in all_candidates:
        c_name = r.get("schemeName", "")
        c_lower = c_name.lower()
        if "direct" not in c_lower or "growth" not in c_lower:
            continue
        c_words = _norm_words(c_name)
        union = q_words | c_words
        score = len(q_words & c_words) / len(union) if union else 0
        if score > best_score:
            best_score = score
            best_code = str(r["schemeCode"])
    if best_code and best_score > 0.5:
        _NAME_AMFI_CACHE[scheme_name] = best_code
        logger.info(f"Resolved AMFI {best_code} for '{scheme_name}' (score={best_score:.2f})")
        return best_code

    logger.warning(f"No AMFI match for '{scheme_name}' via MFAPI")
    return None


def _enrich_amfi_codes(serialized: dict) -> dict:
    """Fill in missing AMFI codes using MFAPI name-based search."""
    for folio in serialized.get("folios", []):
        schemes = folio.get("schemes") or []
        if not schemes and folio.get("scheme"):
            schemes = [folio]
        for scheme in schemes:
            if scheme.get("amfi"):
                continue
            scheme_name = scheme.get("scheme", "")
            if not scheme_name:
                continue
            amfi = _resolve_amfi_by_name(scheme_name)
            if amfi:
                scheme["amfi"] = amfi
    return serialized


@app.post("/api/cas/parse")
async def parse_cas(
    file: UploadFile,
    password: str = Form(default=""),
):
    """
    Parse a CAMS or KFintech CAS PDF using pdfplumber + casparser.
    Returns structured transaction data with folio and PAN information.
    """
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        logger.info(f"Parsing CAS PDF: {file.filename}, size: {len(content)} bytes")

        data = parse_cas_pdf(tmp_path, password or "")

        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        elif hasattr(data, "__dict__"):
            serialized = _serialize_casparser_output(data)
        else:
            serialized = data

        serialized = _coerce_decimals(serialized)
        serialized = _enrich_amfi_codes(serialized)

        folios = serialized.get("folios", [])
        logger.info(f"Successfully parsed {len(folios)} folios")
        return {"status": "ok", "data": serialized}

    except Exception as e:
        logger.error(f"CAS parse error [{type(e).__module__}.{type(e).__name__}]: {e}")
        return {"status": "error", "message": str(e), "partial": None}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _coerce_decimals(obj):
    """Recursively convert Decimal values to float so JSON serialization produces numbers."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _coerce_decimals(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_coerce_decimals(item) for item in obj]
    return obj


def _serialize_casparser_output(data) -> dict:
    """Recursively serialize casparser output objects to plain dicts."""
    if hasattr(data, "__dict__"):
        return {k: _serialize_casparser_output(v) for k, v in data.__dict__.items()}
    elif isinstance(data, list):
        return [_serialize_casparser_output(item) for item in data]
    elif hasattr(data, "isoformat"):
        return data.isoformat()
    else:
        return data


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cas-parser"}
