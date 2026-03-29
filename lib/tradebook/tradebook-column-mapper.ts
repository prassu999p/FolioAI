/**
 * tradebook-column-mapper.ts
 *
 * Maps raw broker column headers (Zerodha, HDFC, ICICI, etc.) to canonical
 * field names used throughout the tradebook import pipeline.
 *
 * Responsibilities:
 *  - COLUMN_ALIASES: canonical key → set of raw header variations (case-insensitive)
 *  - normaliseHeaders: transforms a raw row's keys to canonical names
 */

/**
 * Map of canonical field name → array of known raw header variations.
 * All comparisons are done case-insensitively.
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
  symbol: [
    'symbol',
    'scrip name',
    'scripname',
    'stock symbol',
    'instrument',
    'security',
    'trading symbol',
    'tradingsymbol',
    'scrip',
  ],
  isin: [
    'isin',
    'isin code',
    'isincode',
    'isin no',
    'isin number',
    'isin_code',
  ],
  trade_date: [
    'trade_date',
    'trade date',
    'tradedate',
    'date',
    'transaction date',
    'settlement date',
    'order date',
  ],
  exchange: [
    'exchange',
    'exch',
    'market',
    'segment',
  ],
  trade_type: [
    'trade_type',
    'trade type',
    'tradetype',
    'buy/sell',
    'buy_sell',
    'b/s',
    'transaction type',
    'type',
    'action',
    'side',
  ],
  quantity: [
    'quantity',
    'qty',
    'qnty',
    'no. of shares',
    'no of shares',
    'shares',
    'units',
  ],
  price: [
    'price',
    'trade price',
    'tradeprice',
    'rate',
    'avg price',
    'average price',
    'trade_price',
  ],
  trade_id: [
    'trade_id',
    'trade id',
    'tradeid',
    'order id',
    'order_id',
    'orderid',
    'ref no',
    'ref. no',
    'reference no',
    'reference number',
    'trade no',
    'trade number',
  ],
}

/**
 * Build a lookup map: lowercased raw header → canonical key.
 * Computed once at module load.
 */
const _reverseLookup: Map<string, string> = new Map()
for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) {
    _reverseLookup.set(alias.toLowerCase(), canonical)
  }
}

/**
 * normaliseHeaders
 *
 * Takes a raw spreadsheet row (keys are broker-specific column names) and
 * returns a new row object with keys renamed to canonical names.
 *
 * Keys that do not match any alias are passed through unchanged (to allow
 * downstream callers to handle unknown columns without data loss).
 *
 * @param rawRow - A single row from the spreadsheet with raw column names
 * @returns A new row object with canonical column names where mappings exist
 */
export function normaliseHeaders(
  rawRow: Record<string, unknown>
): Record<string, unknown> {
  const normalised: Record<string, unknown> = {}

  for (const [rawKey, value] of Object.entries(rawRow)) {
    const canonical = _reverseLookup.get(rawKey.toLowerCase().trim())
    if (canonical !== undefined) {
      normalised[canonical] = value
    } else {
      normalised[rawKey] = value
    }
  }

  return normalised
}
