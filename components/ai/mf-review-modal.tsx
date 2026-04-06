'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { HoldingRowWithAnalytics } from '@/lib/supabase/types'
import type { MFReviewResult, InvestorProfile } from '@/lib/ai/mf-review-types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MFReviewModalProps {
  holding: HoldingRowWithAnalytics
  category?: string
  children: React.ReactNode
}

type ModalState = 'form' | 'loading' | 'result'

interface ReviewResponse {
  result: MFReviewResult
  verdict: string
  generatedAt: string
  cached: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LOADING_STAGES = [
  'Identifying benchmark…',
  'Fetching historical returns…',
  'Running quality checks…',
  'Evaluating investor compatibility…',
  'Generating verdict…',
]

const VERDICT_COLORS: Record<string, string> = {
  'INVEST': 'border-[#006d43] bg-[#f0faf5]',
  'INVEST WITH AWARENESS': 'border-[#006d43] bg-[#f0faf5]',
  'CONDITIONAL INVEST': 'border-[#d97706] bg-[#fffbeb]',
  'CONSIDER INDEX FUND INSTEAD': 'border-[#d97706] bg-[#fffbeb]',
  'NOT SUITABLE FOR YOU': 'border-[#dc2626] bg-[#fff5f5]',
  'AVOID': 'border-[#dc2626] bg-[#fff5f5]',
}

const VERDICT_TEXT_COLORS: Record<string, string> = {
  'INVEST': 'text-[#006d43]',
  'INVEST WITH AWARENESS': 'text-[#006d43]',
  'CONDITIONAL INVEST': 'text-[#92400e]',
  'CONSIDER INDEX FUND INSTEAD': 'text-[#92400e]',
  'NOT SUITABLE FOR YOU': 'text-[#991b1b]',
  'AVOID': 'text-[#991b1b]',
}

const RESULT_BADGE: Record<string, string> = {
  PASS: 'bg-[#dcfce7] text-[#166534]',
  FAIL: 'bg-[#fee2e2] text-[#991b1b]',
  FLAG: 'bg-[#fef3c7] text-[#92400e]',
  SKIP: 'bg-[#f3f4f6] text-[#374151]',
  CONDITIONAL: 'bg-[#dbeafe] text-[#1e40af]',
}

const COMPAT_BADGE: Record<string, string> = {
  MATCH: 'bg-[#dcfce7] text-[#166534]',
  CONCERN: 'bg-[#fef3c7] text-[#92400e]',
  MISMATCH: 'bg-[#fee2e2] text-[#991b1b]',
}

const QUALITY_BADGE: Record<string, string> = {
  GOOD: 'bg-[#dcfce7] text-[#166534]',
  MODERATE: 'bg-[#fef3c7] text-[#92400e]',
  BAD: 'bg-[#fee2e2] text-[#991b1b]',
}

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: 'bg-[#dcfce7] text-[#166534]',
  MODERATE: 'bg-[#dcfce7] text-[#166534]',
  LOW: 'bg-[#fef3c7] text-[#92400e]',
  'VERY LOW': 'bg-[#fee2e2] text-[#991b1b]',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string
  name: string
  options: string[]
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">{label}</p>
      <div className="flex flex-col gap-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="mt-0.5 accent-primary"
            />
            <span className={`text-xs leading-relaxed ${value === opt ? 'text-primary font-medium' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function AlphaCell({ value }: { value: string }) {
  if (value === 'DATA UNAVAILABLE' || !value) {
    return <span className="text-on-surface-variant text-xs">—</span>
  }
  const isPositive = value.startsWith('+') || (!value.startsWith('-') && !value.startsWith('D'))
  const isNegative = value.startsWith('-')
  return (
    <span className={`tabular-nums font-medium text-xs ${isPositive ? 'text-[#166534]' : isNegative ? 'text-[#991b1b]' : 'text-on-surface-variant'}`}>
      {value}
    </span>
  )
}

// ─── Tab components ───────────────────────────────────────────────────────────

function OverviewTab({ result }: { result: MFReviewResult }) {
  return (
    <div className="space-y-4">
      {/* Benchmark highlight */}
      <div className="p-3 bg-surface-container-low rounded-xl text-xs">
        <span className="text-on-surface-variant">Official Benchmark: </span>
        <span className="font-medium text-primary">{result.overview.officialBenchmark || '—'}</span>
        {result.overview.benchmarkSource && (
          <span className="text-on-surface-variant"> · Source: {result.overview.benchmarkSource}</span>
        )}
        {result.overview.investableIndexFund && (
          <>
            <span className="text-on-surface-variant mx-2">|</span>
            <span className="text-on-surface-variant">Comparison Index Fund: </span>
            <span className="font-medium text-primary">{result.overview.investableIndexFund}</span>
          </>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2">
        {result.overview.fields.map((field) => (
          <div key={field.label} className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
            <p className="text-xs text-on-surface-variant mb-0.5">{field.label}</p>
            <p className="text-xs font-medium text-primary">{field.value || '—'}</p>
            {field.source && field.source !== 'N/A' && (
              <p className="text-[10px] text-on-surface-variant/70 mt-0.5">{field.source}</p>
            )}
          </div>
        ))}
      </div>

      {/* Flags */}
      {result.overview.flags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Flags</p>
          {result.overview.flags.map((flag, i) => (
            <div key={i} className="pl-3 border-l-2 border-[#d97706] bg-[#fffbeb] rounded-r-lg p-3">
              <p className="text-xs font-medium text-[#92400e]">{flag.title}</p>
              <p className="text-xs text-[#92400e]/80 mt-1">{flag.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VerdictTab({ result }: { result: MFReviewResult }) {
  const label = result.verdict.label
  const cardClass = VERDICT_COLORS[label] ?? 'border-gray-300 bg-gray-50'
  const textClass = VERDICT_TEXT_COLORS[label] ?? 'text-gray-800'

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      <div className={`border-2 rounded-2xl p-5 ${cardClass}`}>
        <p className={`text-base font-medium ${textClass}`}>{label}</p>
        <p className="text-xs text-on-surface mt-2 leading-relaxed">{result.verdict.coreSentence}</p>

        {result.verdict.indexFundAlternative && (
          <div className="mt-3 p-2 bg-[#fffbeb] rounded-lg border border-[#fcd34d]">
            <p className="text-xs text-[#92400e]">
              <span className="font-medium">Specific fund to consider: </span>
              {result.verdict.indexFundAlternative}
            </p>
          </div>
        )}
      </div>

      {/* What works */}
      {result.verdict.whatWorks?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase font-medium text-on-surface-variant tracking-widest mb-2">
            What Works For You
          </p>
          <ul className="space-y-1.5">
            {result.verdict.whatWorks.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#166534] text-sm mt-0.5 shrink-0">check_circle</span>
                <span className="text-xs text-on-surface leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What to watch */}
      {result.verdict.whatToWatch?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase font-medium text-on-surface-variant tracking-widest mb-2">
            What To Watch
          </p>
          <ul className="space-y-1.5">
            {result.verdict.whatToWatch.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#d97706] text-sm mt-0.5 shrink-0">warning</span>
                <span className="text-xs text-on-surface leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review triggers */}
      {result.verdict.reviewTriggers?.length > 0 && (
        <div className="bg-surface-container-low rounded-xl p-4">
          <p className="text-[10px] uppercase font-medium text-on-surface-variant tracking-widest mb-2">
            Review This Again If
          </p>
          <ul className="space-y-1">
            {result.verdict.reviewTriggers.map((trigger, i) => (
              <li key={i} className="text-xs text-on-surface-variant flex items-start gap-1.5">
                <span className="mt-1 shrink-0">·</span>
                {trigger}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function MetricsTab({ result }: { result: MFReviewResult }) {
  const m = result.metrics
  return (
    <div className="space-y-5">
      {/* Return comparison */}
      <div>
        <p className="text-[10px] uppercase font-medium text-on-surface-variant tracking-widest mb-2">
          Returns vs Benchmark & Category
        </p>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="py-2 px-3 text-left font-medium text-on-surface-variant">Period</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">This Fund</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">Benchmark</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">Category Avg</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">Alpha</th>
              </tr>
            </thead>
            <tbody>
              {m.returnComparison.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-surface-container-low/30' : ''}>
                  <td className="py-2 px-3 text-on-surface">{row.period}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-on-surface">{row.fundReturn}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-on-surface-variant">{row.benchmarkReturn}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-on-surface-variant">{row.categoryAverage}</td>
                  <td className="py-2 px-3 text-right"><AlphaCell value={row.alpha} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-on-surface-variant mt-2">
          Alpha trend: <span className="font-medium text-on-surface">{m.alphaTrend}</span>
        </p>
      </div>

      {/* Index fund comparison */}
      <div>
        <p className="text-[10px] uppercase font-medium text-on-surface-variant tracking-widest mb-2">
          vs Investable Index Fund
        </p>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="py-2 px-3 text-left font-medium text-on-surface-variant">Period</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">This Fund</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">Index Fund</th>
                <th className="py-2 px-3 text-right font-medium text-on-surface-variant">Difference</th>
              </tr>
            </thead>
            <tbody>
              {m.indexFundComparison.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-surface-container-low/30' : ''}>
                  <td className="py-2 px-3 text-on-surface">{row.period}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-on-surface">{row.fundReturn}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-on-surface-variant">{row.indexFundReturn}</td>
                  <td className="py-2 px-3 text-right"><AlphaCell value={row.difference} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {m.feeComparison && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-on-surface-variant">
              Fee — This fund: <span className="font-medium text-on-surface">{m.feeComparison.fundER}</span>
              <span className="mx-1">·</span>
              Index fund: <span className="font-medium text-on-surface">{m.feeComparison.indexFundER}</span>
              <span className="mx-1">·</span>
              Gap: <span className="font-medium text-[#991b1b]">{m.feeComparison.gap}</span>
            </p>
            <p className="text-xs text-on-surface-variant italic">{m.feeComparison.adjustedSentence}</p>
          </div>
        )}
      </div>

      {/* Fund facts grid */}
      <div>
        <p className="text-[10px] uppercase font-medium text-on-surface-variant tracking-widest mb-2">
          Fund Facts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['AUM', `${m.fundFacts.aum} (${m.fundFacts.aumTrend})`],
            ['Fund Manager', `${m.fundFacts.fundManager} · ${m.fundFacts.managerTenure}`],
            ['Expense Ratio', m.fundFacts.expenseRatio],
            ['Inception', `${m.fundFacts.inceptionYear} (${m.fundFacts.ageYears} yrs)`],
            ['Beat Benchmark', m.fundFacts.beatBenchmarkYears],
            ['Volatility', m.fundFacts.volatilityLabel],
            ['Risk-Adjusted Return', m.fundFacts.riskAdjustedReturn],
            ['Alpha Trend', result.metrics.alphaTrend],
          ].map(([label, value]) => (
            <div key={label} className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
              <p className="text-[10px] text-on-surface-variant mb-0.5">{label}</p>
              <p className="text-xs font-medium text-primary leading-snug">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QualityChecksTab({ result }: { result: MFReviewResult }) {
  const s = result.qualityScore
  return (
    <div className="space-y-3">
      {result.qualityChecks.map((check) => (
        <div key={check.checkNumber} className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${RESULT_BADGE[check.result] ?? 'bg-gray-100 text-gray-700'}`}>
            {check.result}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-on-surface">
                {check.checkNumber}. {check.name}
              </p>
              {check.isCritical && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] uppercase tracking-wide">
                  critical
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{check.explanation}</p>
          </div>
        </div>
      ))}

      {/* Score summary */}
      <div className="bg-surface-container-low rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-on-surface-variant space-x-2">
            <span>Passed: <span className="font-medium text-on-surface">{s.passed}</span></span>
            <span>·</span>
            <span>Failed: <span className="font-medium text-on-surface">{s.failed}</span></span>
            <span>·</span>
            <span>Flagged: <span className="font-medium text-on-surface">{s.flagged}</span></span>
            <span>·</span>
            <span>Skipped: <span className="font-medium text-on-surface">{s.skipped}</span></span>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${QUALITY_BADGE[s.label] ?? 'bg-gray-100 text-gray-700'}`}>
            {s.label} ({s.percentage.toFixed(0)}%)
          </span>
        </div>
        {s.criticalFailed && (
          <p className="text-xs text-[#991b1b] mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">warning</span>
            One or more critical checks failed.
          </p>
        )}
      </div>
    </div>
  )
}

function CompatibilityTab({ result }: { result: MFReviewResult }) {
  const s = result.compatibilitySummary
  const overallColors = { STRONG: 'bg-[#dcfce7] text-[#166534]', MODERATE: 'bg-[#fef3c7] text-[#92400e]', POOR: 'bg-[#fee2e2] text-[#991b1b]' }

  return (
    <div className="space-y-3">
      {result.compatibility.map((check) => (
        <div key={check.code} className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
          <div className="shrink-0">
            <p className="text-[10px] text-on-surface-variant">{check.code}</p>
            <p className="text-xs font-medium text-on-surface">{check.name}</p>
          </div>
          <p className="flex-1 text-xs text-on-surface-variant leading-relaxed">{check.reason}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${COMPAT_BADGE[check.result] ?? 'bg-gray-100 text-gray-700'}`}>
            {check.result}
          </span>
        </div>
      ))}

      {/* Compatibility summary */}
      <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-on-surface-variant">
          <span className="text-[#166534] font-medium">{s.matchCount} Match</span>
          {' · '}
          <span className="text-[#92400e] font-medium">{s.concernCount} Concern</span>
          {' · '}
          <span className="text-[#991b1b] font-medium">{s.mismatchCount} Mismatch</span>
        </p>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${overallColors[s.overall] ?? 'bg-gray-100 text-gray-700'}`}>
          {s.overall}
        </span>
      </div>
    </div>
  )
}

function DataGapsTab({ result }: { result: MFReviewResult }) {
  if (!result.dataGaps || result.dataGaps.length === 0) {
    return (
      <div className="bg-[#dcfce7] rounded-xl p-4 text-sm text-[#166534] flex items-center gap-2">
        <span className="material-symbols-outlined text-base">check_circle</span>
        All key metrics were successfully retrieved for this analysis.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {result.dataGaps.map((gap, i) => (
        <div key={i} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-medium text-on-surface">{gap.metricName}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${gap.impact === 'MATERIAL' ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#f3f4f6] text-[#374151]'}`}>
              {gap.impact}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">{gap.explanation}</p>
          {gap.checkAt && (
            <p className="text-xs text-[#166534] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              {gap.checkAt}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Result Widget ────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Verdict', 'Metrics', 'Quality Checks', 'Compatibility', 'Data Gaps'] as const
type TabName = typeof TABS[number]

function ResultWidget({
  result,
  generatedAt,
  cached,
  onRerun,
  isRerunning,
}: {
  result: MFReviewResult
  generatedAt: string
  cached: boolean
  onRerun: () => void
  isRerunning: boolean
}) {
  const [activeTab, setActiveTab] = useState<TabName>('Verdict')
  const conf = result.dataConfidence
  const confStyle = CONFIDENCE_STYLES[conf.level] ?? 'bg-gray-100 text-gray-700'

  return (
    <div className="flex flex-col h-full">
      {/* Data confidence bar */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 text-xs ${confStyle}`}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">verified</span>
          <span className="font-medium">Data Confidence: {conf.level}</span>
          <span className="opacity-70">· {conf.liveMetricsCount} metrics retrieved</span>
        </div>
        <div className="flex items-center gap-3">
          {cached && (
            <span className="opacity-70">
              Analysis from {new Date(generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          <button
            onClick={onRerun}
            disabled={isRerunning}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            {isRerunning ? 'Re-running…' : 'Re-run'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-outline-variant/30 pb-0 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-primary text-on-primary font-medium'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Overview' && <OverviewTab result={result} />}
        {activeTab === 'Verdict' && <VerdictTab result={result} />}
        {activeTab === 'Metrics' && <MetricsTab result={result} />}
        {activeTab === 'Quality Checks' && <QualityChecksTab result={result} />}
        {activeTab === 'Compatibility' && <CompatibilityTab result={result} />}
        {activeTab === 'Data Gaps' && <DataGapsTab result={result} />}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-on-surface-variant/60 mt-3 pt-3 border-t border-outline-variant/20">
        This analysis is for educational and screening purposes only. It does not constitute SEBI-registered investment advice. Past performance is not a guarantee of future returns.
      </p>
    </div>
  )
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingState({ stage }: { stage: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-6">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-primary animate-pulse">{stage}</p>
        <p className="text-xs text-on-surface-variant">This may take 20–40 seconds</p>
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const defaultProfile: InvestorProfile = {
  planType: 'Direct',
  age: 30,
  goal: 'Wealth creation (no specific target)',
  horizon: 10,
  mode: 'SIP only',
  portfolio: 'Yes — I have a diversified portfolio of multiple funds or assets',
  riskTolerance: 'Medium — I can accept moderate losses for moderate long-term gains',
  volatilityPreference: 'Medium — I can handle occasional sharp dips as long as the long-term trend is up',
  taxSensitivity: 'I am in the 30% income tax bracket — tax efficiency matters a lot',
  entryContext: 'First-time entry — considering buying',
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function MFReviewModal({ holding, category, children }: MFReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<ModalState>('form')
  const [isRerunning, setIsRerunning] = useState(false)
  const [profile, setProfile] = useState<InvestorProfile>(defaultProfile)
  const [customFundName, setCustomFundName] = useState(holding.scheme_name)
  const [loadingStageIdx, setLoadingStageIdx] = useState(0)
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = <K extends keyof InvestorProfile>(key: K, value: InvestorProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const runAnalysis = useCallback(async (forceRefresh = false) => {
    setError(null)
    if (forceRefresh && reviewData) {
      setIsRerunning(true)
    } else {
      setState('loading')
    }
    setLoadingStageIdx(0)

    // Cycle through loading stage labels every 6 seconds
    const interval = setInterval(() => {
      setLoadingStageIdx((prev) => (prev + 1) % LOADING_STAGES.length)
    }, 6000)

    try {
      const res = await fetch('/api/ai/mf-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderId: holding.folio_id, // used as proxy; actual holderId resolved server-side from folio
          schemeCode: holding.scheme_code,
          schemeName: customFundName || holding.scheme_name,
          fundHouse: holding.fund_house,
          category: category ?? '',
          investorProfile: { ...profile },
          forceRefresh,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errBody.error ?? `HTTP ${res.status}`)
      }

      const data: ReviewResponse = await res.json()
      setReviewData(data)
      setState('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
      setState('form')
    } finally {
      clearInterval(interval)
      setIsRerunning(false)
    }
  }, [holding, customFundName, category, profile, reviewData])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset to form when closed (but keep profile settings for next open)
      setState('form')
      setError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 shrink-0 bg-surface-container-low/50">
          <DialogTitle className="text-lg font-bold text-primary font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            MF Review
          </DialogTitle>
          <p className="text-xs text-on-surface-variant mt-0.5">{holding.scheme_name}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {state === 'form' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {error && (
                <div className="p-3 bg-[#fee2e2] rounded-xl text-xs text-[#991b1b] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-on-surface mb-1">Fund to analyse</p>
                <input
                  type="text"
                  value={customFundName}
                  onChange={(e) => setCustomFundName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-outline-variant rounded-xl bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-4 mt-2">
                  {(['Direct', 'Regular'] as const).map((pt) => (
                    <label key={pt} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="planType"
                        value={pt}
                        checked={profile.planType === pt}
                        onChange={() => updateProfile('planType', pt)}
                        className="accent-primary"
                      />
                      <span className="text-xs text-on-surface-variant">{pt} Plan</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Your Age</p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={profile.age}
                    onChange={(e) => updateProfile('age', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 text-sm border border-outline-variant rounded-xl bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Investment Horizon (years)</p>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={profile.horizon}
                    onChange={(e) => updateProfile('horizon', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 text-sm border border-outline-variant rounded-xl bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <RadioGroup
                label="Investment Goal"
                name="goal"
                value={profile.goal}
                onChange={(v) => updateProfile('goal', v)}
                options={[
                  'Retirement corpus',
                  'Child\'s education or marriage',
                  'Wealth creation (no specific target)',
                  'Buying a home or major purchase',
                  'Other',
                ]}
              />

              <RadioGroup
                label="Investment Mode"
                name="mode"
                value={profile.mode}
                onChange={(v) => updateProfile('mode', v)}
                options={['Lump sum only', 'SIP only', 'Both (lump sum now + ongoing SIP)']}
              />

              <RadioGroup
                label="Existing Portfolio"
                name="portfolio"
                value={profile.portfolio}
                onChange={(v) => updateProfile('portfolio', v)}
                options={[
                  'Yes — I have a diversified portfolio of multiple funds or assets',
                  'Yes — but mostly in one or two funds',
                  'No — this would be my first or only equity investment',
                  'I hold primarily debt or fixed income currently',
                ]}
              />

              <RadioGroup
                label="Risk Tolerance"
                name="riskTolerance"
                value={profile.riskTolerance}
                onChange={(v) => updateProfile('riskTolerance', v)}
                options={[
                  'Low — I prioritize capital protection over high returns',
                  'Medium — I can accept moderate losses for moderate long-term gains',
                  'High — I am comfortable with significant short-term losses for higher long-term returns',
                ]}
              />

              <RadioGroup
                label="Volatility Preference"
                name="volatilityPreference"
                value={profile.volatilityPreference}
                onChange={(v) => updateProfile('volatilityPreference', v)}
                options={[
                  'Low — I prefer a smooth, stable return curve even if that means lower returns',
                  'Medium — I can handle occasional sharp dips as long as the long-term trend is up',
                  'High — I am comfortable with sharp drawdowns if long-term compounding is strong',
                ]}
              />

              <RadioGroup
                label="Tax Sensitivity"
                name="taxSensitivity"
                value={profile.taxSensitivity}
                onChange={(v) => updateProfile('taxSensitivity', v)}
                options={[
                  'I am in the 30% income tax bracket — tax efficiency matters a lot',
                  'I am in the 20% bracket — moderate concern',
                  'I am in the 5–10% bracket or exempt — minimal impact',
                  'Not sure',
                ]}
              />

              <RadioGroup
                label="Entry Context"
                name="entryContext"
                value={profile.entryContext}
                onChange={(v) => updateProfile('entryContext', v)}
                options={[
                  'First-time entry — considering buying',
                  'Adding more to an existing holding',
                  'Deciding whether to continue holding or exit',
                  'Comparing against another fund I already hold',
                ]}
              />
            </div>
          )}

          {state === 'loading' && (
            <LoadingState stage={LOADING_STAGES[loadingStageIdx]} />
          )}

          {state === 'result' && reviewData && (
            <ResultWidget
              result={reviewData.result}
              generatedAt={reviewData.generatedAt}
              cached={reviewData.cached}
              onRerun={() => runAnalysis(true)}
              isRerunning={isRerunning}
            />
          )}
        </div>

        {/* Footer */}
        {state === 'form' && (
          <div className="px-6 py-4 border-t border-outline-variant/30 shrink-0 bg-surface-container-low/30 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              AI-powered · Educational use only · Not SEBI advice
            </p>
            <button
              onClick={() => runAnalysis(false)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Analyse with AI
            </button>
          </div>
        )}

        {state === 'result' && (
          <div className="px-6 py-3 border-t border-outline-variant/30 shrink-0">
            <button
              onClick={() => setState('form')}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to questions
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
