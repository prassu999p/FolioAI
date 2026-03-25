import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeGoalProjection } from '@/lib/analytics/goals-engine'
import type { HoldingRow } from '@/lib/supabase/types'
import { GoalCard } from '@/components/goals/goal-card'
import { CreateGoalModal } from '@/components/goals/create-goal-modal'
import { FundGoalLinkage } from '@/components/goals/fund-goal-linkage'

interface GoalHolding {
  scheme_code: number
}

interface GoalRow {
  id: string
  holder_id: string
  name: string
  target_amount: number
  target_date: string
  assumed_cagr: number
  created_at: string
  goal_holdings: GoalHolding[]
}

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params

  // 1. Auth check
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) {
    redirect('/login')
  }

  // 2. Fetch holders for this family
  const { data: holders } = (await (supabase as any)
    .from('holders')
    .select('id, name')
    .eq('family_id', familyId)
    .order('name', { ascending: true })) as {
    data: Array<{ id: string; name: string }> | null
  }

  if (!holders || holders.length === 0) {
    redirect(`/families/${familyId}`)
  }

  const primaryHolder = holders[0]

  // 3. Fetch goals for all holders with linked holdings
  type GoalRowRaw = {
    id: string
    holder_id: string
    name: string
    target_amount: number
    target_date: string
    assumed_cagr: number
    created_at: string
    goal_holdings: GoalHolding[]
  }

  const allGoals: GoalRow[] = []

  for (const holder of holders) {
    const { data: goalsRaw } = (await (supabase as any)
      .from('goals')
      .select('id, holder_id, name, target_amount, target_date, assumed_cagr, created_at, goal_holdings(scheme_code)')
      .eq('holder_id', holder.id)
      .order('created_at', { ascending: true })) as { data: GoalRowRaw[] | null }

    if (goalsRaw) {
      allGoals.push(...goalsRaw)
    }
  }

  // 4. Fetch holdings for each holder via get_holder_holdings RPC
  const holderHoldingsMap = new Map<string, HoldingRow[]>()
  const holderAUMMap = new Map<string, number>()

  for (const holder of holders) {
    const { data: holdingsRaw } = (await (supabase as any).rpc('get_holder_holdings', {
      p_holder_id: holder.id,
    })) as { data: HoldingRow[] | null }

    const holdings = holdingsRaw ?? []
    holderHoldingsMap.set(holder.id, holdings)

    const totalAUM = holdings.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
    holderAUMMap.set(holder.id, totalAUM)
  }

  // 5. Build primary holder's holdings for modal
  const primaryHolderHoldings = holderHoldingsMap.get(primaryHolder.id) ?? []
  const modalHoldings = primaryHolderHoldings.map(h => ({
    scheme_code: h.scheme_code,
    scheme_name: h.scheme_name,
  }))

  // 6. Compute projections and build display data
  type GoalDisplayRow = {
    goal: GoalRow
    linkedFundNames: string[]
    projection: ReturnType<typeof computeGoalProjection>
  }

  const goalsDisplay: GoalDisplayRow[] = allGoals.map(goal => {
    const holderHoldings = holderHoldingsMap.get(goal.holder_id) ?? []
    const totalAUM = holderAUMMap.get(goal.holder_id) ?? 0
    const holdingNameMap = new Map(holderHoldings.map(h => [h.scheme_code, h.scheme_name]))

    const linkedCodes = goal.goal_holdings.map(gh => gh.scheme_code)
    const linkedFundNames = linkedCodes
      .map(code => holdingNameMap.get(code))
      .filter((name): name is string => !!name)

    const linkedValue = holderHoldings
      .filter(h => linkedCodes.includes(h.scheme_code))
      .reduce((sum, h) => sum + (h.current_value ?? 0), 0)

    const projection = computeGoalProjection(goal, linkedValue, totalAUM)

    return { goal, linkedFundNames, projection }
  })

  // 7. Build FundGoalLinkage data (use all holdings for fund name resolution)
  const allHoldings: HoldingRow[] = Array.from(holderHoldingsMap.values()).flat()
  const goalsForLinkage = allGoals.map(goal => ({
    id: goal.id,
    name: goal.name,
    linkedSchemeCodes: goal.goal_holdings.map(gh => gh.scheme_code),
  }))

  return (
    <div className="px-12 py-8 space-y-12">
      {/* Page header */}
      <section>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2 block">
              Mission Tracking
            </span>
            <h3 className="font-headline text-4xl font-extrabold text-primary">
              Financial Life Goals
            </h3>
          </div>

          <CreateGoalModal
            holderId={primaryHolder.id}
            holderName={primaryHolder.name}
            holdings={modalHoldings}
          />
        </div>
      </section>

      {/* Goals grid */}
      {goalsDisplay.length === 0 ? (
        <section className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
            track_changes
          </span>
          <h4 className="font-headline text-xl font-bold text-primary mb-2">
            No goals yet
          </h4>
          <p className="text-on-surface-variant mb-6">
            Create your first financial goal to start tracking your progress.
          </p>
          <CreateGoalModal
            holderId={primaryHolder.id}
            holderName={primaryHolder.name}
            holdings={modalHoldings}
          />
        </section>
      ) : (
        <>
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goalsDisplay.map(({ goal, projection, linkedFundNames }) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  projection={projection}
                  linkedFundNames={linkedFundNames}
                />
              ))}
            </div>
          </section>

          {/* Fund-Goal Linkage strip */}
          <section>
            <FundGoalLinkage goals={goalsForLinkage} holdings={allHoldings} />
          </section>
        </>
      )}
    </div>
  )
}
