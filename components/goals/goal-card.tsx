import { formatINR } from '@/lib/utils'
import type { GoalProjection } from '@/lib/analytics/goals-engine'

interface Goal {
  id: string
  holder_id: string
  name: string
  target_amount: number
  target_date: string
  assumed_cagr: number
  created_at: string
}

interface GoalCardProps {
  goal: Goal
  projection: GoalProjection
  linkedFundNames: string[]
}

function formatTargetDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export function GoalCard({ goal, projection, linkedFundNames }: GoalCardProps) {
  const { projectedCorpus, currentLinkedValue, progressPct, isOnTrack, yearsToTarget } = projection
  const displayFunds = linkedFundNames.slice(0, 2)
  const extraFunds = linkedFundNames.length > 2 ? linkedFundNames.length - 2 : 0

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4 hover:bg-surface-container-low transition-colors duration-300 ${
        !isOnTrack ? 'border-l-4 border-error/20' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="p-3 bg-surface-container-high rounded-xl">
          <span className="material-symbols-outlined text-primary">track_changes</span>
        </div>
        {isOnTrack ? (
          <span className="text-[10px] font-black uppercase px-2 py-1 bg-secondary-container text-on-secondary-container rounded tracking-tighter">
            On Track
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase px-2 py-1 bg-error-container text-on-error-container rounded tracking-tighter">
            Off Track
          </span>
        )}
      </div>

      {/* Goal Name */}
      <div>
        <h4 className="font-headline text-xl font-bold text-primary">{goal.name}</h4>
        {linkedFundNames.length > 0 && (
          <p className="text-primary/60 text-sm mt-0.5">
            Linked to {linkedFundNames.length} fund{linkedFundNames.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Target amount with icon */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary/50 text-base">track_changes</span>
        <span className="text-sm text-primary/60 font-medium">Target</span>
        <span className="tabular-nums font-bold text-primary ml-auto">
          ₹{formatINR(goal.target_amount)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-primary/40 uppercase tracking-widest">
          <span>Progress</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="bg-surface-container h-2 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${isOnTrack ? 'bg-secondary' : 'bg-error'}`}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Two-col stats */}
      <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/20 pt-4">
        <div>
          <span className="text-[10px] text-primary/40 font-bold uppercase block">Current Corpus</span>
          <span className="tabular-nums font-bold text-primary">₹{formatINR(currentLinkedValue)}</span>
        </div>
        <div>
          <span className="text-[10px] text-primary/40 font-bold uppercase block">Projected at Target</span>
          <span className="tabular-nums font-bold text-primary">₹{formatINR(projectedCorpus)}</span>
        </div>
      </div>

      {/* Target date */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-primary/50 font-medium">Target Date</span>
        <div className="text-right">
          <span className="font-bold text-primary">{formatTargetDate(goal.target_date)}</span>
          {yearsToTarget > 0 && (
            <span className="text-primary/40 text-xs ml-2">
              {yearsToTarget.toFixed(1)}y away
            </span>
          )}
        </div>
      </div>

      {/* Linked fund chips (up to 2 + overflow) */}
      {linkedFundNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {displayFunds.map((name) => (
            <span
              key={name}
              className="bg-surface-container-low text-primary/70 text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[120px]"
              title={name}
            >
              {name}
            </span>
          ))}
          {extraFunds > 0 && (
            <span className="bg-surface-container text-primary/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
              +{extraFunds} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
