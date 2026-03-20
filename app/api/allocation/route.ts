import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AllocationTargetSchema } from '@/lib/analytics/asset-class-mapper'

// GET /api/allocation?holderId=X
export async function GET(request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const holderId = searchParams.get('holderId')
  if (!holderId) return NextResponse.json({ error: 'holderId required' }, { status: 400 })

  // Verify holder belongs to this user's family (RLS + belt-and-suspenders)
  const { data: holder } = await supabase
    .from('holders')
    .select('id, family_id')
    .eq('id', holderId)
    .single()
  if (!holder) return NextResponse.json({ error: 'Holder not found or access denied' }, { status: 403 })

  // Fetch allocation targets for this holder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allocation } = await (supabase as any)
    .from('holder_allocation_targets')
    .select('equity, debt, gold, international')
    .eq('holder_id', holderId)
    .maybeSingle()

  if (!allocation) {
    // No targets set yet — return zero defaults
    return NextResponse.json({ equity: 0, debt: 0, gold: 0, international: 0 })
  }

  return NextResponse.json({
    equity: allocation.equity,
    debt: allocation.debt,
    gold: allocation.gold,
    international: allocation.international,
  })
}

// POST /api/allocation
// Body: { holderId: string, equity: number, debt: number, gold: number, international: number }
export async function POST(request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Extract holderId separately (not part of AllocationTargetSchema)
  const { holderId, ...allocationFields } = body as { holderId?: string; equity?: number; debt?: number; gold?: number; international?: number }
  if (!holderId) return NextResponse.json({ error: 'holderId required' }, { status: 400 })

  // Validate allocation fields with Zod (sum ≤ 100)
  const parseResult = AllocationTargetSchema.safeParse(allocationFields)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    )
  }

  const { equity, debt, gold, international } = parseResult.data

  // Verify holder belongs to this user's family via RLS (holders table is RLS-protected)
  const { data: holder } = await supabase
    .from('holders')
    .select('id, family_id')
    .eq('id', holderId)
    .single()
  if (!holder) return NextResponse.json({ error: 'Holder not found or access denied' }, { status: 403 })

  // Upsert allocation targets — ON CONFLICT (holder_id) DO UPDATE
  const allocationRow = { holder_id: holderId, equity, debt, gold, international }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved, error: upsertError } = await (supabase as any)
    .from('holder_allocation_targets')
    .upsert(allocationRow, { onConflict: 'holder_id' })
    .select('equity, debt, gold, international')
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json(saved)
}
