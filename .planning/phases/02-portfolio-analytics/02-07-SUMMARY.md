---
phase: 02-portfolio-analytics
plan: "07"
subsystem: frontend-design-system
tags: [md3, tailwind, design-tokens, layout, typography]
dependency_graph:
  requires: [globals.css, dashboard layout, family-dashboard component]
  provides: [correct MD3 color rendering, fixed sidebar layout, MD3-token components]
  affects: [all dashboard pages, family dashboard, holder cards]
tech_stack:
  added: []
  patterns:
    - MD3 color tokens as sole source of truth in @theme inline (no shadcn var() aliases)
    - Fixed w-64 sidebar + ml-64 main layout pattern
    - bg-surface-container-lowest / bg-surface-container for bento card hover states
    - tabular-nums font-body replacing font-mono for financial numbers
key_files:
  created: []
  modified:
    - app/globals.css
    - app/(dashboard)/layout.tsx
    - components/family/family-dashboard.tsx
decisions:
  - "Shadcn var() aliases removed from @theme inline — Tailwind v4 @theme inline reads --color-* as hex directly; :root still has shadcn vars for shadcn components"
  - "font-sans set to Work Sans directly in @theme inline — removes Geist font dependency"
  - "Dashboard layout removes top navbar entirely — sidebar-only navigation matching frontend.html"
  - "tabular-nums font-body class combo replaces font-mono for financial figures"
metrics:
  duration: "3min"
  completed_date: "2026-03-20"
  tasks_completed: 3
  files_modified: 3
---

# Phase 02 Plan 07: MD3 Design System Fix Summary

MD3 color tokens now render correctly as deep navy hex values — shadcn oklch aliases removed from @theme inline, Work Sans font wired, fixed sidebar layout applied, family dashboard converted to MD3 token classes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix globals.css — remove shadcn aliases from @theme inline, fix font-sans | de33673 | app/globals.css |
| 2 | Rewrite dashboard layout.tsx with fixed sidebar + ml-64 main | ed1a8cc | app/(dashboard)/layout.tsx |
| 3 | Update family-dashboard.tsx to use MD3 token classes | 0682e47 | components/family/family-dashboard.tsx |

## What Was Built

### Task 1: globals.css — @theme inline cleanup
- Removed 34-line shadcn alias block (`--color-primary: var(--primary)` etc.) from @theme inline
- These aliases overwrote the correct MD3 hex values defined earlier in the same block
- Changed `--font-sans` from `var(--font-geist-sans)` to `"Work Sans", sans-serif`
- Result: `--color-primary` in Tailwind resolves to `#001736` (deep navy), not oklch near-black
- `:root` and `.dark` blocks left untouched — shadcn components still work via CSS var cascade

### Task 2: Dashboard layout — fixed sidebar
- Replaced top `<nav>` bar with fixed `<aside class="flex flex-col fixed left-0 top-0 h-screen z-40 bg-surface-container-low w-64">`
- Logo section: FolioAI + "The Digital Fiduciary" tagline with MD3 token classes
- Nav links: Family Dashboard, AI Insights, Tax Intelligence, Goals with Material Symbols Outlined icons
- Bottom: SyncButton + Settings/Support links
- Main: `ml-64 min-h-screen bg-surface` — no max-w wrapper (pages control their own padding)
- Auth check (getClaims / redirect) preserved

### Task 3: family-dashboard.tsx — MD3 token classes
- All shadcn color aliases replaced with MD3 equivalents
- `bg-card` → `bg-surface-container-lowest`
- `text-muted-foreground` → `text-on-surface-variant`
- `bg-accent` → `bg-surface-container`
- `text-green-600` → `text-secondary` (MD3 green token `#006d43`)
- `text-red-600` → `text-error` (MD3 error token `#ba1a1a`)
- `font-mono` → `tabular-nums font-body`
- H1 family name: `text-2xl font-extrabold font-headline text-primary`
- H2 holders: `text-lg font-bold font-headline text-primary`
- Family total card: `rounded-2xl shadow-sm bg-surface-container-lowest border-l-4 border-primary`
- Holder bento cards: `rounded-2xl shadow-sm bg-surface-container-lowest hover:bg-surface-container`

## Verification Results

| Check | Expected | Result |
|-------|----------|--------|
| No shadcn var() aliases in @theme inline | 0 matches | 0 |
| `--color-primary: #001736` present | 1 match | 1 |
| `font-sans: "Work Sans"` | 1 match | 1 |
| `fixed left-0...w-64` in layout | 1 match | 1 |
| `ml-64` in layout | 1 match | 1 |
| No `bg-card`/`text-muted-foreground` in dashboard | 0 matches | 0 |
| `npx tsc --noEmit` | No errors | Clean |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All files verified present. All commits verified in git log.

| Item | Status |
|------|--------|
| app/globals.css | FOUND |
| app/(dashboard)/layout.tsx | FOUND |
| components/family/family-dashboard.tsx | FOUND |
| .planning/phases/02-portfolio-analytics/02-07-SUMMARY.md | FOUND |
| Commit de33673 (globals.css fix) | FOUND |
| Commit ed1a8cc (layout rewrite) | FOUND |
| Commit 0682e47 (family-dashboard MD3) | FOUND |
