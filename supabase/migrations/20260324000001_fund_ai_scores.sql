CREATE TABLE IF NOT EXISTS fund_ai_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id        UUID NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  scheme_code      INTEGER NOT NULL REFERENCES funds(scheme_code),
  quality_score    INTEGER NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  alpha_pct        NUMERIC(6,2),
  expense_ratio    NUMERIC(5,2),
  aum_trend        TEXT CHECK (aum_trend IN ('growing', 'stable', 'declining', 'insufficient_data')),
  narrative_text   TEXT NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (holder_id, scheme_code)
);

ALTER TABLE fund_ai_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_ai_scores_select" ON fund_ai_scores
  FOR SELECT USING (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "fund_ai_scores_insert" ON fund_ai_scores
  FOR INSERT WITH CHECK (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "fund_ai_scores_update" ON fund_ai_scores
  FOR UPDATE USING (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "fund_ai_scores_delete" ON fund_ai_scores
  FOR DELETE USING (
    holder_id IN (
      SELECT id FROM holders WHERE family_id IN (
        SELECT id FROM families WHERE user_id = auth.uid()
      )
    )
  );
