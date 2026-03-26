# Requirements: FolioAI

**Defined:** 2026-03-18
**Core Value:** Give a long-term Indian investor complete clarity over their family's wealth: what they own, how it's performing vs benchmarks, whether they're on track for goals, and exactly what to do next — powered by AI.

---

## Cross-Cutting Constraints

### UI Design System (applies to ALL phases)

All user-facing UI must follow the design system and page designs in `.planning/UI-design/`:

**Design tokens (consistent across all 4 files):**
- **Typography:** Manrope (headings `h1–h4`, `.font-headline`) + Work Sans (body, labels) — Google Fonts
- **Icons:** Material Symbols Outlined — NOT Lucide or any other icon library
- **Colors:** MD3 token set — primary navy `#001736`, secondary green `#006d43`, surface `#f4faff`, sidebar bg `#e6f6ff` — configured in `tailwind.config.ts`
- **Border radius:** DEFAULT `2px`, `lg` `4px`, `xl` `8px`, `full` `12px`
- **Numbers:** `tabular-nums` CSS class on all financial values
- **Cards:** `bg-surface-container-lowest rounded-2xl shadow-sm` (bento metrics), `rounded-3xl` (table containers), `rounded-xl` (allocation rows, goal cards)

**Navigation sidebar (w-64, bg-[#e6f6ff], all pages):**
Six nav items in order: Family Dashboard, Individual Holders, Asset Allocation, Goals, Tax Intelligence, AI Insights. Active item: `bg-white rounded-r-full font-bold shadow-sm`. Bottom: "Ask AI Intelligence" CTA button + Support + Settings links.

**Page-specific design references:**
| Design File | Pages |
|---|---|
| `Family_view.html` | Family Dashboard — AI morning insight banner, 4-col AUM/Invested/Gain/XIRR bento, donut allocation + holders table, top performers + activity feed, FAB for CAS import |
| `Individual_holder_view.html` | Individual Holder page — 4-col bento, holdings table (2/3) + AI Portfolio Health card + Active SIPs (1/3), portfolio insights CTA |
| `goals_and_allocation.html` | Asset Allocation + Goals — Current vs Target bars with drift badges, 3-col goals grid (on-track/off-track badges, progress bars), fund-goal visual linkage, AI rebalance sidebar |
| `tax_and_ai.html` | Tax Intelligence + AI Insights — Capital gains FY summary (8/12) + Compliance Vault (4/12), LTCG harvesting hero (full-width dark), AI portfolio narrative, floating chat widget (fixed bottom-right 450px) |

Planners and executors for all phases must read the relevant design file before building any UI components.

---

## v1 Requirements

### Multi-Holder / Family

- [x] **FAM-01**: User can create a family and add multiple holders (family members) with names and PAN
- [x] **FAM-02**: User can view a consolidated family dashboard showing total AUM, asset allocation, and XIRR across all holders
- [x] **FAM-03**: User can drill down from family view to individual holder's portfolio

### Data Import & Holdings

- [x] **DATA-01**: User can import mutual fund holdings by uploading a CAMS Consolidated Account Statement (CAS) PDF
- [x] **DATA-02**: User can import mutual fund holdings by uploading a KFintech CAS PDF
- [x] **DATA-03**: User can connect a Zerodha account via Kite Connect API to import stock holdings and transactions
- [x] **DATA-04**: User can manually add a holding (fund/stock name, units, purchase date, cost price)
- [x] **DATA-05**: User can view all holdings for a holder in a single unified list (mutual funds + stocks)
- [x] **DATA-06**: System syncs end-of-day NAV from AMFI daily (automated, no user action)

### Performance Analytics

- [x] **PERF-01**: User can see total portfolio value, total invested amount, and absolute gain/loss (₹ and %) per holder and family total
- [x] **PERF-02**: User can see XIRR (time-weighted return) for the overall portfolio, per holding, and per holder — calculated from full transaction cashflow series
- [x] **PERF-03**: User can compare portfolio returns against Nifty 50 and fund category average benchmark
- [x] **PERF-04**: User can switch between XIRR, absolute return, and benchmark comparison views
- [x] **PERF-05**: User can see portfolio performance over selectable time periods (1M, 3M, 6M, 1Y, 3Y, all-time)
- [x] **PERF-06**: All analytics are segmented by Indian financial year (April–March), not calendar year

### SIP Tracking

- [x] **SIP-01**: User can view all active SIPs with monthly debit amount, fund name, and next scheduled date
- [x] **SIP-02**: User can see SIP portfolio XIRR (cost-averaging adjusted) separately from lumpsum holdings

### Asset Allocation & Rebalancing

- [x] **ALLOC-01**: User can define a target asset allocation (equity / debt / gold / international %) per holder or family
- [x] **ALLOC-02**: User can see current allocation vs target allocation with deviation highlighted
- [ ] **ALLOC-03**: User receives an alert when any asset class drifts beyond a user-defined threshold from target

### Goal-Based Investing

- [x] **GOAL-01**: User can create a financial goal with a name, target amount (₹), and target date
- [x] **GOAL-02**: User can link specific holdings to a goal so the platform tracks progress toward it
- [x] **GOAL-03**: User can see projected corpus vs target amount for each goal, with on-track / off-track status

### Tax Intelligence

- [x] **TAX-01**: User can see LTCG and STCG breakdown per holding and total — calculated correctly per Indian tax rules (equity: 1-year rule, 12.5% above ₹1.25L; debt: slab rate for post-Apr-2023 purchases)
- [x] **TAX-02**: User can see grandfathering applied correctly for equity holdings purchased before Feb 1, 2018 (cost basis = MAX(actual cost, MIN(Jan 31 2018 NAV, sale price)))
- [x] **TAX-03**: User can see a real-time sell tax estimator: "If you sell X units of Fund Y today, your estimated tax is ₹Z" (rule-based, not LLM)
- [x] **TAX-04**: User receives LTCG harvesting suggestions — for each eligible holding, the platform calculates exactly how many units to sell to use the remaining ₹1.25L annual LTCG exemption, then reinvest the proceeds back into the same fund; this resets the cost basis without exiting the position, eliminating future tax on those gains. Suggestions show: fund name, units to sell, LTCG to book, remaining exemption used, and estimated tax saved vs not harvesting.
- [ ] **TAX-05**: User can generate and download an ITR-ready capital gains statement (LTCG/STCG per fund/stock for the FY) in Schedule CG format

### AI Intelligence

- [x] **AI-01**: AI scores each fund the user holds on key quality signals: expense ratio vs category, alpha vs benchmark, AUM trend, fund manager track record — displayed as a structured scorecard
- [x] **AI-02**: AI identifies underperforming funds in the user's portfolio and recommends specific alternative funds to switch to, with reasoning
- [x] **AI-03**: User can chat with their portfolio using natural language ("How exposed am I to IT sector?", "What's my XIRR since January 2022?", "Which of my funds has the highest expense ratio?")
- [x] **AI-04**: AI generates a quarterly portfolio review report: what's performing well, what to review for exit, suggested additions, overall health assessment — presented as a written narrative

### Alerts

- [x] **ALRT-01**: User receives an alert (email) when any held fund underperforms its benchmark category average for 6+ consecutive months
- [x] **ALRT-02**: User receives a tax harvesting window alert in February with a summary of loss-booking opportunities before March 31

---

## v2 Requirements

### Advanced Tax

- **TAXV2-01**: ELSS per-installment lock-in tracker: show which ELSS units are locked, unlock dates, and total 80C invested via ELSS this FY
- **TAXV2-02**: Bonus stripping and wash sale rule flagging in tax harvesting suggestions
- **TAXV2-03**: SWP (Systematic Withdrawal Plan) tracking with per-redemption LTCG/STCG events

### Extended Holdings

- **EXTV2-01**: NPS (National Pension System) Tier I/II manual entry and total wealth inclusion
- **EXTV2-02**: EPF balance manual entry and total wealth inclusion
- **EXTV2-03**: STP (Systematic Transfer Plan) tracking as linked transactions

### Analytics

- **ANLYV2-01**: Portfolio overlap analysis: stock-level overlap across held funds, concentration risk score
- **ANLYV2-02**: MFCentral API integration for automated MF import (replacing PDF upload)
- **ANLYV2-03**: AI annual portfolio review (year-end full analysis)

### Platform

- **PLTV2-01**: Mobile app (iOS/Android) with push notifications
- **PLTV2-02**: Additional broker API integrations (Groww, Angel One, CDSL demat)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Intraday trading / F&O tracking | Wrong user persona — FolioAI is for long-term wealth, not active trading |
| Trade execution (buy/sell) | SEBI RIA regulations prohibit advisory + execution without RIA + broker license |
| Real-time / live stock prices | EOD is sufficient for long-term investors; real-time feeds cost significantly more |
| AI-generated tax numbers | LLMs hallucinate numbers; all tax calculations must be rule-based deterministic code |
| Social / peer comparison | Privacy risk with financial data; misaligns with long-term wealth mindset |
| Cryptocurrency tracking | Different data sources, different tax rules (30% flat, no loss offset), wrong persona |
| Multi-currency / US stocks | FEMA compliance, US tax treaty — major complexity for v1 |
| WhatsApp / Telegram chatbot | Vendor dependency, data sharing concerns; email alerts sufficient for v1 |
| Robo-advisory / auto-rebalancing | Requires SEBI RIA license; PMLA compliance; automated execution out of scope |
| ELSS lock-in tracking | Deferred to v2 — treat ELSS as regular fund for v1 |
| NPS / EPF tracking | Deferred to v2 — out of MF+stock scope for v1 |
| STP / SWP tracking | Deferred to v2 — handled as regular buy/sell transactions |

---

## Traceability

*Populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| FAM-01 | Phase 1 | Complete |
| FAM-02 | Phase 1 | Complete |
| FAM-03 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 5 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| PERF-01 | Phase 2 | Complete |
| PERF-02 | Phase 2 | Complete |
| PERF-03 | Phase 2 | Complete |
| PERF-04 | Phase 2 | Complete |
| PERF-05 | Phase 2 | Complete |
| PERF-06 | Phase 2 | Complete |
| SIP-01 | Phase 2 | Complete |
| SIP-02 | Phase 2 | Complete |
| ALLOC-01 | Phase 2 | Complete |
| ALLOC-02 | Phase 2 | Complete |
| ALLOC-03 | Phase 5 | Pending |
| GOAL-01 | Phase 5 | Complete |
| GOAL-02 | Phase 5 | Complete |
| GOAL-03 | Phase 5 | Complete |
| TAX-01 | Phase 3 | Complete |
| TAX-02 | Phase 3 | Complete |
| TAX-03 | Phase 3 | Complete |
| TAX-04 | Phase 3 | Complete |
| TAX-05 | Phase 3 | Pending |
| AI-01 | Phase 4 | Complete |
| AI-02 | Phase 4 | Complete |
| AI-03 | Phase 4 | Complete |
| AI-04 | Phase 4 | Complete |
| ALRT-01 | Phase 5 | Complete |
| ALRT-02 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-19 after roadmap creation — all 34 requirements mapped*
