# FolioAI

## What This Is

FolioAI is an AI-powered personal portfolio management platform for Indian long-term investors. It tracks mutual funds and stocks across multiple family members (consolidated family view + individual views), providing performance analytics, tax intelligence, goal tracking, and AI-driven fund research and quarterly reviews. The platform is built for wealth compounding — not intraday trading.

## Core Value

Give a long-term Indian investor complete clarity over their family's wealth: what they own, how it's performing vs benchmarks, whether they're on track for their goals, and exactly what to do next — powered by AI.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Portfolio & Holdings**
- [ ] User can view consolidated family wealth dashboard (total AUM across all holders)
- [ ] User can view individual portfolio per family member (drill-down from family view)
- [ ] User can track mutual funds and stocks in a single unified view
- [ ] User can import holdings via CAMS/KFintech CAS (PDF/email statement upload)
- [ ] User can import holdings via broker API (Zerodha, Groww, MFCentral)
- [ ] User can manually add/edit holdings (fund name, units, purchase date, cost)
- [ ] User can add and manage multiple portfolio holders (family members)

**Performance Analytics**
- [ ] User can see portfolio XIRR (time-weighted returns) for each holding and overall
- [ ] User can see absolute returns (value vs invested amount) per holding and overall
- [ ] User can compare returns against benchmark (Nifty 50, category average)
- [ ] User can switch between XIRR, absolute, and benchmark views
- [ ] User can view SIP portfolio separately with cost-averaging and XIRR including SIP units
- [ ] User can see upcoming SIP debit dates

**Asset Allocation & Rebalancing**
- [ ] User can define target asset allocation (equity / debt / gold / international %)
- [ ] User can see current allocation vs target allocation with deviation
- [ ] User receives alert when allocation drifts beyond user-defined threshold

**Goal-Based Investing**
- [ ] User can create a financial goal (name, target amount, target date, linked funds)
- [ ] User can see projected corpus vs target for each goal
- [ ] User receives alert when a goal's projected corpus falls below target

**Tax Intelligence (India)**
- [ ] User can see LTCG/STCG breakdown per fund and stock (1-year rule for equity, 3-year for debt)
- [ ] LTCG harvesting: suggest exactly how many units to sell per fund to use the ₹1.25L annual exemption, then reinvest in the same fund — resets cost basis without exiting the position
- [ ] User can generate ITR-ready capital gains statement (Schedule CG format)
- [ ] User can see total LTCG exposure and estimated tax liability

**AI Features**
- [ ] AI scores each fund the user holds (expense ratio, alpha, manager track record, category rank)
- [ ] AI identifies underperforming funds and recommends specific replacement funds
- [ ] User can chat with their portfolio ("How exposed am I to the IT sector?", "What's my XIRR since Jan 2022?")
- [ ] AI generates quarterly portfolio review report (what's working, what to exit, what to add)
- [ ] AI generates annual portfolio review with full year analysis

**Alerts & Notifications**
- [ ] User receives alert when a fund underperforms its benchmark for 6+ consecutive months
- [ ] User receives tax harvesting window alert (configurable, default: Feb 1 trigger)

### Out of Scope

- Intraday trading / F&O tracking — this is a long-term wealth platform
- Mobile app (iOS/Android) — web-first; mobile is v2
- WhatsApp/Telegram chatbot — web app only for v1
- Portfolio overlap analysis — nice-to-have, deferred to v2
- Payment / transaction execution — FolioAI advises, user executes on their broker
- Real-time live prices — NAV/price updates are EOD (end of day), not tick-by-tick
- Multi-user login with roles — single user manages all family portfolios, no sub-logins

## Context

- **India-specific tax rules**: LTCG on equity mutual funds/stocks taxed at 10% above ₹1L/year (post-Budget 2024: ₹1.25L exemption); STCG at 15%. Debt funds (post-March 2023): all gains taxed at slab rate. Grandfathering applies for equity holdings pre-Jan 31, 2018.
- **Data sources**: CAMS and KFintech are the two Indian MF RTAs. CAS (Consolidated Account Statement) covers all MF folios across AMCs. Stocks come from broker statements (Zerodha contract notes, CDSL CAS).
- **MFCentral**: Joint CAMS+KFintech portal — good API target for MF data.
- **Long-term horizon**: Users hold for 3–20 years. Performance is measured in XIRR, not daily P&L.
- **Family office pattern**: Investor manages 3–6 family members' portfolios under different PANs. Needs both consolidated and per-person views.
- **AI stack**: Claude (Anthropic) for fund research, quarterly reviews, and portfolio chat. Rule-based engine for tax calculations (accuracy critical — LLM not used for tax math).

## Constraints

- **Tax accuracy**: Tax calculations (LTCG/STCG, harvesting suggestions) must be rule-based, not LLM-generated — errors here have real financial consequences
- **Data privacy**: Portfolio data is sensitive financial information — must be stored securely, never sent to LLMs in bulk without anonymization
- **India regulations**: No execution of trades — platform is advisory only (SEBI RIA regulations)
- **Web only (v1)**: No mobile app, no native notifications — web app with email alerts

## Design System

**Reference:** `.planning/frontend.html` (locked 2026-03-20)

All UI across every phase must follow this design system — no exceptions:

| Token | Value |
|-------|-------|
| **Typography** | Manrope (headings h1–h4) + Work Sans (body/labels) via Google Fonts |
| **Icons** | Material Symbols Outlined (Google Fonts web font) — NOT Lucide |
| **Colors** | MD3 semantic token set (`primary: #001736`, `secondary: #006d43`, `surface: #f4faff`) — full token list in `.planning/phases/02-portfolio-analytics/02-CONTEXT.md` `<design_reference>` |
| **Numbers** | `tabular-nums` class on all financial figures |
| **Cards** | `bg-surface-container-lowest rounded-2xl/3xl shadow-sm` |
| **Layout** | Fixed sidebar (w-64) + main `ml-64`; sticky header `px-12 py-6` |
| **Page pattern** | Hero section → bento metric grid → 2/3 content + 1/3 sidebar → full-width sections |

When building UI for any phase: read `.planning/frontend.html` for the reference implementation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|----------|
| MD3 design system across all phases | Consistent visual language; reference in frontend.html | Locked 2026-03-20 |
| Rule-based tax engine (not LLM) | Tax errors have real financial consequences; LLMs hallucinate numbers | — Pending |
| EOD prices, not real-time | Long-term investing doesn't need tick data; reduces infra cost significantly | — Pending |
| Advisory only, no trade execution | SEBI RIA compliance; keeps scope manageable for v1 | — Pending |
| All 4 AI features in v1 | Core differentiator; without AI this is just another tracker | — Pending |
| CAMS + broker API + manual entry | Different users are at different stages; all 3 paths needed for adoption | — Pending |

---
*Last updated: 2026-03-20 — design system locked from frontend.html*
