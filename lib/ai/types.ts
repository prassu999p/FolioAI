import type { AnalyticsTransaction } from '@/lib/supabase/types'

export interface ScoringSignals {
  scheme_code: number
  fund_name: string
  category: string
  alpha_pct: number | null          // fund XIRR - nifty XIRR (decimal, e.g. 0.042 = +4.2%)
  expense_ratio: number | null      // TER as percentage, e.g. 1.5
  aum_trend: 'growing' | 'stable' | 'declining' | 'insufficient_data'
  months_of_data: number            // how many months of NAV history available
}

export interface FundScore {
  holder_id: string
  scheme_code: number
  quality_score: number             // 0-100, rule-based (Claude does NOT produce this)
  alpha_pct: number | null
  expense_ratio: number | null
  aum_trend: ScoringSignals['aum_trend']
  narrative_text: string            // Claude-generated prose
  generated_at: string
}

export interface NarrativeCache {
  holder_id: string
  narrative: string                 // Claude-generated quarterly review
  generated_at: string
}

export interface ChatContext {
  familyId: string
  familyName: string
  holderName: string
  holderId: string
  totalAUM: number
  xirr: number | null
  holdings: Array<{
    scheme_name: string
    category: string
    units: number
    current_value: number | null
    xirr: number | null
    ter: number | null
  }>
  sectorExposure: Array<{ sector: string; pct: number }>
  sips: Array<{ fundName: string; amount: number }>
  ltcg: number
  ltcgExemptionUsed: number
}

export interface AlphaInput {
  transactions: AnalyticsTransaction[]
  currentValue: number
  nifty50Daily: Array<{ date: string; close: number }>
}
