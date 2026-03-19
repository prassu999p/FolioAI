"""
Tests for the CAS parse endpoint.

Run with: pytest api/cas/test_parse.py -v
Requires: pip install -r api/requirements.txt pytest pytest-asyncio httpx
"""
import io
import pytest
from unittest.mock import patch, MagicMock


# These tests require the full Python environment (casparser, fastapi, etc.)
# They are written first (TDD RED) and pass once parse.py is implemented.

@pytest.fixture
def client():
    """FastAPI test client for the CAS parse app."""
    from fastapi.testclient import TestClient
    from api.cas.parse import app
    return TestClient(app)


def test_health_endpoint(client):
    """GET /health returns 200 with status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "cas-parser"}


def test_parse_rejects_non_pdf(client):
    """POST /api/cas/parse with a non-PDF file returns 400."""
    response = client.post(
        "/api/cas/parse",
        files={"file": ("report.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400


def test_parse_returns_ok_structure_on_success(client):
    """POST /api/cas/parse returns {status: ok, data: {...}} on successful parse."""
    mock_data = {
        "statement_period": {"from": "2020-01-01", "to": "2024-12-31"},
        "folios": [],
        "cas_type": "CAMS",
    }
    with patch("api.cas.parse.casparser") as mock_casparser:
        mock_casparser.read_cas_pdf.return_value = mock_data
        mock_casparser.exceptions.CASParseError = Exception

        response = client.post(
            "/api/cas/parse",
            files={"file": ("statement.pdf", b"%PDF-mock", "application/pdf")},
            data={"password": ""},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "data" in body


def test_parse_returns_error_on_cas_parse_error(client):
    """POST /api/cas/parse returns {status: error} when casparser raises CASParseError."""
    with patch("api.cas.parse.casparser") as mock_casparser:
        mock_casparser.exceptions.CASParseError = ValueError
        mock_casparser.read_cas_pdf.side_effect = ValueError("Invalid PDF")

        response = client.post(
            "/api/cas/parse",
            files={"file": ("statement.pdf", b"%PDF-mock", "application/pdf")},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "error"
    assert "message" in body
    assert body["partial"] is None


def test_temp_file_cleanup_on_success(client, tmp_path):
    """Temp file is cleaned up after a successful parse."""
    created_paths = []

    original_named_temp = __import__("tempfile").NamedTemporaryFile

    def tracking_temp(*args, **kwargs):
        f = original_named_temp(*args, **kwargs)
        created_paths.append(f.name)
        return f

    mock_data = {"folios": [], "cas_type": "CAMS"}

    with patch("api.cas.parse.casparser") as mock_casparser, \
         patch("tempfile.NamedTemporaryFile", side_effect=tracking_temp):
        mock_casparser.read_cas_pdf.return_value = mock_data
        mock_casparser.exceptions.CASParseError = Exception

        client.post(
            "/api/cas/parse",
            files={"file": ("statement.pdf", b"%PDF-mock", "application/pdf")},
        )

    import os
    for path in created_paths:
        assert not os.path.exists(path), f"Temp file not cleaned up: {path}"


def test_password_not_in_logs(client, caplog):
    """Password string is never logged."""
    secret_password = "ABCDE1234F01011990"
    mock_data = {"folios": [], "cas_type": "CAMS"}

    with patch("api.cas.parse.casparser") as mock_casparser:
        mock_casparser.read_cas_pdf.return_value = mock_data
        mock_casparser.exceptions.CASParseError = Exception

        client.post(
            "/api/cas/parse",
            files={"file": ("statement.pdf", b"%PDF-mock", "application/pdf")},
            data={"password": secret_password},
        )

    assert secret_password not in caplog.text
