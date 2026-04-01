// app/api/holdings/import-tradebook/route.ts
// POST handler: validate, deduplicate, and upsert tradebook rows into
// stock_transactions and aggregate net positions into stock_holdings.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { mapToStockTransactionInsert } from '@/lib/tradebook/tradebook-mapper'
import type { ValidatedRow } from '@/lib/tradebook/tradebook-validator'

// ─── Zod schema for the POST body ────────────────────────────────────────────

const ValidatedRowSchema = z.object({
  symbol: z.string().min(1),
  isin: z.string().min(1),
  trade_date: z.string().min(1),
  exchange: z.enum(['NSE', 'BSE']),
  trade_type: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  trade_id: z.string().optional(),
})

const RequestBodySchema = z.object({
  holderId: z.string().uuid('holderId must be a valid UUID'),
  filename: z.string().min(1, 'filename is required'),
  batchId: z.string().uuid('batchId must be a valid UUID'),
  rows: z.array(ValidatedRowSchema).min(1, 'rows must not be empty'),
})

// ─── Aggregate positions for stock_holdings upsert ───────────────────────────

interface AggregatedPosition {
  tradingsymbol: string
  exchange: string
  isin: string
  net_quantity: number
  weighted_avg_price: number
}

function aggregatePositions(rows: ValidatedRow[]): AggregatedPosition[] {
  // Group by (tradingsymbol, exchange)
  const groups = new Map<
    string,
    { isin: string; buy_qty: number; sell_qty: number; buy_value: number }
  >()

  for (const row of rows) {
    const key = `${row.symbol}::${row.exchange}`
    const existing = groups.get(key) ?? {
      isin: row.isin,
      buy_qty: 0,
      sell_qty: 0,
      buy_value: 0,
    }

    if (row.trade_type === 'buy') {
      existing.buy_qty += row.quantity
      existing.buy_value += row.quantity * row.price
    } else {
      existing.sell_qty += row.quantity
    }

    groups.set(key, existing)
  }

  const positions: AggregatedPosition[] = []
  for (const [key, g] of groups.entries()) {
    const [tradingsymbol, exchange] = key.split('::')
    const net_quantity = g.buy_qty - g.sell_qty
    // Avoid division by zero (all rows could be sells in edge case)
    const weighted_avg_price = g.buy_qty > 0 ? g.buy_value / g.buy_qty : 0

    positions.push({
      tradingsymbol,
      exchange,
      isin: g.isin,
      net_quantity,
      weighted_avg_price,
    })
  }

  return positions
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient()

  // 1. Auth check
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse + validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RequestBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { holderId, filename, batchId, rows } = parsed.data

  // 3. Verify holderId belongs to this user's family (RLS enforces too, but 404 is cleaner)
  const { data: holderRaw } = await supabase
    .from('holders')
    .select('id, family_id')
    .eq('id', holderId)
    .single()

  if (!holderRaw) {
    return NextResponse.json({ error: 'Holder not found' }, { status: 404 })
  }

  // 4. Map rows to StockTransactionInsert shape
  const transactionRows = rows.map((row) =>
    mapToStockTransactionInsert(row as ValidatedRow, holderId, batchId, filename)
  )

  // 5. Upsert into stock_transactions (dedup by holder_id, trade_id, exchange, trade_date)
  // trade_id alone is not globally unique — exchanges assign IDs per-day so the same
  // numeric ID can appear across different years. Including exchange + trade_date ensures
  // independent annual tradebooks never collide with each other.
  const { error: txnError } = await (supabase as any)
    .from('stock_transactions')
    .upsert(transactionRows, {
      onConflict: 'holder_id,trade_id,exchange,trade_date',
      ignoreDuplicates: true,
    })

  if (txnError) {
    console.error('[import-tradebook] stock_transactions upsert error:', txnError)
    return NextResponse.json({ error: 'Failed to insert transactions' }, { status: 500 })
  }

  // Count newly inserted rows by batch_id — only rows from THIS import get this batchId.
  // Conflicting (already-existing) rows retain their original batch_id and are NOT counted.
  // This is more reliable than counting from RETURNING, which PostgREST may return as null
  // when ignoreDuplicates:true even if rows were successfully inserted.
  const { count: insertedCount, error: countError } = await (supabase as any)
    .from('stock_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('holder_id', holderId)
    .eq('batch_id', batchId)

  if (countError) {
    console.error('[import-tradebook] count query error:', countError)
    return NextResponse.json({ error: 'Failed to count inserted transactions' }, { status: 500 })
  }

  const inserted = insertedCount ?? 0
  const skipped = rows.length - inserted

  // 6. Fetch ALL historical transactions for this holder to recalculate positions
  // This ensures we aggregate across all previous imports + new import, avoiding duplicates via trade_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allStockTxns, error: txnFetchError } = await (supabase as any)
    .from('stock_transactions')
    .select('tradingsymbol, exchange, isin, trade_type, quantity, price, trade_id')
    .eq('holder_id', holderId)

  if (txnFetchError) {
    console.error('[import-tradebook] Failed to fetch all transactions for recalc:', txnFetchError)
    return NextResponse.json({ error: 'Failed to recalculate positions' }, { status: 500 })
  }

  // Aggregate ALL transactions to get correct net positions.
  // The DB constraint (holder_id, trade_id, exchange, trade_date) ensures no true duplicates
  // exist, so we can aggregate directly without an in-memory dedup step.
  const allTxnRows = (allStockTxns ?? []).map((t: any) => ({
    symbol: t.tradingsymbol,
    isin: t.isin,
    exchange: t.exchange,
    trade_type: t.trade_type,
    quantity: Number(t.quantity),
    price: Number(t.price),
  })) as ValidatedRow[]

  const aggregatedPositions = aggregatePositions(allTxnRows)

  // 7. Upsert into stock_holdings
  // Update existing holdings for this symbol or insert new ones
  const holdingsToUpsert = aggregatedPositions.map((pos) => ({
    holder_id: holderId,
    tradingsymbol: pos.tradingsymbol,
    exchange: pos.exchange,
    isin: pos.isin,
    quantity: pos.net_quantity,
    average_price: pos.weighted_avg_price,
    last_price: null,
    pnl: null,
    source: 'tradebook' as const,
    imported_at: new Date().toISOString(),
    batch_id: batchId,
    import_filename: filename,
  }))

  const { error: holdingsError } = await (supabase as any)
    .from('stock_holdings')
    .upsert(holdingsToUpsert, {
      onConflict: 'holder_id,tradingsymbol,exchange',
    })

  if (holdingsError) {
    console.error('[import-tradebook] stock_holdings upsert error:', holdingsError)
    return NextResponse.json({ error: 'Failed to update holdings' }, { status: 500 })
  }

  return NextResponse.json({
    imported: inserted,
    skipped,
    batched: batchId,
  })
}
