-- FolioAI Database Schema
-- Declarative reference copy — for development reference only
-- Apply via: supabase/migrations/20260319000001_schema.sql
--
-- Hierarchy: Family → Holders → Folios → Transactions
-- Shared master data: Funds, NavPrices, GrandfatheringNav

-- ============================================================
-- FUNDS MASTER TABLE (keyed by AMFI scheme code)
-- Populated by CAS import and NAV sync
-- ============================================================
CREATE TABLE funds (
  scheme_code     INTEGER PRIMARY KEY,
  scheme_name     TEXT NOT NULL,
  fund_house      TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT '',
  scheme_type     TEXT NOT NULL DEFAULT 'Open Ended',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FAMILIES TABLE (top of Family → Holders → Folios hierarchy)
-- ============================================================
CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_families_user_id ON families(user_id);

-- ============================================================
-- HOLDERS TABLE (family members with PAN)
-- ============================================================
CREATE TABLE holders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  pan             TEXT NOT NULL,
  pan_unmatched   BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, pan)
);

CREATE INDEX idx_holders_family_id ON holders(family_id);
CREATE INDEX idx_holders_pan ON holders(pan);

-- ============================================================
-- FOLIOS TABLE (fund accounts per holder)
-- ============================================================
CREATE TABLE folios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id       UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  folio_number    TEXT NOT NULL,
  scheme_code     INTEGER NOT NULL REFERENCES funds(scheme_code),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(holder_id, folio_number, scheme_code)
);

CREATE INDEX idx_folios_holder_id ON folios(holder_id);
CREATE INDEX idx_folios_scheme_code ON folios(scheme_code);

-- ============================================================
-- TRANSACTIONS TABLE (full ledger)
-- ============================================================
CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id          UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  transaction_date  DATE NOT NULL,
  transaction_type  TEXT NOT NULL CHECK (
                      transaction_type IN (
                        'purchase', 'redemption', 'switch_in', 'switch_out',
                        'sip', 'dividend_reinvest'
                      )
                    ),
  units             NUMERIC(16, 4) NOT NULL,
  nav               NUMERIC(16, 4) NOT NULL,
  amount            NUMERIC(16, 2) NOT NULL,
  import_status     TEXT NOT NULL DEFAULT 'clean' CHECK (import_status IN ('clean', 'needs_review')),
  source            TEXT NOT NULL DEFAULT 'cas_import' CHECK (source IN ('cas_import', 'manual')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(folio_id, transaction_date, transaction_type, units, amount)
);

CREATE INDEX idx_transactions_folio_id ON transactions(folio_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- ============================================================
-- NAV_PRICES TABLE (latest EOD NAV per scheme)
-- ============================================================
CREATE TABLE nav_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code     INTEGER NOT NULL REFERENCES funds(scheme_code),
  nav             NUMERIC(16, 4) NOT NULL,
  nav_date        DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scheme_code, nav_date)
);

CREATE INDEX idx_nav_prices_scheme_code ON nav_prices(scheme_code);
CREATE INDEX idx_nav_prices_date ON nav_prices(nav_date);

-- ============================================================
-- GRANDFATHERING_NAV TABLE (Jan 31, 2018 NAVs for tax engine)
-- One-time seed — do not modify after Phase 1 setup
-- ============================================================
CREATE TABLE grandfathering_nav (
  scheme_code   INTEGER PRIMARY KEY REFERENCES funds(scheme_code),
  nav           NUMERIC(16, 4) NOT NULL,
  nav_date      DATE NOT NULL DEFAULT '2018-01-31',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER holders_updated_at BEFORE UPDATE ON holders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER funds_updated_at BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
