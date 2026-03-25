import type { HoldingRow } from '@/lib/supabase/types'

interface GoalWithLinks {
  id: string
  name: string
  linkedSchemeCodes: number[]
}

interface FundGoalLinkageProps {
  goals: GoalWithLinks[]
  holdings: HoldingRow[]
}

interface LinkPair {
  fundName: string
  goalName: string
  schemeCode: number
}

export function FundGoalLinkage({ goals, holdings }: FundGoalLinkageProps) {
  // Build scheme_code → scheme_name map
  const nameMap = new Map<number, string>(
    holdings.map(h => [h.scheme_code, h.scheme_name])
  )

  // Flatten all fund→goal links
  const links: LinkPair[] = []
  for (const goal of goals) {
    for (const code of goal.linkedSchemeCodes) {
      const fundName = nameMap.get(code) ?? `Fund #${code}`
      links.push({ fundName, goalName: goal.name, schemeCode: code })
    }
  }

  if (links.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6 text-center">
        <p className="text-sm text-primary/50">
          Link holdings to goals using the &quot;Create New Goal&quot; button above.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low p-6 rounded-xl">
      <h4 className="font-headline font-bold text-xl text-primary mb-5">
        Fund-Goal Visual Linkage
      </h4>
      <div className="space-y-4">
        {links.map((link, i) => (
          <div key={`${link.schemeCode}-${link.goalName}-${i}`} className="flex items-center gap-4">
            {/* Fund name */}
            <div className="w-2/5">
              <span
                className="text-sm font-bold text-primary block truncate"
                title={link.fundName}
              >
                {link.fundName}
              </span>
            </div>

            {/* Connector line */}
            <div className="flex-1 flex items-center">
              <div className="h-px bg-primary/20 flex-1 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
              </div>
              <span className="material-symbols-outlined text-primary/40 text-base mx-2 shrink-0">
                arrow_forward
              </span>
              <div className="h-px bg-primary/20 flex-1 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
              </div>
            </div>

            {/* Goal name */}
            <div className="w-2/5 text-right">
              <span
                className="text-sm font-bold text-primary block truncate"
                title={link.goalName}
              >
                {link.goalName}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
