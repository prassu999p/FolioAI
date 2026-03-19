-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Performance: use (select auth.uid()) to evaluate once per statement
-- ============================================================

-- FAMILIES
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own family"
  ON families FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- HOLDERS (child of families)
ALTER TABLE holders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access holders in their family"
  ON holders FOR ALL TO authenticated
  USING (
    family_id IN (
      SELECT id FROM families WHERE user_id = (select auth.uid())
    )
  );

-- FOLIOS (child of holders)
ALTER TABLE folios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access folios in their family"
  ON folios FOR ALL TO authenticated
  USING (
    holder_id IN (
      SELECT h.id FROM holders h
      JOIN families f ON h.family_id = f.id
      WHERE f.user_id = (select auth.uid())
    )
  );

-- TRANSACTIONS (child of folios)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access transactions in their family"
  ON transactions FOR ALL TO authenticated
  USING (
    folio_id IN (
      SELECT fo.id FROM folios fo
      JOIN holders h ON fo.holder_id = h.id
      JOIN families f ON h.family_id = f.id
      WHERE f.user_id = (select auth.uid())
    )
  );

-- FUNDS (shared master data — readable by all authenticated)
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read funds"
  ON funds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages funds"
  ON funds FOR ALL TO service_role USING (true) WITH CHECK (true);

-- NAV_PRICES (shared — readable by authenticated)
ALTER TABLE nav_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read nav_prices"
  ON nav_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can upsert nav_prices"
  ON nav_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update nav_prices"
  ON nav_prices FOR UPDATE TO authenticated USING (true);

-- GRANDFATHERING_NAV (shared reference — read-only for authenticated)
ALTER TABLE grandfathering_nav ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read grandfathering_nav"
  ON grandfathering_nav FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages grandfathering_nav"
  ON grandfathering_nav FOR ALL TO service_role USING (true) WITH CHECK (true);
