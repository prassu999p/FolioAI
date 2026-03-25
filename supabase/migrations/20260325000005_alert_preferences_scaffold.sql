-- Alert preferences scaffold for V2 email alerts (ALRT-01, ALRT-02)
-- Email delivery is deferred to V2 (Resend + Vercel Cron).
-- This table is scaffolded now so V2 can add the alert logic without a schema migration.

CREATE TABLE user_alert_preferences (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ALRT-01: fund underperformance (6-month rolling)
  underperformance_alerts   BOOLEAN NOT NULL DEFAULT true,
  -- ALRT-02: asset drift threshold alert
  allocation_drift_alerts   BOOLEAN NOT NULL DEFAULT true,
  allocation_drift_threshold NUMERIC(5,2) NOT NULL DEFAULT 5.0
                            CHECK (allocation_drift_threshold >= 1 AND allocation_drift_threshold <= 30),
  -- ALRT-02: tax harvesting window (February reminder)
  tax_harvesting_alerts     BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Users manage only their own alert preferences
CREATE POLICY "alert_preferences_select" ON user_alert_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "alert_preferences_insert" ON user_alert_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "alert_preferences_update" ON user_alert_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- V2 note: When implementing ALRT-01, add a fund_performance_tracking table to record
-- rolling 6-month underperformance flags per (holder_id, scheme_code).
-- When implementing ALRT-02, add an alert_events table to log sent alerts and prevent duplicates.
