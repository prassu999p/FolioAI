import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const CreateGoalSchema = z.object({
  holderId: z.string().uuid(),
  name: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assumed_cagr: z.number().min(0).max(50).default(12),
  scheme_codes: z.array(z.number().int()).optional().default([]),
})

// POST /api/goals — Create a new goal and its goal_holdings records
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

  const parseResult = CreateGoalSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    )
  }

  const { holderId, name, target_amount, target_date, assumed_cagr, scheme_codes } = parseResult.data

  // Verify the holderId belongs to a family the user owns via RLS subquery chain
  const { data: holder } = await supabase
    .from('holders')
    .select('id')
    .eq('id', holderId)
    .maybeSingle()

  if (!holder) {
    return NextResponse.json({ error: 'Holder not found or access denied' }, { status: 401 })
  }

  // Insert into goals table
  const goalRow = { holder_id: holderId, name, target_amount, target_date, assumed_cagr }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goal, error: insertError } = await (supabase as any)
    .from('goals')
    .insert(goalRow)
    .select('id, holder_id, name, target_amount, target_date, assumed_cagr, created_at')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // If scheme_codes provided, insert goal_holdings records
  if (scheme_codes && scheme_codes.length > 0) {
    const goalHoldingRows = scheme_codes.map((code: number) => ({
      goal_id: (goal as { id: string }).id,
      scheme_code: code,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: holdingsError } = await (supabase as any)
      .from('goal_holdings')
      .insert(goalHoldingRows)

    if (holdingsError) {
      return NextResponse.json({ error: holdingsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ goal }, { status: 201 })
}
