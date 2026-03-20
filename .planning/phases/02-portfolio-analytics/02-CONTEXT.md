# Phase 2: Portfolio Analytics - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add XIRR, absolute gain/loss, benchmark comparison, SIP tracking, and asset allocation view on top of the Phase 1 transaction ledger and holdings foundation. Users can see exactly how their portfolio is performing — overall and per holding.

Creating tax calculations, AI features, and alerts are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Benchmark & Period Comparison
- Benchmark comparison shown at **holder-level summary only** — overall holder XIRR vs Nifty 50 as metric cards (e.g., "Your XIRR: 14.2% vs Nifty 50: 12.8%")
- Per-fund benchmark comparison deferred — that level of detail belongs in Phase 4 AI Intelligence
- **Nifty 50 only** for v1 benchmark comparison (no fund category average, no user-selectable benchmarks)
- Display as **text metric cards**, not charts — consistent with the minimal card pattern already in the UI
- **Page-level period selector** — one toggle (1M, 3M, 6M, 1Y, 3Y, all-time) at the top of the holder analytics page; changing period updates all metrics (XIRR, gain/loss, benchmark) together

### SIP Tracking
- SIP tracking appears as a **section on the holder analytics page** (below holdings table), not a separate route
- Each SIP row shows: fund name, monthly amount, next debit date, SIP XIRR
- SIP detection is **inferred from transaction pattern**: a holding is classified as an active SIP if it has 3+ recurring transactions of similar amounts within ~30 days of each other in the last 90 days — no user tagging required
- If no active SIPs detected, **hide the section entirely** (don't show an empty state)

### Asset Allocation
- User defines target allocation via a **modal dialog** triggered by a "Set Target" button within the allocation section — equity / debt / gold / international % inputs
- Visualized as **horizontal bars per asset class** — each bar shows current %, with a target % marker and deviation highlighted in red/green; no chart library needed (pure CSS/Tailwind)
- Fund classification into asset classes: **auto-mapped from SEBI fund category** (e.g., "Equity Schemes" → equity, "Debt Schemes" → debt, "Gold ETF" → gold, "International FoF" → international); user can override individual holdings if auto-mapping is wrong
- Allocation section appears on the **holder analytics page**, below the SIP section — same single scrollable page

### Holder Analytics Page Structure
- One scrollable holder page:
  1. Period selector (page-level toggle)
  2. Summary metric cards (total AUM, total invested, gain/loss ₹ and %, XIRR, vs Nifty 50)
  3. Holdings table (extended from Phase 1 with gain/loss and XIRR columns)
  4. Active SIPs section (hidden if none)
  5. Asset Allocation section

### Claude's Discretion
- XIRR computation library choice (newton-raphson, financial.js, or custom implementation)
- How to handle missing NAV data gracefully in XIRR calculation (partial data, loading states)
- Nifty 50 data source for benchmark (NSE API, Yahoo Finance proxy, or static seed)
- Error/loading states for analytics computations
- Exact placement of period selector within the page header area
- Whether to show gain/loss per-holding row (design shows it only at summary card level — may omit from table)

</decisions>

<specifics>
## Specific Ideas

- No charts in Phase 2 — text metric cards only; keeps the implementation clean and avoids adding a chart library
- Horizontal allocation bars: pure CSS, consistent with Tailwind — no Recharts or similar for this phase
- SIP XIRR is shown separately from lumpsum XIRR to reflect the cost-averaging effect accurately
- Allocation target stored per holder in DB (not per family) — each holder can have different allocation targets

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — Card component with shadcn variants; use for metric summary cards
- `components/ui/table.tsx` — Table component; already used in HoldingsTable; extend with gain/loss + XIRR columns
- `components/ui/badge.tsx` — Badge; use for period selector tabs, SIP/lumpsum labels
- `components/ui/dialog.tsx` — Dialog; use for the "Set Target" allocation modal
- `components/holdings/holdings-table.tsx` — Current holdings table (Fund, Units, Avg Cost NAV, Current Value, NAV Date); extend with new columns
- `components/family/family-dashboard.tsx` — formatINR utility (en-IN, no decimals); reuse across all analytics
- `lib/supabase/types.ts` — HoldingRow type; will need extension for analytics fields

### Established Patterns
- Server Components for data fetching (family-dashboard.tsx pattern) — analytics pages should follow same pattern
- `font-mono` class for all financial numbers — keep consistent
- RPC calls for complex queries (`get_holder_holdings`) — XIRR and analytics will need new RPC functions or server-side computation
- `formatINR` utility already handles en-IN locale formatting — reuse everywhere

### Integration Points
- Extends `/families/[familyId]/holders/[holderId]/page.tsx` — Phase 1 holder page becomes the holder analytics page in Phase 2
- Reads from `transactions` table (full cashflow ledger from Phase 1) for XIRR computation
- Reads from `funds` table for SEBI category → asset class mapping
- Phase 3 Tax Engine will also read the same transaction ledger — keep query patterns clean
- N+1 pattern (per-holder RPC calls) noted in Phase 1 as acceptable; Phase 2 may consolidate into a single analytics RPC if performance is a concern

</code_context>

<deferred>
## Deferred Ideas

- Per-fund benchmark comparison (vs fund category average) — Phase 4 AI Intelligence
- Fund category average as a second benchmark option — v2 or Phase 4
- Donut/pie chart for allocation visualization — user preferred horizontal bars; add chart if needed later
- Portfolio overlap analysis (stock-level overlap across funds) — v2 (REQUIREMENTS.md ANLYV2-01)
- Automated cron for NAV sync replacing manual sync button — v2

</deferred>

<design_reference>
## UI Design Reference

**Source:** `.planning/frontend.html` (added 2026-03-20)
**Status:** LOCKED — all visual decisions below are non-negotiable

### Typography (LOCKED)
- **Headings (h1–h4):** `font-family: Manrope` — weights 400/500/600/700/800
- **Body / labels:** `font-family: Work Sans` — weights 300/400/500/600
- Add both fonts via Google Fonts in `app/layout.tsx` (or `globals.css`):
  ```
  https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Work+Sans:wght@300;400;500;600&display=swap
  ```
- Set `font-family: 'Work Sans', sans-serif` on `body`; `font-family: 'Manrope', sans-serif` on h1–h4 via `globals.css`

### Icons (LOCKED)
- **Icon library:** Material Symbols Outlined (Google Fonts web font) — NOT Lucide icons
- Add to `app/layout.tsx` head:
  ```
  https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap
  ```
- Usage: `<span className="material-symbols-outlined">icon_name</span>`
- Default variation settings: `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`
- Filled variant: `style="font-variation-settings: 'FILL' 1;"`
- Keep as a global CSS rule in `globals.css`: `.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }`

### Color System (LOCKED)
Full MD3 token set — add to `tailwind.config.ts` under `theme.extend.colors`:
```js
"surface-variant": "#c9e7f7",
"on-primary-container": "#7594ca",
"on-primary": "#ffffff",
"secondary-container": "#88f5b7",
"surface-container-low": "#e6f6ff",
"on-tertiary": "#ffffff",
"on-primary-fixed": "#001b3d",
"inverse-surface": "#163440",
"outline-variant": "#c4c6d0",
"outline": "#747780",
"background": "#f4faff",
"on-secondary-fixed": "#002111",
"on-surface": "#001f2a",
"on-error-container": "#93000a",
"surface-dim": "#c0dfee",
"surface-container": "#d9f2ff",
"inverse-primary": "#a9c7ff",
"tertiary-container": "#0e2f3b",
"surface": "#f4faff",
"error": "#ba1a1a",
"primary-container": "#002b5b",
"tertiary": "#001a23",
"on-secondary": "#ffffff",
"secondary": "#006d43",
"surface-tint": "#405f91",
"on-background": "#001f2a",
"tertiary-fixed": "#c8e7f7",
"surface-container-highest": "#c9e7f7",
"on-surface-variant": "#43474f",
"on-secondary-container": "#007146",
"surface-container-lowest": "#ffffff",
"primary-fixed-dim": "#a9c7ff",
"surface-container-high": "#ceedfd",
"inverse-on-surface": "#e0f4ff",
"surface-bright": "#f4faff",
"on-error": "#ffffff",
"primary-fixed": "#d6e3ff",
"tertiary-fixed-dim": "#accbda",
"secondary-fixed": "#8af8ba",
"secondary-fixed-dim": "#6edba0",
"on-tertiary-fixed-variant": "#2d4b57",
"on-primary-fixed-variant": "#264778",
"on-tertiary-fixed": "#001f29",
"on-tertiary-container": "#7997a5",
"error-container": "#ffdad6",
"primary": "#001736",
"on-secondary-fixed-variant": "#005231"
```
Also extend `borderRadius`: `{ "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem" }`
Also extend `fontFamily`: `{ "headline": ["Manrope"], "body": ["Work Sans"], "label": ["Work Sans"] }`

### Summary Cards — Bento Grid (LOCKED)
- Container: `grid grid-cols-1 md:grid-cols-4 gap-6`
- Each card: `bg-surface-container-lowest p-8 rounded-2xl shadow-sm hover:bg-surface-container transition-colors`
- First card (Total AUM): add `border-l-4 border-primary`
- Last card (XIRR): add `border-r-4 border-secondary-fixed`
- Label: `text-on-surface-variant text-sm font-medium mb-1`
- Value: `text-3xl font-extrabold tabular-nums text-primary tracking-tight` (use `font-headline` class for Manrope)
- Gain: `text-secondary font-bold text-sm` with `material-symbols-outlined text-sm mr-1` `trending_up` icon
- XIRR card: show a mini progress bar `h-1.5 w-full bg-surface-container-high rounded-full` with `bg-secondary` fill

### Holdings Table (LOCKED)
- Outer container: `bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm`
- Header row: `flex justify-between items-center p-8 bg-surface-container-low/50`
- Table header cells: `text-xs uppercase text-on-surface-variant/70 font-bold bg-surface-container-low/30 py-4 px-8`
- Alternating rows: even rows get `bg-surface-container-low/20`; hover: `hover:bg-surface-container-low transition-colors`
- Fund name: `font-bold text-primary`; category subtitle: `text-xs text-on-surface-variant`
- XIRR column: `text-secondary font-bold tabular-nums`
- Columns: **Asset Name** (fund name + category), **Units** (center), **Current NAV** (right), **Value ₹** (right, font-bold), **XIRR** (right, text-secondary)
- NO explicit per-row gain/loss column — gain/loss is shown at summary card level only

### Page Layout — Holder Analytics Page (LOCKED)
```
<main class="ml-64 min-h-screen">
  <header>         ← Sticky breadcrumb + action buttons + avatar
  <div class="px-12 pb-12">
    Hero section   ← Holder name (text-4xl font-extrabold text-primary) + description + "Last Synced"
    Bento cards    ← 4-column summary grid
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2">  ← Holdings table (2/3 width)
      <div class="space-y-8">      ← Right sidebar (1/3 width):
                                       - SIP tracker panel
                                       - (Phase 4: AI Portfolio Health card — placeholder for now)
    Asset Allocation section       ← Below the 2-col grid, full width
```
- Period selector: place in the sticky header row (right of breadcrumb, left of action buttons) OR as a filter row between hero and bento cards — Claude's discretion

### SIP Section — Right Sidebar Panel (LOCKED)
- Container: `bg-surface-container-lowest p-8 rounded-3xl shadow-sm`
- Header: `flex items-center justify-between mb-6` — "Active SIPs" title + count badge
- Count badge: `text-xs bg-surface-container-high px-3 py-1 rounded-full font-bold text-primary`
- Each SIP row: `flex justify-between items-center` with:
  - Left: calendar icon in `w-10 h-10 rounded-lg bg-surface-container-low` + amount (font-bold) + fund name (text-xs text-on-surface-variant)
  - Right: "Next Debit" label (text-[10px] uppercase) + date (text-xs font-bold text-primary)
  - Icon: `material-symbols-outlined` `calendar_month`
  - Hover: icon container gets `group-hover:bg-secondary-container`
- "View All SIPs" button at bottom: `w-full py-3 bg-surface border border-outline-variant/30 rounded-xl text-sm font-bold hover:bg-surface-container`
- SIP XIRR: NOT shown in the sidebar panel (design omits it); still computed internally for analytics
- Section hidden entirely if no SIPs detected (unchanged)

### Header Bar (LOCKED)
- Sticky: `flex justify-between items-center w-full px-12 py-6 bg-surface sticky top-0 z-30`
- Breadcrumb: "Family Dashboard > [Holder Name]" using `chevron_right` Material Symbol
- Action buttons: "Add Manual Holding" (outline style) + "Export Statement" (filled `bg-primary text-on-primary`)
- Right: notifications + settings icons + avatar image (rounded-full)

### Sidebar (LOCKED)
- `fixed left-0 top-0 h-screen w-64 bg-[#e6f6ff] z-40`
- Logo: `text-2xl font-black text-[#002B5B]` "FolioAI" + tagline
- Active nav item: `bg-white text-[#002B5B] rounded-r-full font-bold shadow-sm`
- Inactive nav item: `text-[#001f2a]/70 hover:text-[#002B5B] hover:bg-[#c9e7f7]/50 rounded-lg`
- Nav icons: Material Symbols — dashboard, group (filled for active), pie_chart, track_changes, receipt_long, auto_awesome
- Bottom CTA: "Ask AI Intelligence" button — `bg-primary text-on-primary rounded-xl font-bold shadow-lg`

### tabular-nums
- Add `.tabular-nums { font-variant-numeric: tabular-nums; }` to `globals.css`
- Apply `tabular-nums` class to all financial numbers

</design_reference>

---

*Phase: 02-portfolio-analytics*
*Context gathered: 2026-03-19*
*Design reference added: 2026-03-20 (frontend.html)*
