from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import casparser
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FolioAI CAS Parser", version="0.1.0")

# Allow requests from Next.js (localhost:3000 in dev, Vercel URL in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("NEXTJS_URL", "http://localhost:3000")],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/api/cas/parse")
async def parse_cas(
    file: UploadFile,
    password: str = Form(default=""),
):
    """
    Parse a CAMS or KFintech CAS PDF using casparser.
    Returns structured transaction data with folio and PAN information.
    Password is used only for in-memory decryption — never stored or logged.
    """
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    tmp_path = None
    try:
        # Write to temp file (casparser requires a file path, not a file object)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        logger.info(f"Parsing CAS PDF: {file.filename}, size: {len(content)} bytes")

        # casparser auto-detects CAMS vs KFintech format
        data = casparser.read_cas_pdf(tmp_path, password or "")

        # Convert casparser output to serializable dict
        # casparser v0.8.1 returns a Pydantic model — prefer model_dump() for pydantic v2
        if hasattr(data, "model_dump"):
            serialized = data.model_dump()
        elif hasattr(data, "dict"):
            serialized = data.dict()
        elif hasattr(data, "__dict__"):
            serialized = _serialize_casparser_output(data)
        else:
            serialized = data

        folios = serialized.get('folios', [])
        logger.info(f"Successfully parsed {len(folios)} folios")
        return {"status": "ok", "data": serialized}

    except Exception as e:
        logger.error(f"CAS parse error [{type(e).__module__}.{type(e).__name__}]: {e}")
        return {"status": "error", "message": str(e), "partial": None}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _serialize_casparser_output(data) -> dict:
    """Recursively serialize casparser output objects to plain dicts."""
    if hasattr(data, "__dict__"):
        return {k: _serialize_casparser_output(v) for k, v in data.__dict__.items()}
    elif isinstance(data, list):
        return [_serialize_casparser_output(item) for item in data]
    elif hasattr(data, "isoformat"):  # date objects
        return data.isoformat()
    else:
        return data


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cas-parser"}
