import type { AssetAllocation } from '@/lib/analytics/asset-class-mapper'

interface FamilyAllocationSectionProps {
  currentAllocation: AssetAllocation
  targetAllocation: AssetAllocation | null
  familyAUM: number
}

const ASSET_CLASS_LABELS: Record<keyof AssetAllocation, string> = {
  equity: 'Equity',
  debt: 'Debt & Fixed Income',
  gold: 'Gold / Alternatives',
  international: 'International',
}

export function FamilyAllocationSection({
  currentAllocation,
  targetAllocation,
  familyAUM,
}: FamilyAllocationSectionProps) {
  const assetClasses = (['equity', 'debt', 'gold', 'international'] as (keyof AssetAllocation)[])

  // Check if any holder has set targets (non-zero target means targets are set)
  const hasTargets =
    targetAllocation !== null &&
    Object.values(targetAllocation).some(v => v > 0)

  return (
    <div className="bg-surface-container-low p-10 rounded-xl space-y-10">
      {assetClasses.map(cls => {
        const current = currentAllocation[cls]
        const target = targetAllocation?.[cls] ?? null
        const drift = target !== null ? current - target : null
        const showDrift = drift !== null && Math.abs(drift) > 5

        return (
          <div key={cls} className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-3">
                <span className="font-headline font-bold text-xl text-primary">
                  {ASSET_CLASS_LABELS[cls]}
                </span>
                {target !== null && (
                  showDrift ? (
                    <span className="bg-error-container text-on-error-container text-[10px] px-2 py-0.5 rounded font-black uppercase">
                      {drift! > 0 ? `+${drift!.toFixed(1)}%` : `${drift!.toFixed(1)}%`} Drift
                    </span>
                  ) : (
                    <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded font-black uppercase">
                      On Track
                    </span>
                  )
                )}
              </div>
              <div className="text-right">
                <span className="tabular-nums text-3xl font-bold text-primary">
                  {current.toFixed(1)}%
                </span>
                {target !== null && (
                  <span className="text-primary/40 text-sm ml-2">
                    vs {target.toFixed(1)}% Target
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar with target marker */}
            <div className="h-4 w-full bg-surface-container-high rounded-full overflow-hidden relative">
              {/* Current allocation fill */}
              {showDrift && drift! > 0 ? (
                <>
                  {/* Up to target: primary fill; excess above target: error fill */}
                  <div
                    className="absolute h-full bg-primary left-0"
                    style={{ width: `${Math.min(target!, 100)}%` }}
                  />
                  <div
                    className="absolute h-full bg-error"
                    style={{
                      left: `${Math.min(target!, 100)}%`,
                      width: `${Math.min(current - target!, 100 - target!)}%`,
                    }}
                  />
                </>
              ) : (
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(current, 100)}%` }}
                />
              )}
              {/* Target marker line */}
              {target !== null && target > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-secondary"
                  style={{ left: `${Math.min(target, 100)}%` }}
                />
              )}
            </div>
          </div>
        )
      })}

      {!hasTargets && (
        <p className="text-sm text-on-surface-variant mt-2">
          Set allocation targets on individual holder pages to see drift analysis.
        </p>
      )}
    </div>
  )
}
