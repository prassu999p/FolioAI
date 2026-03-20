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

interface PeriodSelectorProps {
  className?: string
}

export function PeriodSelector({ className = '' }: PeriodSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentPeriod = (searchParams.get('period') ?? 'all') as PeriodValue

  const handleSelect = (period: PeriodValue) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', period)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {PERIODS.map((period) => (
        <button
          key={period}
          onClick={() => handleSelect(period)}
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
  )
}
