# Pitfalls Research: FolioAI

**Domain:** AI-powered personal portfolio management (India)
**Confidence:** HIGH — India-specific, actionable, phase-mapped

---

## Critical Pitfalls

### 1. XIRR Calculated from Holdings Snapshot, Not Transaction Log

**What goes wrong:** Computing XIRR from current holdings value and average cost instead of the full transaction cashflow series. Silently wrong for SIP portfolios — error range of 3–8%.

**Warning signs:** XIRR matches absolute return % closely; SIP investors get suspicious numbers.

**Prevention:** Model transactions as an immutable ledger from day one. XIRR input = `[{date, cashflow}, ...]` where buys are negative and current value is the final positive cashflow.

**Phase:** Foundation (Phase 1) — fix this retroactively is a full schema migration.

---

### 2. Tax Rules Hardcoded in Application Code

**What goes wrong:** Every Union Budget (Feb 1) changes LTCG rates, exemption limits, or holding periods. Hardcoded rules require a code deployment to stay compliant. Budget 2024 alone changed: LTCG rate (10% → 12.5%), LTCG exemption (₹1L → ₹1.25L), debt fund indexation removal.

**Warning signs:** Tax calculation hardcodes `0.10`, `100000`, `365` as literals.

**Prevention:** Store tax rules in a `tax_rules` DB table with `effective_from` date column. Tax engine queries: "what rules apply for this transaction date and instrument type?"

**Phase:** Foundation (Phase 1) — database-driven tax rules must be designed in before the tax engine is built.

---

### 3. Grandfathering Formula Implemented Incorrectly

**What goes wrong:** The correct grandfathering formula for pre-Feb 1, 2018 equity units is:
```
cost_of_acquisition = MAX(actual_purchase_price, MIN(jan_31_2018_nav, sale_price))
```
Most implementations do only `MAX(actual_cost, jan_31_nav)` — missing the `MIN(..., sale_price)` cap. This overstates cost basis and understates taxable gain in loss scenarios.

**Warning signs:** Grandfathered units showing tax gain when sale price < Jan 31 NAV.

**Prevention:** Unit test the formula against CBDT examples. Store `jan_31_2018_nav` per ISIN permanently — it cannot be re-fetched.

**Phase:** Tax Engine — dedicated test suite for grandfathering scenarios.

---

### 4. CAS PDF Parsing Brittleness

**What goes wrong:** CAMS and KFintech update their PDF templates without notice. A template change silently breaks the parser, causing missed transactions or wrong data — which corrupts all downstream calculations.

**Warning signs:** Unit count in app doesn't match CAS statement total; missing recent transactions.

**Prevention:**
- Build a diverse test corpus of CAS PDFs (collect 10+ real samples before building the parser)
- Add post-parse validation: parsed unit count must match the "closing balance" stated in CAS
- Alert user if validation fails instead of silently proceeding
- Version-stamp parsed files so re-parse is possible when parser is fixed

**Phase:** Phase 1 (CAS Import) — validation is non-negotiable from day one.

---

### 5. AI Producing Investment Advice (SEBI RIA Violation)

**What goes wrong:** LLMs naturally produce imperative language: "You should buy X", "Sell Y immediately", "I recommend switching to Z". This crosses from analysis into advice, which requires SEBI RIA (Registered Investment Advisor) registration.

**Warning signs:** AI responses use imperative verbs — "should", "must", "buy", "sell", "invest".

**Prevention:**
- Prompt guardrails: "You are an analysis tool, not an advisor. Present analysis and options, never tell the user what to do."
- Output filter: scan for imperative language patterns before rendering
- Legal disclaimer on all AI outputs: "This is analysis, not investment advice."
- Standard phrase: "Based on the data, Fund X has underperformed category average by 3% over 3 years. You may want to review this with an advisor."

**Phase:** AI Features — legal review of prompts before launch.

---

### 6. AI Hallucinating Fund Facts

**What goes wrong:** LLMs confidently state wrong expense ratios, AUM figures, fund manager names, and category rankings. A user making a fund decision based on hallucinated facts is a serious trust failure.

**Warning signs:** AI mentions specific numeric facts about funds that aren't in the context you provided.

**Prevention:** RAG pattern — never ask the LLM to recall fund facts from training data. Always:
1. Fetch fund facts from DB (expense ratio, AUM, benchmark, category rank)
2. Inject into prompt as structured context
3. Instruct: "Only use the fund data provided in this context. Do not use your training knowledge for fund-specific facts."

**Phase:** AI Features (Phase 4) — RAG architecture must be designed before AI features are built.

---

### 7. Corporate Actions Not Tracked

**What goes wrong:** Dividend reinvestment creates new units at zero cost (different tax treatment). Scheme mergers are treated as switch (sell + buy). Bonus units have zero cost and holding period resets. Missing these silently inflates or deflates unit counts and corrupts cost basis.

**Warning signs:** App's unit count doesn't match demat statement; unexplained gain/loss discrepancies.

**Prevention:** Model corporate actions as first-class transaction types:
- `dividend_reinvestment` — new units, cost = NAV on reinvestment date
- `scheme_merger` — old scheme sell + new scheme buy at swap ratio
- `bonus_units` — new units, cost = 0, new purchase date

**Phase:** Phase 1 (Transaction model) — add these transaction types to the schema before CAS parsing, as CAS files contain these events.

---

### 8. Debt Fund 2023 Rule Applied at Fund Level, Not Lot Level

**What goes wrong:** The April 1, 2023 rule (debt MF no longer gets LTCG treatment) applies to **purchase date**, not fund type. Lots bought before April 1, 2023 in a debt fund follow old rules (3-year LTCG with indexation up to July 2024). Lots bought after follow new rules (taxed at slab rate). Many platforms apply the rule at fund level (all lots in a debt fund) instead of lot level.

**Warning signs:** Debt fund tax report shows same treatment for all units regardless of purchase date.

**Prevention:** Tax engine operates on TaxLots, not Holdings. Every lot has `instrument_type`, `purchase_date`, and the correct rule is derived from both.

**Phase:** Tax Engine — lot-level calculation is a core design requirement.

---

### 9. Multi-Holder Schema Missing Family Layer

**What goes wrong:** Building the data model as `user → portfolios` instead of `user → family → holders → portfolios`. Adding the family consolidation layer later requires a full schema migration and breaks all existing queries.

**Warning signs:** Consolidated family view requires joining across user accounts instead of a family table.

**Prevention:** Design schema from day one as:
```
users (the manager/login)
  └── families (optional grouping)
        └── holders (individual PANs: self, spouse, child, parent)
              └── folios / demat_accounts
                    └── transactions
```

**Phase:** Phase 1 (Foundation) — this is a schema design decision, not a feature.

---

### 10. NAV Data Quality — Holiday Gaps and Stale Data

**What goes wrong:** Querying `WHERE nav_date = '2024-10-02'` returns NULL on market holidays (Gandhi Jayanti). Portfolio value shows as zero or previous. Calculation engine crashes.

**Warning signs:** Portfolio value shows NULL or ₹0 on market holidays.

**Prevention:** Always fetch NAV using the "latest on or before date" pattern:
```sql
SELECT nav FROM nav_history
WHERE isin = $1 AND nav_date <= $2
ORDER BY nav_date DESC LIMIT 1
```
Never use exact date match for NAV lookups.

**Phase:** Phase 1 (Data Infrastructure) — this query pattern must be enforced from first use.

---

### 11. DPDP Act 2023 Non-Compliance

**What goes wrong:** Storing PAN numbers in plaintext. Sending PII (name, PAN, folio numbers) in LLM prompts. India's Digital Personal Data Protection Act 2023 requires explicit consent, data minimization, and right to erasure.

**Warning signs:** PAN visible in database queries; LLM prompt contains "PAN: ABCDE1234F".

**Prevention:**
- Hash PAN for storage; only display masked version (ABCXX1234F) to user
- Strip all PII before constructing AI context: use `holder_id` references instead of names/PAN
- Document data retention policy; implement account deletion that cascades all personal data
- Consent collection for AI processing of portfolio data

**Phase:** Phase 1 (Foundation) — PAN handling strategy must be decided before any data is stored.

---

### 12. Budget 2024 Indexation Changes Misapplied

**What goes wrong:** Budget 2024 (July 23, 2024) removed indexation for debt MF with a grandfather clause: units purchased before July 23, 2024 can still use indexation OR the new 12.5% flat rate (whichever is lower). Platforms either apply the change to all lots or ignore it entirely.

**Warning signs:** Tax report shows same treatment for debt MF units purchased in 2020 vs 2024.

**Prevention:** The tax engine must handle this as a two-option calculation for pre-July-2024 debt lots:
1. Option A: 20% with indexation (old rule)
2. Option B: 12.5% without indexation (new rule)
3. Report = min(Option A, Option B) for each lot

**Phase:** Tax Engine — add to the tax rules test matrix.

---

## Anti-Pattern Summary Table

| # | Pitfall | Detection | Prevention | Phase |
|---|---------|-----------|------------|-------|
| 1 | XIRR from snapshot | XIRR ≈ absolute return | Immutable transaction ledger | 1 |
| 2 | Hardcoded tax rules | Budget breaks app | DB-driven tax rules table | 1 |
| 3 | Wrong grandfathering formula | Loss scenario errors | Unit test vs CBDT examples | 3 |
| 4 | Brittle CAS parser | Unit count mismatch | Post-parse validation + test corpus | 1 |
| 5 | AI gives advice | Imperative language | Prompt guardrails + output filter | 4 |
| 6 | AI hallucinates fund facts | Wrong expense ratios/AUM | RAG — inject facts from DB | 4 |
| 7 | Missing corporate actions | Unit count discrepancies | First-class transaction types | 1 |
| 8 | Debt rule at fund level | Wrong debt lot tax | TaxLot-level calculation | 3 |
| 9 | Flat multi-holder schema | Hard family consolidation | Family → Holder hierarchy from day one | 1 |
| 10 | Exact NAV date lookup | Null on holidays | `<= date ORDER BY DESC LIMIT 1` | 1 |
| 11 | PII in plaintext/AI prompts | DPDP compliance risk | PAN hashing + PII stripping | 1 |
| 12 | Budget 2024 indexation | Wrong debt MF tax | Two-option calculation pre-July-2024 | 3 |

---
*Research compiled: 2026-03-18*
