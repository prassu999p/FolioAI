import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { HoldingRow } from '@/lib/supabase/types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const holderId = searchParams.get('holderId')
  if (!holderId) return NextResponse.json({ error: 'holderId required' }, { status: 400 })

  // Verify holder belongs to this user's family (belt+suspenders on top of RLS)
  const { data: holder } = await supabase
    .from('holders')
    .select('id, family_id')
    .eq('id', holderId)
    .single()
  if (!holder) return NextResponse.json({ error: 'Holder not found' }, { status: 404 })

  // Aggregate transactions by scheme_code via Postgres function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: holdings, error } = await (supabase as any)
    .rpc('get_holder_holdings', { p_holder_id: holderId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((holdings ?? []) as HoldingRow[])
}
