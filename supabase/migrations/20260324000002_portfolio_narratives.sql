CREATE TABLE IF NOT EXISTS portfolio_narratives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id    UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  narrative    TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (holder_id)
);

ALTER TABLE portfolio_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_narratives_select" ON portfolio_narratives
  FOR SELECT USING (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "portfolio_narratives_insert" ON portfolio_narratives
  FOR INSERT WITH CHECK (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "portfolio_narratives_update" ON portfolio_narratives
  FOR UPDATE USING (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "portfolio_narratives_delete" ON portfolio_narratives
  FOR DELETE USING (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );
