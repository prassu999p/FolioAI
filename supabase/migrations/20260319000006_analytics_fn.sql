-- get_holder_analytics_transactions
-- Returns raw cashflows for XIRR computation (TypeScript-side).
-- XIRR is computed in TypeScript after this call (never in SQL — iterative math).
-- RLS bypassed via SECURITY DEFINER (same pattern as get_holder_holdings).
--
-- Called by: components/analytics/summary-cards.tsx
--   supabase.rpc('get_holder_analytics_transactions', { p_holder_id, p_start_date, p_end_date })

CREATE OR REPLACE FUNCTION get_holder_analytics_transactions(
  p_holder_id  UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  folio_id         UUID,
  scheme_code      INTEGER,
  scheme_name      TEXT,
  transaction_date DATE,
  transaction_type TEXT,
  amount           NUMERIC,
  units            NUMERIC,
  nav              NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    t.folio_id,
    fo.scheme_code,
    f.scheme_name,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    t.units,
    t.nav
  FROM folios fo
  JOIN funds f ON f.scheme_code = fo.scheme_code
  JOIN transactions t ON t.folio_id = fo.id
  WHERE fo.holder_id = p_holder_id
    AND (p_start_date IS NULL OR t.transaction_date >= p_start_date)
    AND t.transaction_date <= p_end_date
    AND t.import_status = 'clean'
  ORDER BY t.transaction_date ASC
$$;
