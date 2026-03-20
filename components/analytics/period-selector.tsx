'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const PERIODS = ['1M', '3M', '6M', '1Y', '3Y', 'all'] as const
type PeriodValue = typeof PERIODS[number]

const PERIOD_LABELS: Record<PeriodValue, string> = {
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '1Y': '1Y',
  '3Y': '3Y',
  'all': 'All Time',
}

export type ViewMode = 'xirr' | 'absolute' | 'benchmark'
const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'xirr',      label: 'XIRR' },
  { value: 'absolute',  label: 'Absolute' },
  { value: 'benchmark', label: 'Benchmark' },
]

interface PeriodSelectorProps {
  className?: string
}

export function PeriodSelector({ className = '' }: PeriodSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPeriod = (searchParams.get('period') ?? 'all') as PeriodValue
  const currentView = searchParams.get('view') as ViewMode | null

  const handlePeriodSelect = (period: PeriodValue) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    router.replace(`?${params.toString()}`)
  }

  const handleViewSelect = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentView === mode) {
      params.delete('view') // clicking active tab deselects it
    } else {
      params.set('view', mode)
    }
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Period row */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((period) => (
          <button
            key={period}
            onClick={() => handlePeriodSelect(period)}
            className={
              period === currentPeriod
                ? 'px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm transition-colors'
                : 'px-4 py-2 bg-surface-container-high text-on-surface-variant font-medium rounded-lg text-sm hover:bg-surface-container transition-colors'
            }
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>
      {/* View mode row */}
      <div className="flex gap-2">
        {VIEW_MODES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleViewSelect(value)}
            className={
              currentView === value
                ? 'px-3 py-1.5 bg-secondary text-on-primary font-bold rounded-lg text-xs transition-colors'
                : 'px-3 py-1.5 bg-surface-container text-on-surface-variant font-medium rounded-lg text-xs hover:bg-surface-container-high transition-colors'
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
