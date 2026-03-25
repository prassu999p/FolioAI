CREATE TABLE stock_holdings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id      UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  tradingsymbol  TEXT NOT NULL,
  exchange       TEXT NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
  isin           TEXT,
  quantity       NUMERIC(16, 4) NOT NULL DEFAULT 0,
  average_price  NUMERIC(16, 4) NOT NULL DEFAULT 0,
  last_price     NUMERIC(16, 4),
  pnl            NUMERIC(16, 4),
  broker_source  TEXT NOT NULL DEFAULT 'zerodha' CHECK (broker_source IN ('zerodha', 'manual')),
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (holder_id, tradingsymbol, exchange)
);

ALTER TABLE stock_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_holdings_select" ON stock_holdings FOR SELECT USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "stock_holdings_insert" ON stock_holdings FOR INSERT WITH CHECK (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "stock_holdings_update" ON stock_holdings FOR UPDATE USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "stock_holdings_delete" ON stock_holdings FOR DELETE USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
