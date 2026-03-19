-- Holdings aggregation function
-- Returns active holdings (net_units > 0) for a holder with latest NAV values
CREATE OR REPLACE FUNCTION get_holder_holdings(p_holder_id UUID)
RETURNS TABLE (
  scheme_code      INTEGER,
  scheme_name      TEXT,
  fund_house       TEXT,
  folio_id         UUID,
  units            NUMERIC,
  avg_cost_nav     NUMERIC,
  total_invested   NUMERIC,
  current_nav      NUMERIC,
  current_nav_date DATE,
  current_value    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH folio_ids AS (
    SELECT fo.id AS folio_id, fo.scheme_code
    FROM folios fo
    WHERE fo.holder_id = p_holder_id
  ),
  tx_agg AS (
    SELECT
      fi.folio_id,
      fi.scheme_code,
      -- Net units: buys add, sells subtract
      SUM(
        CASE
          WHEN t.transaction_type IN ('purchase', 'sip', 'switch_in', 'dividend_reinvest')
          THEN t.units
          WHEN t.transaction_type IN ('redemption', 'switch_out')
          THEN -t.units
          ELSE 0
        END
      ) AS net_units,
      -- Total invested (buy amounts only)
      SUM(
        CASE
          WHEN t.transaction_type IN ('purchase', 'sip', 'switch_in')
          THEN t.amount
          ELSE 0
        END
      ) AS total_invested,
      -- Weighted average buy NAV
      CASE
        WHEN SUM(CASE WHEN t.transaction_type IN ('purchase', 'sip', 'switch_in') THEN t.units ELSE 0 END) > 0
        THEN SUM(CASE WHEN t.transaction_type IN ('purchase', 'sip', 'switch_in') THEN t.amount ELSE 0 END)
             / SUM(CASE WHEN t.transaction_type IN ('purchase', 'sip', 'switch_in') THEN t.units ELSE 0 END)
        ELSE 0
      END AS avg_cost_nav
    FROM folio_ids fi
    JOIN transactions t ON t.folio_id = fi.folio_id
    GROUP BY fi.folio_id, fi.scheme_code
    HAVING SUM(
      CASE
        WHEN t.transaction_type IN ('purchase', 'sip', 'switch_in', 'dividend_reinvest') THEN t.units
        WHEN t.transaction_type IN ('redemption', 'switch_out') THEN -t.units
        ELSE 0
      END
    ) > 0   -- only active holdings (net units > 0)
  ),
  latest_nav AS (
    SELECT DISTINCT ON (scheme_code)
      scheme_code,
      nav AS current_nav,
      nav_date AS current_nav_date
    FROM nav_prices
    ORDER BY scheme_code, nav_date DESC
  )
  SELECT
    ta.scheme_code,
    f.scheme_name,
    f.fund_house,
    ta.folio_id,
    ta.net_units AS units,
    ta.avg_cost_nav,
    ta.total_invested,
    ln.current_nav,
    ln.current_nav_date,
    CASE
      WHEN ln.current_nav IS NOT NULL THEN ROUND(ta.net_units * ln.current_nav, 2)
      ELSE NULL
    END AS current_value
  FROM tx_agg ta
  JOIN funds f ON f.scheme_code = ta.scheme_code
  LEFT JOIN latest_nav ln ON ln.scheme_code = ta.scheme_code
$$;
