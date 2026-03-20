-- holder_allocation_targets
-- Per-holder target asset allocation (equity/debt/gold/international %)
-- Constraint prevents sum > 100 at DB level (backup to Zod validation).
-- RLS: holder owner can read/write their own allocation target.

CREATE TABLE IF NOT EXISTS holder_allocation_targets (
  holder_id     UUID PRIMARY KEY REFERENCES holders(id) ON DELETE CASCADE,
  equity        NUMERIC(5,2) NOT NULL DEFAULT 0
                CHECK (equity >= 0 AND equity <= 100),
  debt          NUMERIC(5,2) NOT NULL DEFAULT 0
                CHECK (debt >= 0 AND debt <= 100),
  gold          NUMERIC(5,2) NOT NULL DEFAULT 0
                CHECK (gold >= 0 AND gold <= 100),
  international NUMERIC(5,2) NOT NULL DEFAULT 0
                CHECK (international >= 0 AND international <= 100),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT total_allocation_max
    CHECK (equity + debt + gold + international <= 100)
);

-- RLS: holder owner can read/write their own allocation target
ALTER TABLE holder_allocation_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holder owner reads allocation target"
  ON holder_allocation_targets FOR SELECT
  USING (
    holder_id IN (
      SELECT ho.id FROM holders ho
      JOIN families fa ON fa.id = ho.family_id
      WHERE fa.user_id = auth.uid()
    )
  );

CREATE POLICY "holder owner writes allocation target"
  ON holder_allocation_targets FOR ALL
  USING (
    holder_id IN (
      SELECT ho.id FROM holders ho
      JOIN families fa ON fa.id = ho.family_id
      WHERE fa.user_id = auth.uid()
    )
  );
