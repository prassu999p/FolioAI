import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { mapCategoryToAssetClass } from '@/lib/analytics/asset-class-mapper'
import type { AssetAllocation } from '@/lib/analytics/asset-class-mapper'
import { FamilyAllocationSection } from '@/components/analytics/family-allocation-section'
import { GenerateRebalanceButton } from '@/components/ai/generate-rebalance-button'

interface AllocationTarget {
  holder_id: string
  equity: number
  debt: number
  gold: number
  international: number
}

function computeFamilyTargets(
  holders: Array<{ targets: AssetAllocation; aum: number }>
): AssetAllocation {
  const totalAUM = holders.reduce((s, h) => s + h.aum, 0)
  if (totalAUM === 0) return { equity: 0, debt: 0, gold: 0, international: 0 }
  return {
    equity: holders.reduce((s, h) => s + h.targets.equity * h.aum, 0) / totalAUM,
    debt: holders.reduce((s, h) => s + h.targets.debt * h.aum, 0) / totalAUM,
    gold: holders.reduce((s, h) => s + h.targets.gold * h.aum, 0) / totalAUM,
    international:
      holders.reduce((s, h) => s + h.targets.international * h.aum, 0) / totalAUM,
  }
}

export default async function AllocationPage({
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

  // 2. Fetch all holders for this family
  const { data: holders } = (await (supabase as any)
    .from('holders')
    .select('id')
    .eq('family_id', familyId)) as { data: Array<{ id: string }> | null }

  if (!holders || holders.length === 0) {
    return (
      <div className="px-12 py-8">
        <h2 className="text-2xl font-bold font-headline text-primary mb-4">Asset Allocation</h2>
        <p className="text-on-surface-variant">No holders found for this family.</p>
      </div>
    )
  }

  // 3. Fetch holdings for each holder via get_holder_holdings RPC
  const holderData: Array<{
    holderId: string
    allocation: AssetAllocation
    aum: number
  }> = []

  for (const holder of holders) {
    const { data: holdingsRaw } = (await (supabase as any).rpc('get_holder_holdings', {
      p_holder_id: holder.id,
    })) as {
      data: Array<{
        scheme_code: number
        scheme_name: string
        current_value: number
        category: string
      }> | null
    }

    if (!holdingsRaw || holdingsRaw.length === 0) continue

    const allocationValues: AssetAllocation = { equity: 0, debt: 0, gold: 0, international: 0 }
    let holderAUM = 0

    for (const h of holdingsRaw) {
      const val = h.current_value ?? 0
      holderAUM += val
      const assetClass = mapCategoryToAssetClass(h.category ?? '')
      allocationValues[assetClass] += val
    }

    const allocation: AssetAllocation =
      holderAUM > 0
        ? {
            equity: (allocationValues.equity / holderAUM) * 100,
            debt: (allocationValues.debt / holderAUM) * 100,
            gold: (allocationValues.gold / holderAUM) * 100,
            international: (allocationValues.international / holderAUM) * 100,
          }
        : { equity: 0, debt: 0, gold: 0, international: 0 }

    holderData.push({ holderId: holder.id, allocation, aum: holderAUM })
  }

  // 4. Aggregate to family-level current allocation
  const totalFamilyAUM = holderData.reduce((s, h) => s + h.aum, 0)
  const familyCurrentAllocation: AssetAllocation =
    totalFamilyAUM > 0
      ? {
          equity:
            holderData.reduce((s, h) => s + h.allocation.equity * h.aum, 0) / totalFamilyAUM,
          debt:
            holderData.reduce((s, h) => s + h.allocation.debt * h.aum, 0) / totalFamilyAUM,
          gold:
            holderData.reduce((s, h) => s + h.allocation.gold * h.aum, 0) / totalFamilyAUM,
          international:
            holderData.reduce((s, h) => s + h.allocation.international * h.aum, 0) /
            totalFamilyAUM,
        }
      : { equity: 0, debt: 0, gold: 0, international: 0 }

  // 5. Fetch holder allocation targets
  const { data: targetsData } = (await (supabase as any)
    .from('holder_allocation_targets')
    .select('holder_id, equity, debt, gold, international')
    .in(
      'holder_id',
      holderData.map(h => h.holderId)
    )) as { data: AllocationTarget[] | null }

  // 6. Compute family-level target (weighted by AUM)
  const targetsMap = new Map<string, AssetAllocation>(
    (targetsData ?? []).map(t => [
      t.holder_id,
      { equity: t.equity, debt: t.debt, gold: t.gold, international: t.international },
    ])
  )

  const holdersWithTargets = holderData.map(h => ({
    targets: targetsMap.get(h.holderId) ?? { equity: 0, debt: 0, gold: 0, international: 0 },
    aum: h.aum,
  }))

  const familyTargetAllocation = computeFamilyTargets(holdersWithTargets)
  const hasAnyTarget =
    targetsData !== null &&
    targetsData.length > 0 &&
    Object.values(familyTargetAllocation).some(v => v > 0)

  // 7. Fetch cached rebalance strategy
  const { data: strategyData } = (await (supabase as any)
    .from('rebalance_strategies')
    .select('strategy, generated_at')
    .eq('family_id', familyId)
    .maybeSingle()) as {
    data: { strategy: string; generated_at: string } | null
  }

  const generatedAgoLabel = strategyData?.generated_at
    ? formatDistanceToNow(new Date(strategyData.generated_at), { addSuffix: true })
    : null

  return (
    <div className="px-12 py-8 space-y-16">
      {/* Page Header */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-2 block">
              Portfolio Architecture
            </span>
            <h3 className="font-headline text-4xl font-extrabold text-primary">
              Current vs Target
            </h3>
            <p className="text-on-surface-variant mt-1 text-sm">
              Family Portfolio — {holderData.length} holder{holderData.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* 2/3 + 1/3 split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: Allocation Bars */}
          <div className="lg:col-span-2">
            {holderData.length > 0 ? (
              <FamilyAllocationSection
                currentAllocation={familyCurrentAllocation}
                targetAllocation={hasAnyTarget ? familyTargetAllocation : null}
                familyAUM={totalFamilyAUM}
              />
            ) : (
              <div className="bg-surface-container-low p-10 rounded-xl text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 block">
                  pie_chart
                </span>
                <p className="text-on-surface-variant">No holdings found.</p>
                <p className="text-sm text-on-surface-variant mt-2">
                  Import a CAS or add holdings to see allocation.
                </p>
              </div>
            )}
          </div>

          {/* Right: AI Rebalance Strategy Card */}
          <div className="bg-white/40 backdrop-blur-xl border border-[rgba(0,109,67,0.1)] rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <h4 className="font-headline font-bold text-primary">AI Rebalance Strategy</h4>
            </div>

            {strategyData ? (
              <div className="mb-6">
                {generatedAgoLabel && (
                  <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded mb-4">
                    Generated {generatedAgoLabel}
                  </span>
                )}
                <p className="text-sm text-primary/80 leading-relaxed whitespace-pre-wrap">
                  {strategyData.strategy}
                </p>
              </div>
            ) : (
              <p className="text-sm text-primary/60 leading-relaxed mb-6">
                Get AI-powered guidance on rebalancing your family portfolio to reduce drift and
                stay on track with your allocation targets.
              </p>
            )}

            <div className="mt-2 text-[10px] text-primary/40 mb-4">
              For informational purposes only. Not investment advice.
            </div>

            <GenerateRebalanceButton
              familyId={familyId}
              hasExisting={!!strategyData}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
