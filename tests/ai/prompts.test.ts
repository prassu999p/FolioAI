import { describe, it, expect } from 'vitest'
import { buildScorecardPrompt, buildNarrativePrompt, buildChatSystemPrompt } from '@/lib/ai/prompts'
import type { ScoringSignals, ChatContext } from '@/lib/ai/types'

const mockSignals: ScoringSignals = {
  scheme_code: 120503,
  fund_name: 'Mirae Asset Large Cap Fund',
  category: 'Equity - Large Cap',
  alpha_pct: 0.042,
  expense_ratio: 0.54,
  aum_trend: 'growing',
  months_of_data: 36,
}

const mockContext: ChatContext = {
  familyId: 'fam-001',
  familyName: 'Sharma Family',
  holderName: 'Rajesh Sharma',
  holderId: 'holder-001',
  totalAUM: 2500000,
  xirr: 0.142,
  holdings: [
    {
      scheme_name: 'Mirae Asset Large Cap Fund',
      category: 'Equity - Large Cap',
      units: 500,
      current_value: 150000,
      xirr: 0.18,
      ter: 0.54,
    },
    {
      scheme_name: 'Axis Midcap Fund',
      category: 'Equity - Mid Cap',
      units: 300,
      current_value: 90000,
      xirr: -0.02,
      ter: 1.2,
    },
  ],
  sectorExposure: [
    { sector: 'Financial Services', pct: 32 },
    { sector: 'IT', pct: 18 },
  ],
  sips: [
    { fundName: 'Mirae Asset Large Cap Fund', amount: 10000 },
    { fundName: 'Axis Midcap Fund', amount: 5000 },
  ],
  ltcg: 45000,
  ltcgExemptionUsed: 125000,
}

const mockScores = [
  { scheme_name: 'Mirae Asset Large Cap Fund', quality_score: 82, alpha_pct: 0.042, narrative_text: '' },
  { scheme_name: 'Axis Midcap Fund', quality_score: 28, alpha_pct: -0.025, narrative_text: '' },
]

describe('buildScorecardPrompt', () => {
  it('returns non-empty string of >= 100 chars for valid signals', () => {
    const result = buildScorecardPrompt(mockSignals, 82)
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThanOrEqual(100)
  })

  it('includes fund name in prompt output', () => {
    const result = buildScorecardPrompt(mockSignals, 82)
    expect(result).toContain('Mirae Asset Large Cap Fund')
  })

  it('includes quality score in prompt output', () => {
    const result = buildScorecardPrompt(mockSignals, 82)
    expect(result).toContain('82')
  })

  it('instructs Claude not to output numbers — text only', () => {
    const result = buildScorecardPrompt(mockSignals, 82).toLowerCase()
    const hasConstraint = result.includes('do not output') || result.includes('only write') || result.includes('no numbers') || result.includes('do not include any numbers')
    expect(hasConstraint).toBe(true)
  })

  it('includes SEBI disclaimer instruction', () => {
    const result = buildScorecardPrompt(mockSignals, 82)
    expect(result).toContain('SEBI')
  })
})

describe('buildNarrativePrompt', () => {
  it('returns non-empty string of >= 500 chars for valid context and scores', () => {
    const result = buildNarrativePrompt(mockContext, mockScores)
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThanOrEqual(500)
  })

  it('includes underperforming funds in prompt when alpha < 0', () => {
    const result = buildNarrativePrompt(mockContext, mockScores)
    // Axis Midcap Fund has alpha_pct < 0, should appear in prompt
    expect(result).toContain('Axis Midcap Fund')
  })

  it('includes holderName from context', () => {
    const result = buildNarrativePrompt(mockContext, mockScores)
    expect(result).toContain('Rajesh Sharma')
  })

  it('mentions total AUM formatted with ₹', () => {
    const result = buildNarrativePrompt(mockContext, mockScores)
    expect(result).toContain('₹')
  })

  it('includes SEBI advisory disclaimer instruction in prompt', () => {
    const result = buildNarrativePrompt(mockContext, mockScores)
    expect(result).toContain('SEBI')
  })

  it('specifies soft advisory tone (may wish to consider...)', () => {
    const result = buildNarrativePrompt(mockContext, mockScores).toLowerCase()
    const hasSoftTone = result.includes('may wish to consider') || result.includes('soft advisory') || result.includes('advisory tone')
    expect(hasSoftTone).toBe(true)
  })
})

describe('buildChatSystemPrompt', () => {
  it('returns non-empty string of >= 300 chars for valid ChatContext', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThanOrEqual(300)
  })

  it('includes total AUM formatted in ₹', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('₹')
    expect(result).toContain('25,00,000') // Indian number format for 2500000
  })

  it('includes XIRR when available', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('14.2') // 0.142 * 100 = 14.2%
  })

  it('includes holding names and categories', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('Mirae Asset Large Cap Fund')
    expect(result).toContain('Axis Midcap Fund')
    expect(result).toContain('Equity - Large Cap')
  })

  it('includes sectorExposure entries', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('Financial Services')
    expect(result).toContain('IT')
  })

  it('includes active SIPs', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('10,000') // SIP amount
  })

  it('includes SEBI disclaimer instruction', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('SEBI')
  })

  it('includes FolioAI framing', () => {
    const result = buildChatSystemPrompt(mockContext)
    expect(result).toContain('FolioAI')
  })

  it('includes never fabricate instruction', () => {
    const result = buildChatSystemPrompt(mockContext).toLowerCase()
    const hasFabricateRule = result.includes('never fabricate') || result.includes('do not fabricate') || result.includes('only use provided')
    expect(hasFabricateRule).toBe(true)
  })
})
