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

  // 5. Upsert into stock_transactions (dedup by holder_id, trade_id)
  // ignoreDuplicates: true — re-importing same file skips already-imported rows
  const { data: insertedTxns, error: txnError } = await (supabase as any)
    .from('stock_transactions')
    .upsert(transactionRows, {
      onConflict: 'holder_id,trade_id',
      ignoreDuplicates: true,
    })
    .select('id')

  if (txnError) {
    console.error('[import-tradebook] stock_transactions upsert error:', txnError)
    return NextResponse.json({ error: 'Failed to insert transactions' }, { status: 500 })
  }

  const insertedCount = (insertedTxns ?? []).length
  const skipped = rows.length - insertedCount

  // 6. Aggregate net positions from the submitted rows
  const aggregatedPositions = aggregatePositions(rows as ValidatedRow[])

  // 7. Upsert into stock_holdings
  // CRITICAL: ignoreDuplicates: true means if a (holder_id, tradingsymbol, exchange)
  // row already exists (e.g. from Zerodha), we do NOT overwrite it.
  // Only net-new symbols are inserted. Zerodha rows (source='zerodha') are never clobbered.
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
      ignoreDuplicates: true, // existing Zerodha rows are NEVER updated
    })

  if (holdingsError) {
    console.error('[import-tradebook] stock_holdings upsert error:', holdingsError)
    return NextResponse.json({ error: 'Failed to update holdings' }, { status: 500 })
  }

  return NextResponse.json({
    imported: insertedCount,
    skipped,
    batched: batchId,
  })
}
