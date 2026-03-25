import type { ScoringSignals, ChatContext } from './types'

/**
 * Format a number in Indian number system (₹ prefix, lakh/crore grouping).
 * e.g. 2500000 → "25,00,000"
 */
function formatIndianNumber(value: number): string {
  const isNegative = value < 0
  const abs = Math.abs(Math.round(value))
  const str = abs.toString()

  if (str.length <= 3) return (isNegative ? '-' : '') + str

  // Indian system: last 3 digits, then groups of 2
  const last3 = str.slice(-3)
  const remaining = str.slice(0, -3)
  const groups: string[] = []
  for (let i = remaining.length; i > 0; i -= 2) {
    groups.unshift(remaining.slice(Math.max(0, i - 2), i))
  }
  const formatted = groups.join(',') + ',' + last3
  return (isNegative ? '-' : '') + formatted
}

/**
 * Build the prompt for Claude to write fund scorecard narrative prose.
 * Claude receives the computed signals and writes 2-3 sentences only.
 */
export function buildScorecardPrompt(signals: ScoringSignals, qualityScore: number): string {
  const alphaPct = signals.alpha_pct !== null
    ? `${(signals.alpha_pct * 100).toFixed(2)}%`
    : 'insufficient data'

  const expenseRatio = signals.expense_ratio !== null
    ? `${signals.expense_ratio.toFixed(2)}%`
    : 'unavailable'

  return `You are a financial analyst writing a fund scorecard for Indian investors.

Fund: ${signals.fund_name}
Category: ${signals.category}
Quality Score: ${qualityScore}/100 (rule-based, do not mention this number in your output)
Alpha (vs Nifty 50): ${alphaPct}
Expense Ratio (TER): ${expenseRatio}
AUM Trend: ${signals.aum_trend}
Months of data available: ${signals.months_of_data}

Write a 2-3 sentence narrative assessment of this fund's quality for a long-term Indian investor. Your output must be descriptive prose only — do not output any numbers or percentages in your response. Focus on qualitative observations about performance consistency, cost efficiency, and fund health.

Important: End your response with a one-sentence SEBI disclaimer: "This is for informational purposes only and does not constitute investment advice as per SEBI regulations."`.trim()
}

/**
 * Build the prompt for Claude to generate a quarterly portfolio review narrative.
 * Covers: performing well, review for exit, sector concentration, health assessment, replacements.
 */
export function buildNarrativePrompt(
  context: ChatContext,
  scores: Array<{ scheme_name: string; quality_score: number; alpha_pct: number | null; narrative_text: string }>
): string {
  const totalAUMFormatted = `₹${formatIndianNumber(context.totalAUM)}`
  const xirrFormatted = context.xirr !== null
    ? `${(context.xirr * 100).toFixed(1)}%`
    : 'not available'

  const underperforming = scores.filter(
    s => s.alpha_pct !== null && s.alpha_pct < 0 || s.quality_score < 40
  )
  const performing = scores.filter(s => s.quality_score >= 60)

  const underperformingList = underperforming.length > 0
    ? underperforming.map(s => `- ${s.scheme_name} (quality score: ${s.quality_score}/100)`).join('\n')
    : 'None identified'

  const performingList = performing.length > 0
    ? performing.map(s => `- ${s.scheme_name} (quality score: ${s.quality_score}/100)`).join('\n')
    : 'None identified'

  const holdingsSummary = context.holdings
    .map(h => `- ${h.scheme_name} (${h.category}): ₹${formatIndianNumber(h.current_value ?? 0)}`)
    .join('\n')

  const sectorList = context.sectorExposure
    .map(s => `- ${s.sector}: ${s.pct.toFixed(1)}%`)
    .join('\n')

  return `You are FolioAI, a portfolio advisor for Indian long-term investors. Write a comprehensive quarterly portfolio review for ${context.holderName}.

## Portfolio Overview
- Holder: ${context.holderName}
- Total Portfolio Value: ${totalAUMFormatted}
- Portfolio XIRR (since inception): ${xirrFormatted}

## Holdings
${holdingsSummary}

## Sector Exposure
${sectorList}

## Funds Requiring Attention (alpha_pct < 0 or quality score < 40)
${underperformingList}

## Strong Performers (quality score >= 60)
${performingList}

---

Write a structured quarterly review with the following sections:
1. **What's performing well** — highlight funds with strong momentum
2. **Funds to review for exit** — discuss the underperforming funds listed above specifically
3. **Sector concentration notes** — identify concentration risks or gaps
4. **Overall health assessment** — holistic view of portfolio quality
5. **Suggested actions** — specific, actionable recommendations

Tone: Use a soft advisory tone throughout — write "you may wish to consider..." or "it may be worth reviewing..." rather than direct commands. Never be alarmist.

SEBI Compliance: End each section and the overall document with appropriate disclaimers. The final paragraph must include: "This analysis is provided for informational purposes only and does not constitute investment advice under SEBI (Investment Advisers) Regulations, 2013. Please consult a SEBI-registered investment adviser before making any investment decisions."`.trim()
}

/**
 * Build the system prompt for the chat widget.
 * Injects full portfolio context so Claude can answer questions accurately.
 * Never fabricate numbers — only use provided data.
 */
export function buildChatSystemPrompt(ctx: ChatContext): string {
  const totalAUMFormatted = `₹${formatIndianNumber(ctx.totalAUM)}`
  const xirrText = ctx.xirr !== null
    ? `${(ctx.xirr * 100).toFixed(1)}%`
    : 'not yet computed'

  const holdingsList = ctx.holdings
    .map(h => {
      const value = h.current_value !== null ? `₹${formatIndianNumber(h.current_value)}` : 'N/A'
      const xirr = h.xirr !== null ? ` | XIRR: ${(h.xirr * 100).toFixed(1)}%` : ''
      const ter = h.ter !== null ? ` | TER: ${h.ter.toFixed(2)}%` : ''
      return `  - ${h.scheme_name} (${h.category}): ${value}${xirr}${ter}`
    })
    .join('\n')

  const sectorList = ctx.sectorExposure
    .map(s => `  - ${s.sector}: ${s.pct.toFixed(1)}%`)
    .join('\n')

  const sipList = ctx.sips.length > 0
    ? ctx.sips.map(s => `  - ${s.fundName}: ₹${formatIndianNumber(s.amount)}/month`).join('\n')
    : '  None active'

  return `You are FolioAI, an AI-powered portfolio intelligence assistant for Indian long-term investors. You are helping ${ctx.holderName} of the ${ctx.familyName} family understand their mutual fund portfolio.

## Current Portfolio Data (as of today)

**Holder:** ${ctx.holderName}
**Total AUM:** ${totalAUMFormatted}
**Portfolio XIRR:** ${xirrText}

**Holdings:**
${holdingsList}

**Sector Exposure:**
${sectorList}

**Active SIPs:**
${sipList}

**LTCG Booked This Year:** ₹${formatIndianNumber(ctx.ltcg)}
**LTCG Exemption Used:** ₹${formatIndianNumber(ctx.ltcgExemptionUsed)} (₹1,00,000 annual limit)

## Instructions

1. Answer questions accurately using ONLY the portfolio data provided above. Never fabricate numbers, fund names, or performance figures not present in this context.
2. When discussing performance, always relate it to the investor's long-term goals and the Indian market context (Nifty 50, inflation).
3. Format all currency values in Indian number system (₹ with lakh/crore notation).
4. Use a clear, empathetic advisory tone — you are educating, not alarming.
5. Always remind the user that your responses are informational only, not personalized investment advice.

## SEBI Compliance

You must include this disclaimer when discussing specific investment recommendations or fund changes: "This information is for educational purposes only and does not constitute investment advice under SEBI (Investment Advisers) Regulations, 2013. Please consult a SEBI-registered investment adviser for personalized advice."`.trim()
}
