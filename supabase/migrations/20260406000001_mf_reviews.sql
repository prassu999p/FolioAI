-- MF Review results storage.
-- One record per (holder, fund) — upserted on re-run.
-- Stores the full analysis JSON plus a denormalised verdict string for quick queries.

CREATE TABLE mf_reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id        UUID        NOT NULL REFERENCES holders(id) ON DELETE CASCADE,
  scheme_code      INTEGER     NOT NULL,
  scheme_name      TEXT        NOT NULL,
  investor_profile JSONB       NOT NULL,  -- InvestorProfile shape
  analysis_result  JSONB       NOT NULL,  -- MFReviewResult shape
  verdict          TEXT        NOT NULL,  -- denormalised from analysis_result.verdict.label
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(holder_id, scheme_code)
);

-- Index for fast lookup by holder
CREATE INDEX mf_reviews_holder_idx ON mf_reviews(holder_id);

ALTER TABLE mf_reviews ENABLE ROW LEVEL SECURITY;

-- Users can only read/write reviews for holders in their own families
CREATE POLICY "mf_reviews_family_policy"
  ON mf_reviews FOR ALL
  USING (
    holder_id IN (
      SELECT h.id
      FROM   holders h
      JOIN   families f ON h.family_id = f.id
      WHERE  f.user_id = auth.uid()
    )
  );
