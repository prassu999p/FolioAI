# FolioAI — Project Guidelines

## Tech Stack
- **Framework:** Next.js 15 App Router (TypeScript)
- **Styling:** Tailwind CSS with MD3 custom token config in `tailwind.config.ts`
- **UI components:** shadcn/ui (Radix primitives) — but do NOT let shadcn's default CSS aliases override MD3 tokens in `globals.css`
- **Icons:** Material Symbols Outlined — `<span class="material-symbols-outlined">icon_name</span>`. Never use Lucide or other icon libraries.
- **Fonts:** Manrope (headings) + Work Sans (body/labels) via Google Fonts
- **Database:** Supabase (Postgres + RLS)
- **Testing:** Vitest

## UI Design System

**Every UI component must follow the designs in `.planning/UI-design/`.**

### Design Tokens

```
primary:               #001736  (navy)
secondary:             #006d43  (green)
surface:               #f4faff
surface-container-low: #e6f6ff  (sidebar bg)
surface-container:     #d9f2ff
surface-container-high:#ceedfd
surface-container-highest: #c9e7f7
surface-container-lowest:  #ffffff
secondary-fixed:       #8af8ba  (bright green accent)
on-primary:            #ffffff
on-surface:            #001f2a
on-surface-variant:    #43474f
```

### Typography Rules
- `h1`–`h4` and `.font-headline` → Manrope
- Body, labels → Work Sans
- Financial numbers → always add `tabular-nums` class (`font-variant-numeric: tabular-nums`)

### Border Radius
- DEFAULT: `2px`, `lg`: `4px`, `xl`: `8px`, `full`: `12px`
- Bento metric cards: `rounded-2xl`
- Table containers and SIP/AI cards: `rounded-3xl`
- Allocation/goal rows: `rounded-xl`

### Page Layout Pattern
```
Sidebar (w-64, fixed left, bg-[#e6f6ff])
  └── Logo "FolioAI" + tagline
  └── Nav items (active: bg-white rounded-r-full font-bold shadow-sm)
  └── "Ask AI Intelligence" CTA button (bg-primary)
  └── Support + Settings links

Main (ml-64)
  └── Sticky TopAppBar (bg-[#f4faff], z-30)
  └── Content (px-8 to px-12)
       └── Hero/title section
       └── 4-col bento metric grid
       └── 2/3 main + 1/3 sidebar layout
       └── Full-width sections below
```

### Nav Items (in order, with icons)
1. Family Dashboard — `dashboard`
2. Individual Holders — `group`
3. Asset Allocation — `pie_chart`
4. Goals — `track_changes`
5. Tax Intelligence — `receipt_long`
6. AI Insights — `auto_awesome`

### Card Patterns
- **Bento metric card:** `bg-surface-container-lowest p-8 rounded-2xl shadow-sm`
- **XIRR card (highlighted):** add `border-r-4 border-secondary-fixed` or use `bg-primary text-on-primary`
- **AI/dark card:** `bg-primary text-on-primary rounded-3xl` (for AI Portfolio Health, harvesting hero)
- **Glassmorphism AI insight:** `background: rgba(255,255,255,0.4); backdrop-filter: blur(20px); border: 1px solid rgba(0,109,67,0.1)`

## Page-to-Design-File Reference

| Page | Design File |
|------|-------------|
| Family Dashboard | `.planning/UI-design/Family_view.html` |
| Individual Holder | `.planning/UI-design/Individual_holder_view.html` |
| Asset Allocation + Goals | `.planning/UI-design/goals_and_allocation.html` |
| Tax Intelligence + AI Insights | `.planning/UI-design/tax_and_ai.html` |

**Before building any new page or component, read the relevant design file.**

## Coding Conventions
- Server Components by default; add `'use client'` only when needed (interactivity, hooks)
- Financial formatting: use `₹` prefix, comma-separated Indian number system, `tabular-nums`
- Supabase calls in Server Components or Route Handlers — never expose service key to client
- RLS must be active; always test with user-scoped queries
- Zod for all external data validation (CAS imports, API boundaries)
- Each Vitest test file mirrors its source file path under `tests/`

## What NOT to do
- Do not use Lucide icons — only Material Symbols Outlined
- Do not let shadcn CSS variable overrides (`--background`, `--foreground`, etc.) clobber MD3 tokens in `globals.css`
- Do not hardcode `xirr: null` or placeholder values — compute or return `null` explicitly
- Do not add `'use client'` to analytics/data components that can stay as Server Components
