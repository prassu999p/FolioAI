-- nifty50_daily
-- Nifty 50 closing values by trading date.
-- Seeded once from niftyindices.com CSV; refreshed monthly via scripts/seed-nifty50.ts
-- RLS: authenticated users can read; no user writes allowed (only service role).

CREATE TABLE IF NOT EXISTS nifty50_daily (
  nav_date  DATE PRIMARY KEY,
  close     NUMERIC(12, 2) NOT NULL  -- Nifty 50 closing value (e.g. 22450.75)
);

ALTER TABLE nifty50_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read nifty50"
  ON nifty50_daily FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy — only service role can write.
-- This prevents users from manipulating benchmark data.
