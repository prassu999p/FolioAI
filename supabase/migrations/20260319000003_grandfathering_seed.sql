-- This migration is a placeholder that marks grandfathering_nav as ready for seeding.
-- The actual seed data is populated by running: npx tsx scripts/seed-grandfathering-nav.ts
-- This must be run ONCE as part of Phase 1 setup.
-- See: STATE.md blocker — "Jan 31, 2018 NAV seed data must be loaded at Phase 1"

-- Ensure grandfathering_nav is ready to receive data (no data inserted here — API required)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM grandfathering_nav LIMIT 1) THEN
    RAISE NOTICE 'grandfathering_nav is empty. Run: npx tsx scripts/seed-grandfathering-nav.ts';
  END IF;
END $$;
