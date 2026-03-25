CREATE TABLE broker_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id        UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  broker           TEXT NOT NULL CHECK (broker IN ('zerodha')),
  zerodha_user_id  TEXT,
  access_token     TEXT,
  token_expires_at TIMESTAMPTZ,
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (holder_id, broker)
);

ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_connections_select" ON broker_connections FOR SELECT USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "broker_connections_insert" ON broker_connections FOR INSERT WITH CHECK (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "broker_connections_update" ON broker_connections FOR UPDATE USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "broker_connections_delete" ON broker_connections FOR DELETE USING (
  holder_id IN (
    SELECT id FROM holders WHERE family_id IN (
      SELECT id FROM families WHERE user_id = auth.uid()
    )
  )
);
