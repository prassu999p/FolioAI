---
phase: 02-portfolio-analytics
plan: "08"
subsystem: api
tags: [casparser, zod, transactions, sip, cas-import]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: transactions table, folios table, CAS import route infrastructure
provides:
  - CASFolioSchema accepting both flat folio and nested schemes casparser output formats
  - Import route normalising folio input into schemeList before processing
affects: [sip-analytics, holder-analytics, transaction-history]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-format schema with optional fields, normalised intermediate type before loop]

key-files:
  created: []
  modified:
    - lib/validators/cas-schema.ts
    - app/api/cas/import/route.ts

key-decisions:
  - "CASFolioSchema accepts both formats via optional fields with defaults — avoids breaking nested-format callers while supporting flat CAMS output"
  - "NormalisedScheme type declared inline in route — avoids new module-level export for a route-internal concern"
  - "schemeList falls back to empty array when neither folio.schemes nor folio.scheme is present — safe no-op for degenerate folios"

patterns-established:
  - "Dual-format schema: make existing field optional with default([]), add flat-format fields as optional"
  - "Normalise before loop: build schemeList from either shape, rest of loop body unchanged"

requirements-completed: [SIP-01, SIP-02]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 2 Plan 08: CAS Import Flat Format Fix Summary

**CASFolioSchema and import route updated to handle real-world CAMS flat casparser output, enabling SIP transactions to land in the DB on first upload**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T05:22:19Z
- **Completed:** 2026-03-20T05:24:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- CASFolioSchema now accepts real-world CAMS flat output (scheme, amfi, transactions on folio directly) in addition to nested schemes[]
- Import route builds a normalised schemeList before the processing loop — handles both casparser output shapes without duplicating loop body
- SIP transactions from CAMS PDFs will now be inserted into the transactions table, enabling detectActiveSIPs() to find them and render the SIP section

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CASFolioSchema to accept flat casparser folio structure** - `6eacbed` (feat)
2. **Task 2: Fix import route to process flat folio transactions** - `cb759d6` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `lib/validators/cas-schema.ts` - schemes made optional (default []), flat folio fields added
- `app/api/cas/import/route.ts` - NormalisedScheme type + schemeList builder replacing direct folio.schemes loop

## Decisions Made
- CASFolioSchema accepts both formats via optional fields with defaults — avoids breaking nested-format callers while supporting flat CAMS output
- NormalisedScheme type declared inline in route — avoids new module-level export for a route-internal concern
- schemeList falls back to empty array when neither folio.schemes nor folio.scheme is present — safe no-op for degenerate folios

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SIP import fix complete — re-uploading a CAMS PDF will now produce transaction rows
- SIP section on holder analytics page will render after re-import
- Prerequisite for UAT SIP import test passing

---
*Phase: 02-portfolio-analytics*
*Completed: 2026-03-20*
