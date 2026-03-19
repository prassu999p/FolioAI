import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

const CreateHolderSchema = z.object({
  name: z.string().min(1).max(100),
  pan: z.string().regex(PAN_REGEX, 'Invalid PAN format'),
  is_primary: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateHolderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Get user's family
  const { data: familyData } = await supabase
    .from('families')
    .select('id')
    .eq('user_id', claims.sub)
    .single()
  const family = familyData as { id: string } | null
  if (!family) return NextResponse.json({ error: 'Family not found. Create a family first.' }, { status: 404 })

  // Check for duplicate PAN in this family
  const { data: existingHolder } = await supabase
    .from('holders')
    .select('id')
    .eq('family_id', family.id)
    .eq('pan', parsed.data.pan)
    .single()
  if (existingHolder) return NextResponse.json({ error: 'A holder with this PAN already exists in the family' }, { status: 409 })

  const insertData = {
    family_id: family.id as string,
    name: parsed.data.name,
    pan: parsed.data.pan,
    is_primary: parsed.data.is_primary,
    pan_unmatched: false,
  }
  const { data: holder, error } = await supabase
    .from('holders')
    .insert(insertData as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(holder, { status: 201 })
}

export async function GET(_request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: familyData } = await supabase
    .from('families')
    .select('id')
    .eq('user_id', claims.sub)
    .single()
  const family = familyData as { id: string } | null
  if (!family) return NextResponse.json([], { status: 200 })

  const { data: holders } = await supabase
    .from('holders')
    .select('*')
    .eq('family_id', family.id)

  return NextResponse.json(holders ?? [])
}
