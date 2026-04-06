/**
 * POST /api/ai/mf-review
 *
 * Runs a structured 10-step mutual fund analysis using Claude and returns a
 * MFReviewResult JSON object. Results are cached in the mf_reviews table
 * (one record per holder+fund, upserted on re-run).
 */

import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAIModel } from '@/lib/ai/provider'
import { buildMFReviewPrompt } from '@/lib/ai/mf-review-prompt'
import type { MFReviewResult } from '@/lib/ai/mf-review-types'

export const runtime = 'nodejs'

// GET /api/ai/mf-review?holderId=...&schemeCode=...
// Returns the cached review if one exists, without running AI.
export async function GET(req: Request) {
  const supabase = await createClient()
  const authResult = await supabase.auth.getClaims()
  if (!authResult.data?.claims) {
    return jsonError('Unauthorized', 401)
  }

  const url = new URL(req.url)
  const holderId = url.searchParams.get('holderId')
  const schemeCodeStr = url.searchParams.get('schemeCode')
  if (!holderId || !schemeCodeStr) {
    return jsonError('Missing holderId or schemeCode', 400)
  }
  const schemeCode = parseInt(schemeCodeStr, 10)
  if (isNaN(schemeCode)) {
    return jsonError('Invalid schemeCode', 400)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('mf_reviews')
    .select('analysis_result, verdict, generated_at')
    .eq('holder_id', holderId)
    .eq('scheme_code', schemeCode)
    .single() as { data: { analysis_result: MFReviewResult; verdict: string; generated_at: string } | null }

  if (!data) {
    return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      exists: true,
      result: data.analysis_result,
      verdict: data.verdict,
      generatedAt: data.generated_at,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

const InvestorProfileSchema = z.object({
  planType: z.enum(['Direct', 'Regular']),
  age: z.number().int().min(1).max(120),
  goal: z.string().min(1),
  horizon: z.number().int().min(1).max(50),
  mode: z.string().min(1),
  portfolio: z.string().min(1),
  riskTolerance: z.string().min(1),
  volatilityPreference: z.string().min(1),
  taxSensitivity: z.string().min(1),
  entryContext: z.string().min(1),
})

const RequestSchema = z.object({
  holderId: z.string().uuid(),
  schemeCode: z.number().int(),
  schemeName: z.string().min(1),
  fundHouse: z.string().min(1),
  category: z.string(),
  investorProfile: InvestorProfileSchema,
  forceRefresh: z.boolean().optional().default(false),
})

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // Auth
  const authResult = await supabase.auth.getClaims()
  if (!authResult.data?.claims) {
    return jsonError('Unauthorized', 401)
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(JSON.stringify(parsed.error.flatten()), 400)
  }

  const { holderId, schemeCode, schemeName, fundHouse, category, investorProfile, forceRefresh } =
    parsed.data

  // Return cached result if available and not forcing a refresh
  if (!forceRefresh) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cached } = await (supabase as any)
      .from('mf_reviews')
      .select('analysis_result, verdict, generated_at')
      .eq('holder_id', holderId)
      .eq('scheme_code', schemeCode)
      .single() as { data: { analysis_result: MFReviewResult; verdict: string; generated_at: string } | null }

    if (cached) {
      return new Response(
        JSON.stringify({
          result: cached.analysis_result,
          verdict: cached.verdict,
          generatedAt: cached.generated_at,
          cached: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Build prompt and call Claude
  const prompt = buildMFReviewPrompt(
    { name: schemeName, fundHouse, category },
    investorProfile
  )

  let rawText: string
  try {
    const { text } = await generateText({
      model: getAIModel(),
      prompt,
      maxOutputTokens: 4096,
    })
    rawText = text
  } catch (err) {
    console.error('[mf-review] generateText error:', err)
    return jsonError('AI generation failed. Please try again.', 502)
  }

  // Parse JSON response from Claude
  let analysisResult: MFReviewResult
  try {
    // Claude may occasionally wrap in ```json ... ``` fences despite instructions — strip them
    const clean = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
    analysisResult = JSON.parse(clean) as MFReviewResult
  } catch (err) {
    console.error('[mf-review] JSON parse error. Raw text:', rawText, err)
    return jsonError('AI returned malformed response. Please try again.', 502)
  }

  const verdictLabel = analysisResult.verdict?.label ?? 'DATA UNAVAILABLE'

  // Upsert into mf_reviews (one record per holder+fund)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from('mf_reviews')
    .upsert(
      {
        holder_id: holderId,
        scheme_code: schemeCode,
        scheme_name: schemeName,
        investor_profile: investorProfile,
        analysis_result: analysisResult,
        verdict: verdictLabel,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'holder_id,scheme_code' }
    )

  if (upsertError) {
    // Log but don't fail — still return the result to the user
    console.error('[mf-review] upsert error:', upsertError)
  }

  return new Response(
    JSON.stringify({
      result: analysisResult,
      verdict: verdictLabel,
      generatedAt: new Date().toISOString(),
      cached: false,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
