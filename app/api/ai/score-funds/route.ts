import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { scoreFundsForHolder } from '@/lib/ai/score-funds-service'

const RequestSchema = z.object({ holderId: z.string().uuid() })

export async function POST(req: Request) {
  const supabase = await createClient()

  // Auth check using getClaims() (does not revalidate JWT — consistent with project pattern)
  const result = await supabase.auth.getClaims()
  if (!result.data?.claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scored = await scoreFundsForHolder(parsed.data.holderId, supabase as any)
  return NextResponse.json({ scored, holderId: parsed.data.holderId })
}
