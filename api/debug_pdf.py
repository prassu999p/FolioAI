"""Quick diagnostic — run with: python3 api/debug_pdf.py path/to/file.pdf [password]"""
import sys
import fitz  # pymupdf

path = sys.argv[1]
password = sys.argv[2] if len(sys.argv) > 2 else ""

doc = fitz.open(path)
if password:
    doc.authenticate(password)

print("=== Page 1 text (first 2000 chars) ===")
print(doc[0].get_text()[:2000])
