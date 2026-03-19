---
phase: 01-data-foundation
plan: "03"
subsystem: auth
tags: [supabase, next.js, app-router, ssr, middleware, shadcn, route-groups]

# Dependency graph
requires:
  - phase: 01-data-foundation/01-01
    provides: Next.js 15.5.13 scaffold with shadcn/ui components and Supabase SSR packages
  - phase: 01-data-foundation/01-02
    provides: Database types (families, holders, folios, transactions, funds, nav_prices)
provides:
  - Supabase SSR auth middleware refreshing tokens on every request via getClaims()
  - Login page at /login with email/password using shadcn/ui Card, Input, Label, Button
  - Signup page at /signup with password confirmation validation
  - Email confirmation callback at /api/auth/callback
  - Auth-guarded dashboard layout at app/(dashboard)/layout.tsx
  - /dashboard route redirecting to user's family or showing create prompt
  - /families/[familyId] placeholder route (Plan 06 fills content)
  - /families/[familyId]/holders/[holderId] placeholder route (Plan 05 fills content)
affects:
  - 01-05-PLAN (holdings page fills placeholder at /families/[familyId]/holders/[holderId])
  - 01-06-PLAN (family/holder management fills /dashboard and /families/[familyId])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getClaims() instead of getSession() for all server-side auth validation (JWT revalidated against Supabase)
    - Route groups: (auth) for unauthenticated pages, (dashboard) for protected pages
    - Auth guard in layout.tsx (server component) catches unauthenticated access before any child renders
    - Client-side auth forms with 'use client' directive + createBrowserClient via createClient()
    - Next.js 15 params as Promise — always await params before destructuring in page components

key-files:
  created:
    - middleware.ts
    - lib/supabase/middleware.ts
    - app/(auth)/layout.tsx
    - app/(auth)/login/page.tsx
    - app/(auth)/signup/page.tsx
    - app/api/auth/callback/route.ts
    - app/(dashboard)/layout.tsx
    - app/(dashboard)/dashboard/page.tsx
    - app/(dashboard)/families/[familyId]/page.tsx
    - app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx
  modified:
    - lib/supabase/types.ts
    - app/login/page.tsx (deleted — replaced by route group)

key-decisions:
  - "getClaims() used everywhere — getSession() does not revalidate JWT against Supabase auth server"
  - "Route group (dashboard) dashboard/ subfolder needed for /dashboard URL — (dashboard)/page.tsx maps to / not /dashboard"
  - "Database GenericTable requires Relationships field — added to types.ts to fix TypeScript never type inference"
  - "familyData cast to Family | null — Supabase select narrow type inference fails when Relationships not present"

patterns-established:
  - "Auth guard: layout.tsx uses getClaims() and redirect('/login') — all children automatically protected"
  - "Client auth pages: 'use client' + createBrowserClient for email/password flows"
  - "Server auth pages: createClient() + getClaims() for data fetching with user identity"

requirements-completed: [FAM-01, FAM-02, FAM-03]

# Metrics
duration: 7min
completed: 2026-03-19
---

# Phase 1 Plan 03: Auth and Route Structure Summary

**Supabase SSR auth with getClaims() middleware, email/password login/signup pages (shadcn/ui), and full Next.js App Router protected route structure for family dashboard and holder holdings**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-19T04:52:37Z
- **Completed:** 2026-03-19T04:59:47Z
- **Tasks:** 3
- **Files modified:** 11 (10 created, 1 modified, 1 deleted)

## Accomplishments
- Auth middleware refreshes Supabase JWT on every request using getClaims() (not getSession()) — server-side token validation
- Login (/login) and signup (/signup) pages with shadcn/ui components, error handling, client-side password confirmation
- Auth callback route handles email confirmation code exchange at /api/auth/callback
- Protected dashboard layout enforces auth — unauthenticated users redirected to /login before any child renders
- Full route structure: /dashboard, /families/[familyId], /families/[familyId]/holders/[holderId] — all placeholder, ready for Plans 05 and 06
- `npm run build` passes cleanly with all 7 routes + middleware (81.5 kB)

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth middleware and Supabase SSR setup** - `918b44d` (feat)
2. **Task 2: Login, signup pages and auth callback** - `fe0f57d` (feat)
3. **Task 3: Protected dashboard route structure and placeholder pages** - `29e78e7` (feat)

## Files Created/Modified
- `middleware.ts` — Root middleware calling updateSession, with static asset exclusion matcher
- `lib/supabase/middleware.ts` — updateSession helper: refreshes JWT, redirects unauth/auth users
- `app/(auth)/layout.tsx` — Centered layout (min-h-screen flex) for auth pages
- `app/(auth)/login/page.tsx` — Email/password login form with error display, link to signup
- `app/(auth)/signup/page.tsx` — Signup form with password confirmation + "Check email" success state
- `app/api/auth/callback/route.ts` — GET handler exchanging email confirmation code for session
- `app/(dashboard)/layout.tsx` — Auth guard: getClaims() → redirect('/login') if no session; nav bar with email
- `app/(dashboard)/dashboard/page.tsx` — Queries families table, redirects to /families/[id] or shows create prompt
- `app/(dashboard)/families/[familyId]/page.tsx` — Placeholder; Plan 06 implements full family dashboard
- `app/(dashboard)/families/[familyId]/holders/[holderId]/page.tsx` — Placeholder; Plan 05 implements holdings list
- `lib/supabase/types.ts` — Added Relationships: [], Views, Functions fields to satisfy postgrest-js GenericSchema constraint
- `app/login/page.tsx` — Deleted (replaced by app/(auth)/login/page.tsx via route group)

## Decisions Made
- **getClaims() everywhere**: getSession() is documented to not revalidate JWT against Supabase — getClaims() performs actual server-side validation. Plan specified this explicitly.
- **Route group subfolder for /dashboard**: Next.js route groups (parentheses) don't add URL segments. `app/(dashboard)/page.tsx` maps to `/`, not `/dashboard`. Created `app/(dashboard)/dashboard/page.tsx` so `/dashboard` URL works correctly.
- **Relationships field in types.ts**: The `@supabase/postgrest-js` GenericTable type requires a `Relationships` field. Without it, TypeScript infers query result types as `never`. Added `Relationships: []` to all table entries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Route group page mapped to wrong URL**
- **Found during:** Task 3 (build verification)
- **Issue:** `app/(dashboard)/page.tsx` resolves to `/` (route groups don't add URL path segments), conflicting with `app/page.tsx` and not creating the `/dashboard` URL that middleware redirects to
- **Fix:** Created `app/(dashboard)/dashboard/` subdirectory, moved page.tsx there — now `/dashboard` URL exists and is protected by the (dashboard) layout auth guard
- **Files modified:** app/(dashboard)/dashboard/page.tsx (moved from app/(dashboard)/page.tsx)
- **Verification:** `npm run build` shows `/dashboard` as a dynamic route
- **Committed in:** 29e78e7 (Task 3 commit)

**2. [Rule 1 - Bug] Database types missing Relationships field causing never type inference**
- **Found during:** Task 3 (TypeScript compile check)
- **Issue:** `@supabase/postgrest-js` GenericTable requires `Relationships: []` field. Without it, `.select()` query results typed as `never`, making `family.id` inaccessible
- **Fix:** Added `Relationships: []`, `Views: Record<string, never>`, `Functions: Record<string, never>` to Database type in lib/supabase/types.ts; used explicit `as Family | null` cast for dashboard query
- **Files modified:** lib/supabase/types.ts, app/(dashboard)/dashboard/page.tsx
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 29e78e7 (Task 3 commit)

**3. [Rule 1 - Bug] getClaims() return type differs from plan's destructuring pattern**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** Plan shows `const { data: { claims } } = await supabase.auth.getClaims()` but actual return type is `{ data: { claims, header, signature } | null, error: AuthError | null }`. Direct destructuring of `claims` from data fails when data is null.
- **Fix:** Used `const result = await supabase.auth.getClaims(); const claims = result.data?.claims ?? null` pattern throughout
- **Files modified:** lib/supabase/middleware.ts, app/(dashboard)/layout.tsx, app/(dashboard)/dashboard/page.tsx
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 918b44d, 29e78e7 (Task 1 and 3 commits)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 type fix)
**Impact on plan:** All fixes necessary for correct operation. Route group URL behavior is a Next.js convention that the plan didn't account for. Type fixes are required for TypeScript compilation. No scope creep.

## Issues Encountered
- Supabase types.ts created in Plan 02 without the `Relationships`, `Views`, and `Functions` fields required by postgrest-js GenericSchema — this caused TypeScript to infer query results as `never` type. Fixed inline during Task 3 verification.

## User Setup Required
None — no external service configuration added by this plan. Supabase environment variables remain documented in `.env.local.example`.

## Next Phase Readiness
- Plan 04 (CAS pipeline): auth infrastructure doesn't affect Python pipeline — can proceed independently
- Plan 05 (holdings): `/families/[familyId]/holders/[holderId]` placeholder route exists at correct URL
- Plan 06 (manual entry + family management): `/dashboard` and `/families/[familyId]` placeholder routes exist

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*
