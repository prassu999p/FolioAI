CREATE TABLE rebalance_strategies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  strategy     TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id)
);

ALTER TABLE rebalance_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rebalance_strategies_select" ON rebalance_strategies FOR SELECT USING (
  family_id IN (
    SELECT id FROM families WHERE user_id = auth.uid()
  )
);
CREATE POLICY "rebalance_strategies_insert" ON rebalance_strategies FOR INSERT WITH CHECK (
  family_id IN (
    SELECT id FROM families WHERE user_id = auth.uid()
  )
);
CREATE POLICY "rebalance_strategies_update" ON rebalance_strategies FOR UPDATE USING (
  family_id IN (
    SELECT id FROM families WHERE user_id = auth.uid()
  )
);
