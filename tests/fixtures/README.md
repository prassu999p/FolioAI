# Test Fixtures

## PDF Fixtures
- `sample-cams.pdf` — Anonymized CAMS CAS PDF for DATA-01 tests
- `sample-kfintech.pdf` — Anonymized KFintech CAS PDF for DATA-02 tests

These files are NOT committed to git (PII risk). Provide your own anonymized samples
during development. Tests that require these files are skipped in CI if the files don't exist.

## JSON Fixtures
JSON representations of parsed CAS outputs used for unit tests without requiring
actual PDFs. Created in Plan 04 when the CAS pipeline is built.
