import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateRebalanceStrategy } from '@/lib/ai/rebalance-service'

const RequestSchema = z.object({ familyId: z.string().uuid() })

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
    const { strategy } = await generateRebalanceStrategy(parsed.data.familyId, supabase)
    return NextResponse.json({
      strategy,
      generated_at: new Date().toISOString(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
