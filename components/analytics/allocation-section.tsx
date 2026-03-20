import { createClient } from '@/lib/supabase/server'
import { mapCategoryToAssetClass } from '@/lib/analytics/asset-class-mapper'
import type { AssetClass } from '@/lib/analytics/asset-class-mapper'
import type { HoldingRowWithAnalytics } from '@/lib/supabase/types'
import { SetTargetModal } from './set-target-modal'

interface AllocationTargets {
  equity: number
  debt: number
  gold: number
  international: number
}

interface AllocationSectionProps {
  holderId: string
  holdings: HoldingRowWithAnalytics[]
  fundCategories: Record<number, string>  // scheme_code → SEBI category string
}

/**
 * AllocationSection — Server Component outer.
 *
 * Renders four horizontal CSS bars (Equity, Debt, Gold, International) showing:
 * - Current allocation % (computed from holdings by asset class)
 * - Target % marker line (from holder_allocation_targets)
 * - Deviation text (red if > 5% under target, green if > 5% over target)
 *
 * Also renders SetTargetModal client island for editing targets.
 */
export async function AllocationSection({ holderId, holdings, fundCategories }: AllocationSectionProps) {
  const supabase = await createClient()

  // Fetch allocation targets directly from DB (server-side — no round-trip via API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: targetRow } = await (supabase as any)
    .from('holder_allocation_targets')
    .select('equity, debt, gold, international')
    .eq('holder_id', holderId)
    .maybeSingle()

  const targets: AllocationTargets = targetRow ?? { equity: 0, debt: 0, gold: 0, international: 0 }

  // Compute current allocation from holdings
  const classValues: Record<AssetClass, number> = { equity: 0, debt: 0, gold: 0, international: 0 }
  let totalAUM = 0

  for (const holding of holdings) {
    const value = holding.current_value ?? 0
    if (value <= 0) continue

    // Look up category from fundCategories prop (parent provides funds table lookup)
    // Fall back to 'equity' if category unknown (consistent with mapCategoryToAssetClass fallback)
    const category = fundCategories[holding.scheme_code] ?? ''
    const assetClass = mapCategoryToAssetClass(category)
    classValues[assetClass] += value
    totalAUM += value
  }

  // Compute percentages
  const currentPct: Record<AssetClass, number> = {
    equity: totalAUM > 0 ? (classValues.equity / totalAUM) * 100 : 0,
    debt: totalAUM > 0 ? (classValues.debt / totalAUM) * 100 : 0,
    gold: totalAUM > 0 ? (classValues.gold / totalAUM) * 100 : 0,
    international: totalAUM > 0 ? (classValues.international / totalAUM) * 100 : 0,
  }

  const assetLabels: { key: AssetClass; label: string }[] = [
    { key: 'equity', label: 'Equity' },
    { key: 'debt', label: 'Debt' },
    { key: 'gold', label: 'Gold' },
    { key: 'international', label: 'International' },
  ]

  return (
    <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm">
      {/* Section header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-primary font-headline">Asset Allocation</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Current vs target allocation
          </p>
        </div>
        <SetTargetModal holderId={holderId} currentTargets={targets} />
      </div>

      {/* Allocation bars */}
      <div className="space-y-6">
        {assetLabels.map(({ key, label }) => {
          const current = currentPct[key]
          const target = targets[key]
          const deviation = current - target

          // Deviation color: green if current > target + 2%, red if current < target - 2%, muted otherwise
          let deviationClass = 'text-on-surface-variant'
          if (deviation > 2) deviationClass = 'text-green-600'
          if (deviation < -2) deviationClass = 'text-red-600'

          const deviationText = deviation > 0
            ? `+${deviation.toFixed(1)}%`
            : deviation < 0
              ? `${deviation.toFixed(1)}%`
              : '—'

          return (
            <div key={key}>
              {/* Row header */}
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-bold text-primary">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {current.toFixed(1)}%
                  </span>
                  {target > 0 && (
                    <span className={`text-xs font-bold tabular-nums ${deviationClass}`}>
                      {deviationText}
                    </span>
                  )}
                </div>
              </div>

              {/* Bar track */}
              <div className="relative h-2 bg-surface-container-high rounded-full">
                {/* Current allocation bar */}
                <div
                  style={{ width: `${Math.min(current, 100)}%` }}
                  className="h-2 bg-primary rounded-full transition-all duration-300"
                />

                {/* Target marker line */}
                {target > 0 && (
                  <div
                    style={{ left: `${Math.min(target, 100)}%` }}
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-on-surface/40 rounded-full"
                  />
                )}
              </div>

              {/* Target label */}
              {target > 0 && (
                <p className="text-[10px] text-on-surface-variant mt-1">
                  Target: {target.toFixed(1)}%
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Total AUM context */}
      {totalAUM > 0 && (
        <p className="text-xs text-on-surface-variant mt-6 pt-4 border-t border-outline-variant/20">
          Based on current portfolio value of{' '}
          <span className="font-bold tabular-nums">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalAUM)}
          </span>
        </p>
      )}
    </div>
  )
}
