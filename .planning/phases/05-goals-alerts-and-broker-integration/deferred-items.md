# Deferred Items — Phase 05

## Pre-existing TypeScript Errors (Out of Scope for 05-03)

Found during 05-03 execution. These errors are in files created by plan 05-04 (commit 1200e42), not in 05-03's scope.

### Error 1
- **File:** `app/api/broker/zerodha/callback/route.ts:36`
- **Error:** `TS2339: Property 'family_id' does not exist on type 'never'`
- **Cause:** `supabase.from('holders').select('family_id').single()` returns `never` for the data field because `family_id` is not in the TypeScript Database type for the `holders` table's select result (likely needs `(supabase as any)` cast or types regeneration)
- **Fix:** Either add `(supabase as any)` cast around the query, or regenerate Supabase types from the remote DB

### Error 2
- **File:** `app/api/broker/zerodha/refresh/route.ts:32`
- **Error:** `TS2339: Property 'family_id' does not exist on type 'never'`
- **Cause:** Same issue as above — holder query for `family_id` column returns `never`

**Owner:** Plan 05-04 (Zerodha broker integration)
**Discovered:** 2026-03-25 during 05-03 execution
