# Architecture Research: FolioAI

**Domain:** AI-powered personal portfolio management (India)
**Confidence:** HIGH for core patterns; MEDIUM for India-specific API availability

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Data Ingestion                                     │
│  CAS PDF Parser | Broker API Sync | Manual Entry UI          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Core Data Store                                    │
│  Transaction Ledger (immutable) | NAV History | Fund Data    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: Calculation Engine                                 │
│  Holding Aggregator | XIRR Engine | Tax Engine (LTCG/STCG)  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: AI / Intelligence Layer                            │
│  Fund Scorer | Recommendation Engine | Portfolio Chat | QR   │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Presentation                                       │
│  Dashboard | Goal Tracker | Tax Reports | Alert Center       │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Data Models

### Transaction (Source of Truth — Immutable)
```
Transaction {
  id: uuid
  holder_id: uuid          # Which family member
  instrument_type: 'mf' | 'stock'
  isin: string             # Unique instrument identifier
  folio_number: string?    # MF folio (null for stocks)
  transaction_type: 'buy' | 'sell' | 'switch_in' | 'switch_out' | 'dividend' | 'bonus'
  units: decimal
  nav_or_price: decimal    # Price per unit at transaction date
  amount: decimal          # Computed: units × price
  transaction_date: date
  source: 'cas_import' | 'broker_api' | 'manual'
  raw_ref: string?         # Original CAS/broker reference
  created_at: timestamp
}
```

**Why immutable:** XIRR and tax calculations depend on exact transaction history. Any mutation creates audit trail gaps and calculation bugs.

### Holding (Computed — Rebuilt from Transactions)
```
Holding {
  holder_id: uuid
  isin: string
  instrument_type: 'mf' | 'stock'
  total_units: decimal          # Sum of buy - sell units
  average_cost: decimal         # FIFO-weighted
  current_nav: decimal          # From daily sync
  current_value: decimal        # total_units × current_nav
  unrealized_gain: decimal
  xirr: decimal?                # Computed on demand
  last_calculated_at: timestamp
}
```

Holdings are never persisted as primary data — always recomputed from the Transaction ledger. Cache for performance, invalidate on new transactions or NAV update.

### TaxLot (FIFO — Critical for LTCG/STCG)
```
TaxLot {
  id: uuid
  transaction_id: uuid          # Buy transaction reference
  holder_id: uuid
  isin: string
  units_remaining: decimal      # Starts at buy units, decreases on sell
  cost_per_unit: decimal
  purchase_date: date
  is_grandfathered: boolean     # True if purchased before Feb 1, 2018
  grandfathered_nav: decimal?   # Jan 31, 2018 NAV for grandfathered units
  instrument_type: 'equity_mf' | 'debt_mf' | 'stock'
  ltcg_eligible_after: date     # purchase_date + 1yr (equity) or 3yr (debt, pre-Apr-2023)
}
```

### NAVHistory
```
NAVHistory {
  isin: string
  nav_date: date
  nav: decimal
  source: 'amfi' | 'mfapi'
}
```
Daily sync from AMFI/mfapi.in. Retain full history — needed for XIRR, grandfathering, and tax calculations.

### Goal
```
Goal {
  id: uuid
  user_id: uuid
  name: string                  # "Retirement", "Riya's education"
  target_amount: decimal
  target_date: date
  linked_holdings: isin[]       # Which funds contribute to this goal
  created_at: timestamp
}
```

---

## Data Flow Diagrams

### CAS Import Flow
```
PDF Upload → PDF Parser (pdf-parse / pdf2json)
           → Transaction Extractor (regex rules for CAMS/KFintech format)
           → Deduplication Check (match on folio + date + units + amount)
           → Transaction Ledger Insert (immutable)
           → Holdings Recalculation Trigger
           → TaxLot Rebuild (FIFO re-sort)
           → User Confirmation Screen
```

### Daily NAV Sync
```
Cron (11:30 PM IST, after AMFI publishes)
  → Fetch all unique ISINs from holdings
  → AMFI API / mfapi.in bulk fetch
  → Insert into NAVHistory (skip if already exists for date)
  → Invalidate Holdings cache
  → Recalculate current values
  → Trigger Alert Rules (underperformance, allocation drift)
```

### Tax Calculation Flow
```
User requests capital gains report
  → Fetch all TaxLots for holder (FIFO ordered)
  → For each sell transaction:
      → Match against TaxLots (FIFO)
      → Classify: equity/debt, holding period, grandfathered?
      → Calculate gain using correct cost basis
  → Aggregate by FY (April-March)
  → Apply LTCG exemption (₹1.25L for equity, FY2025+)
  → Output: Schedule CG format
```

### AI Chat Flow
```
User query → Context Builder:
               - User's top holdings (ISIN, value, XIRR, sector)
               - Recent transactions (last 30 days)
               - Goal status
               - Current allocation
             → Sanitize (remove PAN, folio numbers)
             → Claude API (claude-sonnet-4-6)
             → Response + relevant data references
```

---

## Architectural Patterns

### 1. Event-Sourced Transactions
- Transactions are the ledger of record (append-only)
- All portfolio views derived from transaction replay
- Benefits: Audit trail, ability to recalculate everything from scratch, handles CAS re-import gracefully

### 2. Rule Engine for Tax
- Tax calculations MUST be deterministic, rule-based code — NOT LLM
- Separate `TaxEngine` class with unit-tested rules per instrument type and date range
- Rules versioned by effective date (e.g., debt fund rule changed April 1, 2023)

### 3. Context-Bounded LLM Prompting
- AI features never receive raw financial data — always a summarized, sanitized context
- Context includes: category exposure %, XIRR by fund, asset allocation, goal progress — no absolute rupee amounts that could leak sensitive data
- Structured output (JSON) for recommendations; free text for chat and reports

### 4. Two-Pass CAS Parsing
- Pass 1: Extract transaction lines (regex on known CAMS/KFintech formats)
- Pass 2: Normalize and validate (date format, fund ISIN lookup, deduplication)
- Separate parsers for CAMS, KFintech, and CDSL formats (all different)

---

## Component Boundaries

```
[Web UI] ←→ [API Layer]
                ├→ [Holdings Service]   ← [Transaction Store] ← [Ingestion Service]
                ├→ [Tax Engine]         ← [TaxLot Store]       ← [Transaction Store]
                ├→ [XIRR Calculator]    ← [Transaction Store] + [NAVHistory Store]
                ├→ [Goal Tracker]       ← [Holdings Service] + [Goal Store]
                ├→ [Alert Service]      ← [Holdings Service] + [NAVHistory Store]
                └→ [AI Service]         ← [Holdings Service] + [Fund Data Service]
                                              ↑
[NAV Sync Cron] → [NAVHistory Store]
[Fund Data Sync] → [Fund Metadata Store] ← AMFI / ValueResearch
```

---

## Build Order (Dependencies)

**Must build in this order — each phase depends on prior:**

1. **Data Foundation** — Transaction schema, CAS parser, manual entry, NAVHistory sync
2. **Portfolio Analytics** — Holdings computation, XIRR, benchmark comparison, multi-holder
3. **Tax Engine** — TaxLot FIFO, LTCG/STCG classification, grandfathering, capital gains report
4. **AI Layer** — Fund scoring, recommendations, chat (requires Holdings + Fund Data + Tax Engine)
5. **Goals & Alerts** — Goal tracking, rebalancing alerts, tax harvesting alerts
6. **Broker Integration** — Zerodha/Groww API sync (parallel import path, not blocking core)

---

## India-Specific Complexity

### CAS Parsing
- CAMS and KFintech use different PDF formats — both needed for full MF coverage
- CDSL CAS covers stocks — separate format again
- PDF layouts change periodically; use regex + structure heuristics, not positional parsing
- Transaction descriptions vary ("Systematic Investment Plan", "SIP", "SIP Purchase" = same thing)

### Grandfathering (Pre-Feb 1, 2018 Equity Units)
- Cost basis for equity units purchased before Feb 1, 2018 = MAX(actual cost, Jan 31 2018 NAV)
- Jan 31, 2018 NAV must be stored permanently — cannot re-fetch from AMFI (historical)
- Affects all LTCG calculations for long-term investors. Getting this wrong = material tax error.

### Debt Fund Rule Change (April 1, 2023)
- Debt MF purchased after Apr 1, 2023: no LTCG benefit, taxed at slab rate regardless of holding period
- Debt MF purchased before Apr 1, 2023: old rules apply (3-year LTCG with indexation up to Jul 2024)
- Indexation removed for debt MF from July 23, 2024 budget — but only for purchases after that date

### LTCG Exemption Change (Budget 2024)
- Pre-FY2025: ₹1,00,000 exemption on equity LTCG
- FY2025 onwards: ₹1,25,000 exemption on equity LTCG
- Tax rate changed from 10% to 12.5% (Budget 2024)
- Tax harvesting logic must use correct exemption limit per FY

### Corporate Actions
- Bonus units: New units at zero cost, holding period resets
- Splits: Adjust unit count and NAV proportionally
- Fund mergers: Treat as switch (sell source + buy target) for tax purposes

---

## Anti-Patterns

1. **Storing Holdings as primary data** — Always recompute from transactions; stale cache causes wrong tax calculations
2. **Using LLM for tax math** — LLMs hallucinate numbers; tax engine must be deterministic rule-based code
3. **Single parser for all CAS formats** — CAMS, KFintech, CDSL are different; separate parsers per format
4. **Ignoring time zone** — All Indian market dates are IST; NAV publish time is 11 PM IST; never store in UTC without explicit conversion
5. **Eager XIRR computation** — XIRR is O(n transactions) per holding; compute on demand with caching, not on every page load

---

## Integration Points

| Service | Purpose | Access Method | Notes |
|---------|---------|---------------|-------|
| AMFI | Daily NAV, fund metadata | HTTP (public, no auth) | Rate limits apply; bulk download available |
| mfapi.in | Historical NAV API | REST API (free) | Unofficial but widely used; verify reliability |
| MFCentral | MF data aggregator | OAuth API | Requires registration; covers CAMS+KFintech |
| Zerodha Kite Connect | Stock holdings + transactions | REST API (paid) | ₹2000/month per user; WebSocket for live |
| CDSL easiest | Stock CAS for demat | PDF upload or API | API access requires CDSL partnership |
| Anthropic Claude | AI features | REST API | claude-sonnet-4-6 for chat/research |
| AMFI fund categorization | Category benchmarks | CSV download | Updated monthly |

---

## Confidence Levels

| Area | Confidence | Notes |
|------|-----------|-------|
| Core data models | HIGH | Standard fintech patterns |
| Tax calculation logic | HIGH | India tax rules are well-documented |
| CAS parsing approach | MEDIUM | Format may have changed; test with real CAS files |
| MFCentral API access | LOW | Restricted third-party access as of 2024 — verify |
| CDSL API access | LOW | Partnership required; may need PDF-only initially |
| Zerodha API availability | HIGH | Kite Connect well-documented |

---
*Research compiled: 2026-03-18*
