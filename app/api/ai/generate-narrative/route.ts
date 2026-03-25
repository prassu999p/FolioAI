import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateNarrativeForHolder } from '@/lib/ai/narrative-service'

const RequestSchema = z.object({ holderId: z.string().uuid() })

export async function POST(req: Request) {
  const supabase = await createClient()
  const authResult = await supabase.auth.getClaims()
  if (!authResult.data?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  try {
    const { narrative } = await generateNarrativeForHolder(parsed.data.holderId, supabase)
    return NextResponse.json({ narrative, holderId: parsed.data.holderId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
