import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mapCategoryToAssetClass } from '@/lib/analytics/asset-class-mapper'
import type { AssetAllocation } from '@/lib/analytics/asset-class-mapper'
import { getAIModel } from './provider'

interface HolderHolding {
  scheme_code: number
  scheme_name: string
  current_value: number
  category: string
}

interface AllocationTarget {
  holder_id: string
  equity: number
  debt: number
  gold: number
  international: number
}

/**
 * Compute family-level targets as weighted average of holder targets by AUM.
 */
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

/**
 * Generate an AI rebalance strategy for the family.
 * Mirrors narrative-service.ts structure exactly.
 * Caches the result in rebalance_strategies table (UNIQUE on family_id — upsert).
 */
export async function generateRebalanceStrategy(
  familyId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient | any
): Promise<{ strategy: string }> {
  // 1. Fetch all holders for the family
  const { data: holders } = await (supabase as any)
    .from('holders')
    .select('id')
    .eq('family_id', familyId) as { data: Array<{ id: string }> | null }

  if (!holders || holders.length === 0) {
    throw new Error(`No holders found for family ${familyId}`)
  }

  // 2. For each holder, fetch holdings via get_holder_holdings RPC
  const holderAllocations: Array<{
    holderId: string
    allocation: AssetAllocation
    aum: number
    holdingsWithValue: HolderHolding[]
  }> = []

  for (const holder of holders) {
    const { data: holdingsRaw } = await (supabase as any).rpc('get_holder_holdings', {
      p_holder_id: holder.id,
    }) as { data: Array<{ scheme_code: number; scheme_name: string; current_value: number; category: string }> | null }

    if (!holdingsRaw || holdingsRaw.length === 0) continue

    // Compute allocation for this holder
    const allocationValues: AssetAllocation = { equity: 0, debt: 0, gold: 0, international: 0 }
    let holderAUM = 0

    for (const h of holdingsRaw) {
      const val = h.current_value ?? 0
      holderAUM += val
      const assetClass = mapCategoryToAssetClass(h.category ?? '')
      allocationValues[assetClass] += val
    }

    // Convert to percentages
    const allocation: AssetAllocation =
      holderAUM > 0
        ? {
            equity: (allocationValues.equity / holderAUM) * 100,
            debt: (allocationValues.debt / holderAUM) * 100,
            gold: (allocationValues.gold / holderAUM) * 100,
            international: (allocationValues.international / holderAUM) * 100,
          }
        : { equity: 0, debt: 0, gold: 0, international: 0 }

    holderAllocations.push({
      holderId: holder.id,
      allocation,
      aum: holderAUM,
      holdingsWithValue: holdingsRaw.map(h => ({
        scheme_code: h.scheme_code,
        scheme_name: h.scheme_name,
        current_value: h.current_value ?? 0,
        category: h.category ?? '',
      })),
    })
  }

  if (holderAllocations.length === 0) {
    throw new Error(`No holdings found for family ${familyId}`)
  }

  // 3. Compute family-level current allocation (weighted by holder AUM)
  const totalFamilyAUM = holderAllocations.reduce((s, h) => s + h.aum, 0)
  const familyCurrent: AssetAllocation =
    totalFamilyAUM > 0
      ? {
          equity:
            holderAllocations.reduce((s, h) => s + h.allocation.equity * h.aum, 0) /
            totalFamilyAUM,
          debt:
            holderAllocations.reduce((s, h) => s + h.allocation.debt * h.aum, 0) /
            totalFamilyAUM,
          gold:
            holderAllocations.reduce((s, h) => s + h.allocation.gold * h.aum, 0) /
            totalFamilyAUM,
          international:
            holderAllocations.reduce(
              (s, h) => s + h.allocation.international * h.aum,
              0
            ) / totalFamilyAUM,
        }
      : { equity: 0, debt: 0, gold: 0, international: 0 }

  // 4. Fetch holder allocation targets
  const { data: targetsData } = await (supabase as any)
    .from('holder_allocation_targets')
    .select('holder_id, equity, debt, gold, international')
    .in(
      'holder_id',
      holderAllocations.map(h => h.holderId)
    ) as { data: AllocationTarget[] | null }

  const targetsMap = new Map<string, AssetAllocation>(
    (targetsData ?? []).map(t => [
      t.holder_id,
      { equity: t.equity, debt: t.debt, gold: t.gold, international: t.international },
    ])
  )

  // 5. Compute family-level target (weighted-average of holder targets by AUM)
  const holdersWithTargets = holderAllocations.map(h => ({
    targets: targetsMap.get(h.holderId) ?? { equity: 0, debt: 0, gold: 0, international: 0 },
    aum: h.aum,
  }))
  const familyTarget = computeFamilyTargets(holdersWithTargets)

  // 6. Get top 5 holdings by value across all holders
  const allHoldings = holderAllocations.flatMap(h => h.holdingsWithValue)
  const top5 = allHoldings
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 5)

  // 7. Build prompt
  const driftLines = (
    ['equity', 'debt', 'gold', 'international'] as (keyof AssetAllocation)[]
  )
    .map(cls => {
      const current = familyCurrent[cls]
      const target = familyTarget[cls]
      const drift = current - target
      const prefix = drift > 0 ? '+' : ''
      return `  ${cls}: current ${current.toFixed(1)}%, target ${target.toFixed(1)}%, drift ${prefix}${drift.toFixed(1)}%`
    })
    .join('\n')

  const top5Lines = top5
    .map(
      (h, i) =>
        `  ${i + 1}. ${h.scheme_name} — ₹${Math.round(h.current_value).toLocaleString('en-IN')} (${mapCategoryToAssetClass(h.category)})`
    )
    .join('\n')

  const prompt = `You are a SEBI-registered investment advisor assistant providing portfolio rebalancing guidance for a family portfolio.

Family Portfolio Summary:
- Total AUM: ₹${Math.round(totalFamilyAUM).toLocaleString('en-IN')}
- Number of holders: ${holderAllocations.length}

Current vs Target Allocation (family-level, weighted by AUM):
${driftLines}

Top 5 Holdings by Value:
${top5Lines}

Based on the drift analysis above, provide a concise rebalancing strategy (3-5 bullet points). Focus on:
1. Which asset classes are significantly over/under-allocated (drift > 5%)
2. Specific action recommendations (trim/add) with approximate amounts
3. Tax efficiency considerations (prefer LTCG-eligible units where possible)
4. Priority order for actions

This analysis is for informational purposes only and does not constitute investment advice. Please consult a SEBI-registered investment advisor before making any investment decisions.`

  // 8. Call AI model
  const { text } = await generateText({
    model: getAIModel(),
    maxOutputTokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  // 9. Upsert into rebalance_strategies (UNIQUE on family_id — replaces on conflict)
  await (supabase as any)
    .from('rebalance_strategies')
    .upsert(
      {
        family_id: familyId,
        strategy: text,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'family_id' }
    )

  return { strategy: text }
}
