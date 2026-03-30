-- Migration: Tradebook Import Foundation
-- Adds source metadata columns to stock_holdings and creates stock_transactions table
-- for individual trade events imported from broker tradebooks.

-- 1. Extend stock_holdings with source metadata columns
--    broker_source is kept for backward compat with existing Zerodha queries.
ALTER TABLE stock_holdings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'zerodha'
    CHECK (source IN ('zerodha', 'manual', 'tradebook')),
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS import_filename TEXT;

COMMENT ON COLUMN stock_holdings.broker_source IS 'Deprecated — use source column. Kept for backward compat.';

-- 2. Create stock_transactions table for individual trade events (NOT positions)
CREATE TABLE stock_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id       UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  tradingsymbol   TEXT NOT NULL,
  exchange        TEXT NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
  isin            TEXT NOT NULL,
  trade_date      DATE NOT NULL,
  trade_type      TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  quantity        NUMERIC(16, 4) NOT NULL,
  price           NUMERIC(16, 4) NOT NULL,
  trade_id        TEXT,
  batch_id        UUID NOT NULL,
  import_filename TEXT,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Dedup key: trade IDs are exchange-assigned per-day (not globally unique across years).
  -- Including exchange + trade_date prevents cross-year false positives when the same
  -- numeric trade ID is reused by an exchange on a different date.
  UNIQUE (holder_id, trade_id, exchange, trade_date)
);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: same three-hop chain as stock_holdings
CREATE POLICY "stock_transactions_select" ON stock_transactions FOR SELECT USING (
  holder_id IN (SELECT id FROM holders WHERE family_id IN (SELECT id FROM families WHERE user_id = auth.uid()))
);

CREATE POLICY "stock_transactions_insert" ON stock_transactions FOR INSERT WITH CHECK (
  holder_id IN (SELECT id FROM holders WHERE family_id IN (SELECT id FROM families WHERE user_id = auth.uid()))
);

CREATE POLICY "stock_transactions_delete" ON stock_transactions FOR DELETE USING (
  holder_id IN (SELECT id FROM holders WHERE family_id IN (SELECT id FROM families WHERE user_id = auth.uid()))
);
