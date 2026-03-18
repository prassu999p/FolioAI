# Feature Research

**Domain:** Indian personal portfolio management and wealth tracking (mutual funds + stocks, long-term investors)
**Researched:** 2026-03-18
**Confidence:** MEDIUM — based on training knowledge of established Indian wealthtech platforms (Kuvera, INDMoney, Groww, Zerodha Coin, Scripbox, Fisdom, mProfit, StockEdge, Value Research). WebSearch/WebFetch unavailable during this session. Core feature knowledge for these platforms is stable and well-established; AI feature landscape flagged LOW confidence where features are rapidly evolving.

---

## Competitor Overview

| Platform | Category | Core Strength | User Profile |
|----------|----------|---------------|--------------|
| Kuvera | MF platform + tracker | Free direct MF investing, CAS import, XIRR, tax reports | DIY investors who care about expense ratios |
| INDMoney | Wealth super-app | All-in-one: MF + stocks + US stocks + EPF + NPS in one place, family view | Aspirational upper-middle-class, tech-savvy |
| Groww | MF + stock broker | Massive brand, clean UI, SIP-first, beginner-friendly | New-to-investing millennials |
| Zerodha Coin | MF-only add-on to Kite | Direct plan MFs at demat level, no-commission | Zerodha traders who also want MFs |
| Scripbox | Managed portfolios | Algorithm-curated fund baskets, goal-based, "let us decide" | Investors who want less decision-making |
| Fisdom | B2B2C wealth | Bank-embedded investing | Bank customers |
| mProfit | Portfolio tracker (desktop/web) | Broker-agnostic import, FIFO/LIFO P&L, CA-grade reports | HNIs, serious DIY traders who need tax accuracy |
| StockEdge | Research + tracking | Fundamental + technical research, watchlists | Active stock researchers |
| Value Research Online | Fund research | Oldest, most trusted MF rating database in India | Fund researchers, advisors |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CAS import (CAMS + KFintech) | Every serious tracker offers this; users won't manually enter 20 funds | MEDIUM | PDF and email CAS both needed; parsing CAMS PDF is non-trivial; MFCentral API is the cleaner route |
| Total portfolio value (AUM) | First thing user checks; basis for everything else | LOW | Requires EOD NAV updates for MFs, closing price for stocks |
| Current value vs invested amount | "How much did I put in, how much is it worth now?" is question #1 | LOW | Absolute return in ₹ and % |
| XIRR calculation | All platforms show XIRR; users know to ask for it; absolute % misleads with SIPs | MEDIUM | XIRR is complex for SIPs with multiple buy dates; must handle ongoing portfolios correctly |
| Individual holding breakdown | Per-fund, per-stock: units, current value, invested, gain/loss | LOW | Basic table view |
| SIP tracking | Most Indian MF investors have active SIPs; missing = incomplete | LOW | Show active SIPs, monthly debit amount, next SIP date |
| Asset allocation view | Equity / Debt / Gold / International % breakdown | LOW | Pie chart is sufficient; users expect this |
| Fund scheme details | NAV history, category (large cap, ELSS, etc.), AMC name | LOW | Pull from AMFI public data |
| Search + add holdings manually | Users without digital import still need to track | LOW | Fallback for those who can't do CAS |
| Basic LTCG / STCG statement | Tax season = every tracker generates a capital gains report | HIGH | India-specific tax rules are complex; equity vs debt rules changed post-March 2023 |
| ITR-ready capital gains export | Users need this for filing; missing = user goes to competitor at tax time | HIGH | Schedule CG format for ITR-2/ITR-3 |
| Portfolio performance vs benchmark | "Beat the index?" is a core question for every investor | MEDIUM | Nifty 50 and category average are minimum; need index price series |
| Mobile-responsive web | Most users will check on phone; mobile app may not be v1 but web must work on mobile | LOW | Responsive CSS; no native app needed for v1 |
| Secure login + data privacy | Financial data = users are paranoid; must feel secure | MEDIUM | OTP-based auth minimum; no OAuth shortcuts that feel insecure |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Consolidated family portfolio view | No mainstream platform does true multi-PAN family consolidation cleanly; INDMoney has it but buried | HIGH | Core FolioAI differentiator; must show family-total AUM + drill to individual; different PANs, different brokers |
| AI fund scoring (expense ratio, alpha, manager track record, category rank) | Users cannot evaluate 2000+ Indian MF schemes without guidance; current platforms show raw numbers, not verdicts | HIGH | Requires structured fund data + Claude synthesis; novel in Indian market |
| AI fund replacement recommendations | "Fund X is underperforming, move to Fund Y" — no Indian app does this reliably yet | HIGH | Builds on AI scoring; must give specific action, not vague advice |
| Portfolio chat / natural language queries | "How exposed am I to IT sector?" — conversational access to own financial data | HIGH | Claude + structured portfolio context; genuinely novel; no Indian competitor has this |
| AI quarterly portfolio review report | Scheduled, written narrative review with what's working, what to exit, what to add | HIGH | Highest-value AI feature; replaces expensive wealth manager for self-directed HNIs |
| Tax loss harvesting suggestions (pre-March 31) | Proactive "you can book ₹45,000 loss in Fund X to offset your LTCG" — saves real money | HIGH | Rule-based engine + calendar trigger; Kuvera hints at this but implementation is weak |
| Rebalancing alerts with specific action | Not just "your equity is 73%, target is 70%" but "move ₹30,000 from Fund X to Fund Y" | MEDIUM | Builds on target allocation + current allocation delta |
| LTCG tax liability estimator (real-time) | "If I sell Fund X today, my tax bill is ₹12,400" — informs sell decisions | MEDIUM | Rule-based; needs cost basis + current NAV + holding period |
| Grandfathering calculation (pre-Jan 31, 2018 holdings) | Older investors have pre-2018 equity; without grandfathering, LTCG is overstated | HIGH | Complex; most platforms get this wrong or ignore it; critical for trust with HNIs |
| Fund overlap analysis across family | "Your family holds 6 funds that are 70% overlapping" — unique to family view | MEDIUM | Requires fund holdings data (AMC portfolio disclosures, monthly); v2 candidate |
| Annual portfolio review with year-in-full analysis | Year-end summary: what you earned, what you paid in tax, are you on track | MEDIUM | Extension of quarterly review; high perceived value |

### India-Specific Features (Tax and Regulatory)

| Feature | Category | Complexity | Notes |
|---------|----------|------------|-------|
| LTCG / STCG calculation for equity (1-year holding rule) | Tax — table stakes | HIGH | 1 year holding period; 10% tax above ₹1.25L/year (Budget 2024 change from ₹1L); 15% STCG |
| LTCG / STCG for debt mutual funds (post-April 2023 rule change) | Tax — table stakes | HIGH | Debt funds bought after April 1, 2023: no LTCG benefit, all gains at slab rate. Pre-April 2023 units: grandfathered at 20% with indexation |
| Grandfathering for equity (Jan 31, 2018 NAV as cost basis) | Tax — table stakes for HNIs | HIGH | For equity MF/stock units held before Jan 31, 2018, cost basis = max(actual cost, Jan 31 2018 NAV). Most platforms skip this |
| ELSS lock-in tracking (3-year lock-in per SIP installment) | Tax-saving MFs | MEDIUM | Each SIP installment has its own 3-year lock-in date; show which units are locked and which are redeemable |
| ELSS tax-saving under 80C | Tax planning | LOW | Show total 80C investment via ELSS for the financial year |
| NPS tracking (National Pension System) | Long-term tracking | MEDIUM | NPS has Tier-I and Tier-II accounts; NAV from NSDL; tax benefit under 80CCD(1B) |
| EPF balance tracking | Long-term tracking | MEDIUM | EPFO API or manual entry; many HNIs track EPF as part of overall wealth |
| Indexation benefit on old debt funds | Tax — advanced | HIGH | Pre-April 2023 debt fund units can use CII (Cost Inflation Index) to inflate cost basis, reducing taxable gain |
| Financial year segmentation (Apr–Mar, not Jan–Dec) | All analytics | LOW | All P&L, tax, SIP reports must be segmented by April–March FY, not calendar year |
| STP (Systematic Transfer Plan) tracking | MF features | MEDIUM | STP is a SIP from one fund to another; needs to track source deductions + destination additions linked |
| SWP (Systematic Withdrawal Plan) tracking | MF features | MEDIUM | Regular withdrawals from a fund; each SWP unit redeemed triggers LTCG/STCG event |
| Dividend vs Growth plan tracking | MF features | LOW | Must differentiate; dividends in IDCW plans are taxable at slab rate; affects ITR |
| Bonus stripping rule awareness | Tax — advanced | MEDIUM | Cannot book capital loss in a fund within 3 months of receiving a dividend/bonus; must flag in tax loss harvesting suggestions |
| Wash sale equivalent (India: purchase within 30 days) | Tax — advanced | MEDIUM | If you sell and rebuy same fund within 30 days, LTCG exemption can be disallowed; must flag in harvesting suggestions |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time stock price ticks | "I want to see my portfolio update live" | Requires paid data feeds (NSE/BSE fees), high infra cost, misaligns with long-term investor positioning, creates anxiety-driven checking behavior | EOD price updates at 4pm IST; clearly label "as of market close" |
| Trade execution (buy/sell) | "One-stop shop" appeal | SEBI RIA regulations prohibit advisory + execution in same entity without RIA + broker license; massive compliance overhead; dilutes focus | Deep-link to user's existing broker (Zerodha/Groww) with pre-filled order details |
| AI-generated tax numbers | "Use AI to calculate my exact tax liability" | LLMs hallucinate numbers; tax errors have real financial and legal consequences; users will blame the platform if ITR filing is wrong | Rule-based tax engine for all calculations; AI only for narrative summaries, never for numbers |
| Social features (compare with friends) | "How do I rank vs others?" | Privacy nightmare with financial data; invites gaming behavior; distraction from long-term wealth building | Benchmark comparison vs Nifty / category average instead of peer comparison |
| Robo-advisory (auto-rebalance execution) | "Just do it for me" | Requires SEBI RIA license with assets-under-advice regulations; automated execution requires broker integration + PMLA compliance | Recommend specific actions but require user to execute manually |
| WhatsApp/Telegram notifications | Convenience | Adds complexity, vendor dependency, data sharing with Meta/Telegram; v1 has no mobile app footprint to justify | Email alerts for tax window, rebalancing, underperformance |
| Cryptocurrency portfolio tracking | "I have crypto too" | Completely different data sources, exchanges, tax rules (30% flat + no loss offset in India); dilutes product focus | Out of scope for v1; track only regulated Indian financial instruments |
| F&O (Futures & Options) P&L | Power traders want everything in one place | Tick-level data, margin accounting, Greeks — fundamentally different from long-term investing; wrong user persona | Explicitly out of scope; link to Zerodha/Sensibull for F&O users |
| Intraday trading journal | Active traders want this | Wrong user; FolioAI is for long-term wealth, not active trading | Not applicable |
| Multi-currency portfolios (USD, EUR) | NRIs or those with US stocks | US stocks require FEMA compliance, US tax treaty knowledge; adds major complexity | US stocks as a v2 add-on if evidence of demand; v1 India-only |

---

## Feature Dependencies

```
CAS Import / Manual Entry
    └──enables──> Holdings Database
                      └──enables──> Portfolio Value (AUM)
                      └──enables──> XIRR Calculation
                      └──enables──> Asset Allocation View
                      └──enables──> LTCG / STCG Calculation
                                        └──enables──> Tax Loss Harvesting Suggestions
                                        └──enables──> ITR Capital Gains Report
                                        └──enables──> LTCG Tax Liability Estimator

Holdings Database + NAV Data
    └──enables──> Benchmark Comparison
    └──enables──> AI Fund Scoring
                      └──enables──> AI Fund Replacement Recommendations
                      └──enables──> AI Quarterly Review Report

Target Allocation (user-defined)
    └──enables──> Allocation Deviation View
                      └──enables──> Rebalancing Alerts (with specific action)

Goal Creation (user-defined)
    └──enables──> Goal Progress Projection
                      └──enables──> Goal Underfunding Alerts

Holdings Database + AI Fund Scoring
    └──enables──> Portfolio Chat (RAG over structured data)
    └──enables──> AI Annual Review Report

Family Member Management
    └──enables──> Per-Member Portfolio View
    └──enables──> Family Consolidated AUM View
                      └──enables──> Family Fund Overlap Analysis (v2)
```

### Dependency Notes

- **LTCG/STCG requires complete transaction history:** Partial imports (only current holdings, no purchase dates) make tax calculation impossible. CAS import must capture all historical transactions, not just current units.
- **AI features require structured fund data:** AI fund scoring requires a clean, structured fund database (AMC, category, AUM, expense ratio, alpha vs benchmark, manager tenure). This is a data infrastructure dependency, not just UI.
- **Grandfathering requires Jan 31, 2018 NAV data:** Must store historical NAV for every fund as of that specific date. If not seeded at launch, grandfathering is unavailable — alienates HNI users.
- **Tax loss harvesting conflicts with wash sale detection:** The feature that suggests "sell to book loss" must simultaneously check the 30-day rebuy rule and bonus stripping rule, or the suggestion itself could be tax-invalid.
- **Portfolio chat requires portfolio data in AI context:** Cannot use Claude on portfolio data without a retrieval/structuring layer; raw DB dump to LLM is both a privacy risk and a token-cost issue.
- **Rebalancing alerts enhance goal tracking:** A portfolio drifting out of allocation may also be drifting away from a goal projection — both systems need to be aware of each other.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — sufficient to validate core premise.

- [ ] CAS import (CAMS + KFintech, PDF) — entry point for serious users; without this, data entry friction kills adoption
- [ ] Manual holdings entry — fallback for users who can't or won't do CAS
- [ ] Total AUM + per-holding breakdown — the fundamental "what do I own" view
- [ ] XIRR calculation (per holding + overall) — table stakes; absolute return alone is misleading for SIP investors
- [ ] Asset allocation view (equity/debt/gold/international) — basic orientation
- [ ] SIP tracking (active SIPs, next debit date) — most users have SIPs; ignoring them feels incomplete
- [ ] LTCG/STCG calculation with grandfathering — tax is a top-3 use case; get it right or lose trust
- [ ] ITR capital gains report (Schedule CG export) — primary monetization hook via tax season loyalty
- [ ] Tax loss harvesting suggestions (pre-March 31) — highest perceived value tax feature; drives retention
- [ ] Benchmark comparison (Nifty 50 + category average) — users need "vs index" to assess quality
- [ ] Family portfolio view (consolidated + per-member) — core FolioAI differentiator; must be in v1
- [ ] AI fund scoring (expense ratio, alpha, category rank) — core AI differentiator; must be in v1
- [ ] AI fund replacement recommendations — direct output of scoring; actionable
- [ ] Portfolio chat — highest-delight AI feature; "chat with my portfolio" is genuinely novel in India
- [ ] AI quarterly review report — highest-value AI feature for the long-term investor persona
- [ ] Goal creation + projection — basic goal tracking anchors long-term engagement
- [ ] Underperformance alert (6+ months below benchmark) — proactive, reduces cognitive load

### Add After Validation (v1.x)

Features to add once core is working and user feedback is incorporated.

- [ ] MFCentral API import (vs PDF parsing) — cleaner than PDF, add once PDF flow is validated and API access confirmed
- [ ] Broker API import (Zerodha, Groww) — for stock holdings; add when stock tracking demand is confirmed
- [ ] ELSS lock-in tracker — important for tax-savers; straightforward to add once ELSS holdings are tracked
- [ ] STP / SWP tracking — edge case for most users; add when users request
- [ ] Rebalancing alerts (specific ₹ action, not just % drift) — builds on allocation view already in v1
- [ ] NPS tracking — enough HNI users have NPS to justify adding after launch
- [ ] AI annual review report — extension of quarterly review; add after first full financial year of data
- [ ] LTCG tax liability estimator ("if I sell today") — highly useful; add after core tax engine is stable

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Mobile app (iOS/Android) — web-first is the right call; validate on web before building native
- [ ] Fund overlap analysis (family-level) — requires monthly AMC portfolio disclosure data pipeline; non-trivial
- [ ] EPF balance tracking — EPFO API is unreliable; manual entry is poor UX; defer
- [ ] US stocks tracking — different data source, FEMA considerations; only if NRI demand is validated
- [ ] Dividend/IDCW tax tracking (slab rate) — important but edge case for growth plan investors
- [ ] Indexation calculation for old debt funds — very few users hold pre-April 2023 debt funds at scale; add when user asks
- [ ] Advisor-facing B2B view — separate product mode for RIAs managing multiple clients; distinct enough to be its own product

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CAS import | HIGH | HIGH | P1 |
| Portfolio AUM + per-holding view | HIGH | LOW | P1 |
| XIRR calculation | HIGH | MEDIUM | P1 |
| Family consolidated view | HIGH | HIGH | P1 — core differentiator |
| LTCG/STCG with grandfathering | HIGH | HIGH | P1 — trust-critical |
| ITR capital gains report | HIGH | HIGH | P1 — tax season loyalty |
| Tax loss harvesting suggestions | HIGH | MEDIUM | P1 |
| AI fund scoring | HIGH | HIGH | P1 — core differentiator |
| AI fund replacement recommendations | HIGH | MEDIUM | P1 — builds on scoring |
| Portfolio chat | HIGH | HIGH | P1 — novel differentiator |
| AI quarterly review | HIGH | HIGH | P1 — highest-value AI feature |
| Goal creation + projection | MEDIUM | MEDIUM | P1 |
| Asset allocation view | MEDIUM | LOW | P1 |
| SIP tracking | MEDIUM | LOW | P1 |
| Benchmark comparison | MEDIUM | MEDIUM | P1 |
| Underperformance alert | MEDIUM | MEDIUM | P1 |
| MFCentral API import | HIGH | MEDIUM | P2 |
| Broker API (stock import) | HIGH | HIGH | P2 |
| Rebalancing alerts (specific action) | MEDIUM | MEDIUM | P2 |
| ELSS lock-in tracker | MEDIUM | LOW | P2 |
| LTCG liability estimator | HIGH | MEDIUM | P2 |
| NPS tracking | LOW | MEDIUM | P3 |
| Fund overlap analysis | MEDIUM | HIGH | P3 |
| AI annual review | HIGH | LOW | P3 — extension of quarterly |
| Mobile app | HIGH | HIGH | P3 — v2 |

---

## Competitor Feature Analysis

| Feature | Kuvera | INDMoney | Groww | Zerodha Coin | mProfit | FolioAI Approach |
|---------|--------|----------|-------|--------------|---------|-----------------|
| CAS import | Yes — CAMS + KFintech | Yes | Yes | Yes | Yes (broker + MF) | Yes — v1 via PDF + MFCentral API |
| XIRR | Yes | Yes | Yes (basic) | Yes | Yes (detailed) | Yes — per holding + overall + SIP-specific |
| Family / multi-PAN view | No | Yes — limited | No | No | Yes — manual | Yes — first-class; core differentiator |
| LTCG/STCG report | Yes — strong | Yes | Basic | Yes | Yes — CA-grade | Yes — with grandfathering (most platforms skip this) |
| Grandfathering (Jan 31, 2018) | Partial | Unknown | No | No | Yes | Yes — required for HNI trust |
| Tax loss harvesting | Basic suggestion | No | No | No | Manual only | Yes — proactive, pre-March 31, rule-validated |
| Benchmark comparison | Yes | Yes | Yes | No | Yes | Yes — Nifty 50 + category average |
| AI fund scoring | No — shows ratings only | No | No | No | No | Yes — expense ratio + alpha + manager + category rank |
| AI recommendations | No | Generic alerts | No | No | No | Yes — specific fund replacement suggestions |
| Portfolio chat | No | No | No | No | No | Yes — novel in Indian market |
| AI quarterly review | No | No | No | No | No | Yes — unique value proposition |
| Goal tracking | Yes — basic | Yes | Basic | No | No | Yes — with projection and alerts |
| Asset allocation | Yes | Yes | Yes | No | Yes | Yes |
| Rebalancing alerts | Basic | Yes — basic | No | No | No | Yes — v1.x with specific ₹ action |
| SIP tracking | Yes | Yes | Yes | Yes | Yes | Yes |
| Mobile app | Yes | Yes | Yes | Yes (Kite app) | Yes | v2 — web-first in v1 |
| Stock tracking | Limited | Yes | Yes | No (MF only) | Yes | Yes — via broker import |
| NPS / EPF | No | Yes — EPF/NPS | No | No | No | v2 |
| US stocks | No | Yes | No | No | No | Out of scope v1 |

### Key Competitive Gaps FolioAI Addresses

1. **AI features across the board:** No Indian platform has substantive AI beyond rule-based alerts. The entire AI feature set (scoring, recommendations, portfolio chat, quarterly review) is a greenfield opportunity.
2. **Family view done right:** INDMoney has a family view but it is a secondary feature. FolioAI builds around the family-office mental model from the start.
3. **Tax accuracy with grandfathering:** Most platforms skip or partially implement pre-2018 grandfathering. Getting this right is a trust-builder for the HNI segment.
4. **Proactive tax loss harvesting:** Kuvera shows basic suggestions; no platform sends proactive, rule-validated suggestions with exact ₹ amounts before March 31.
5. **Long-term investor persona:** Groww and Zerodha serve the active trader/new investor. mProfit serves the CA/HNI with complexity. FolioAI serves the long-term, self-directed investor who wants insight without complexity.

---

## Sources

- Training knowledge of Kuvera, INDMoney, Groww, Zerodha Coin, Scripbox, Fisdom, mProfit, StockEdge, Value Research Online (confidence: MEDIUM — platforms are well-established, feature sets stable as of August 2025 training cutoff)
- AMFI (Association of Mutual Funds in India) — public NAV data and fund schema (HIGH confidence)
- SEBI RIA (Research Investment Adviser) regulations — advisory-only constraint (HIGH confidence)
- India income tax rules: LTCG/STCG equity (1-year rule, 10% above ₹1.25L), STCG 15%, debt fund rule change April 2023, grandfathering Jan 31 2018 (HIGH confidence — Budget 2024 confirmed)
- CAMS / KFintech CAS format (HIGH confidence — industry standard, documented)
- Note: WebSearch and WebFetch were unavailable during this research session. Recommend manual verification of AI feature landscape for current competitors before roadmap finalization, as this space evolves rapidly.

---

*Feature research for: Indian AI-powered portfolio management platform (FolioAI)*
*Researched: 2026-03-18*
