import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildChatContextForHolder } from '@/lib/ai/chat-context-service'
import { buildChatSystemPrompt } from '@/lib/ai/prompts'

export const runtime = 'nodejs'  // not edge — needs Supabase server client

const RequestSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string(), id: z.string().optional() })),
  holderId: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const authResult = await supabase.auth.getClaims()
  if (!authResult.data?.claims) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, holderId } = parsed.data

  // Build portfolio context if holderId provided
  let systemPrompt = 'You are FolioAI, a portfolio analysis assistant for Indian mutual fund investors. Answer accurately using only data you are given. Never fabricate numbers. Always add: "This is educational analysis, not SEBI-registered investment advice." when giving financial guidance.'

  if (holderId) {
    const ctx = await buildChatContextForHolder(holderId, supabase)
    if (ctx) {
      systemPrompt = buildChatSystemPrompt(ctx)
    }
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages: messages as any,
    maxOutputTokens: 1000,
  })

  return result.toTextStreamResponse()
}
