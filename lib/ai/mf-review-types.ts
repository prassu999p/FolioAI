/**
 * Types for the MF Review feature.
 *
 * Claude analyses a mutual fund against the investor's profile using a
 * 10-step framework and returns a structured JSON matching MFReviewResult.
 * The UI renders a hardcoded 6-tab React widget from this data.
 */

export interface InvestorProfile {
  planType: 'Direct' | 'Regular'
  age: number
  goal: string
  horizon: number
  mode: string
  portfolio: string
  riskTolerance: string
  volatilityPreference: string
  taxSensitivity: string
  entryContext: string
}

export interface MFReviewResult {
  dataConfidence: {
    level: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW'
    liveMetricsCount: number
    sourcesUsed: string[]
  }
  overview: {
    fields: Array<{ label: string; value: string; source: string }>
    flags: Array<{ title: string; explanation: string }>
    officialBenchmark: string
    benchmarkSource: string
    investableIndexFund: string
  }
  metrics: {
    returnComparison: Array<{
      period: string          // "1 year" | "3 years" | "5 years" | "Since inception"
      fundReturn: string      // e.g. "14.2%" or "DATA UNAVAILABLE"
      benchmarkReturn: string
      categoryAverage: string
      alpha: string           // e.g. "+2.3%" or "-1.1%" or "DATA UNAVAILABLE"
    }>
    alphaTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'MIXED'
    indexFundComparison: Array<{
      period: string
      fundReturn: string
      indexFundReturn: string
      difference: string
    }>
    feeComparison: {
      fundER: string
      indexFundER: string
      gap: string
      adjustedSentence: string  // Step 3C: "After accounting for the higher annual fee..."
    }
    fundFacts: {
      aum: string
      aumTrend: 'growing' | 'stable' | 'declining'
      fundManager: string
      managerTenure: string
      expenseRatio: string
      inceptionYear: string
      ageYears: number
      beatBenchmarkYears: string  // e.g. "3 of last 5 years" or "DATA UNAVAILABLE"
      volatilityLabel: string     // plain language from Step 5
      riskAdjustedReturn: string  // "Above category average" | "Below category average"
    }
  }
  qualityChecks: Array<{
    checkNumber: number   // 1–10
    name: string
    result: 'PASS' | 'FAIL' | 'FLAG' | 'SKIP' | 'CONDITIONAL'
    isCritical: boolean
    explanation: string
  }>
  qualityScore: {
    percentage: number
    label: 'GOOD' | 'MODERATE' | 'BAD'
    passed: number
    failed: number
    flagged: number
    skipped: number
    criticalFailed: boolean
  }
  compatibility: Array<{
    code: string    // "7A" through "7H"
    name: string    // e.g. "Horizon"
    reason: string
    result: 'MATCH' | 'CONCERN' | 'MISMATCH'
  }>
  compatibilitySummary: {
    matchCount: number
    concernCount: number
    mismatchCount: number
    overall: 'STRONG' | 'MODERATE' | 'POOR'
  }
  verdict: {
    label:
      | 'INVEST'
      | 'INVEST WITH AWARENESS'
      | 'CONDITIONAL INVEST'
      | 'CONSIDER INDEX FUND INSTEAD'
      | 'NOT SUITABLE FOR YOU'
      | 'AVOID'
    coreSentence: string
    whatWorks: string[]
    whatToWatch: string[]
    indexFundAlternative?: string  // populated when label is CONSIDER INDEX FUND INSTEAD
    reviewTriggers: string[]
  }
  dataGaps: Array<{
    metricName: string
    impact: 'MATERIAL' | 'MINOR'
    explanation: string
    checkAt: string
  }>
}

/** Row shape returned from the mf_reviews Supabase table */
export interface MFReviewRecord {
  id: string
  holder_id: string
  scheme_code: number
  scheme_name: string
  investor_profile: InvestorProfile
  analysis_result: MFReviewResult
  verdict: string
  generated_at: string
}
