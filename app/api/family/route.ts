import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Family } from '@/lib/supabase/types'

const CreateFamilySchema = z.object({
  name: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateFamilySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  // One family per user
  const { data: existing } = await supabase
    .from('families')
    .select('id')
    .eq('user_id', claims.sub)
    .single()
  if (existing) return NextResponse.json({ error: 'Family already exists' }, { status: 409 })

  const insertData = { user_id: claims.sub as string, name: parsed.data.name }
  const { data: family, error } = await supabase
    .from('families')
    .insert(insertData as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(family, { status: 201 })
}

export async function GET(_request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: family } = await supabase
    .from('families')
    .select('*, holders(id, name, pan, is_primary)')
    .eq('user_id', claims.sub)
    .single()

  return NextResponse.json((family as Family | null) ?? null)
}
