-- Fix: tradebook dedup key was too narrow (holder_id, trade_id only).
-- Exchange-assigned trade IDs are per-day sequential numbers — the same numeric ID
-- can appear on different dates across different annual tradebooks, causing legitimate
-- cross-year trades to be falsely flagged as duplicates.
-- New key: (holder_id, trade_id, exchange, trade_date) — unique per holder, per exchange day.

ALTER TABLE stock_transactions
  DROP CONSTRAINT IF EXISTS stock_transactions_holder_id_trade_id_key;

ALTER TABLE stock_transactions
  ADD CONSTRAINT stock_transactions_holder_id_trade_id_exchange_trade_date_key
  UNIQUE (holder_id, trade_id, exchange, trade_date);
