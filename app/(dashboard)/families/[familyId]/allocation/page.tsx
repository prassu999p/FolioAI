import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AllocationPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params
  
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null

  if (!claims) {
    redirect('/login')
  }

  // Get all holders for this family
  const { data: holders } = await supabase
    .from('holders')
    .select('id')
    .eq('family_id', familyId) as { data: Array<{ id: string }> | null }

  if (!holders || holders.length === 0) {
    return (
      <div className="px-12 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary">Asset Allocation</h2>
          <p className="text-on-surface-variant mt-1">
            Current portfolio distribution by fund category
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No holders found.</p>
        </div>
      </div>
    )
  }

  // Get holdings for all holders
  const holderIds = holders.map(h => h.id)
  const { data: holdings } = await supabase
    .from('holdings')
    .select('scheme_code, current_value')
    .in('holder_id', holderIds)
    .gt('net_units', 0) as { data: Array<{ scheme_code: number; current_value: number | null }> | null }

  // Get fund categories
  const schemeCodes = [...new Set(holdings?.map(h => h.scheme_code) ?? [])]
  const { data: funds } = await supabase
    .from('funds')
    .select('scheme_code, category')
    .in('scheme_code', schemeCodes) as { data: Array<{ scheme_code: number; category: string }> | null }

  const categoryMap = new Map(funds?.map(f => [f.scheme_code, f.category]) ?? [])

  // Calculate allocation by category
  const categoryValues = new Map<string, number>()
  let total = 0
  
  if (holdings) {
    for (const h of holdings) {
      const cat = categoryMap.get(h.scheme_code) || 'Unknown'
      const val = h.current_value || 0
      categoryValues.set(cat, (categoryValues.get(cat) || 0) + val)
      total += val
    }
  }

  const allocation = Array.from(categoryValues.entries())
    .map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="px-12 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary">Asset Allocation</h2>
        <p className="text-on-surface-variant mt-1">
          Current portfolio distribution by fund category
        </p>
      </div>

      {allocation.length > 0 ? (
        <div className="space-y-6">
          {/* Total AUM */}
          <div className="bg-surface-container-lowest rounded-2xl p-8">
            <p className="text-sm text-on-surface-variant mb-2">Total AUM</p>
            <p className="text-4xl font-bold text-primary">
              ₹{total.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Allocation bars */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
            <h3 className="font-bold text-primary">Category Distribution</h3>
            {allocation.map(({ category, value, percentage }) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">{category}</span>
                  <span className="text-on-surface-variant">
                    ₹{value.toLocaleString('en-IN')} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No holdings found.</p>
          <p className="text-sm text-on-surface-variant mt-2">
            Import a CAS or add holdings to see allocation.
          </p>
        </div>
      )}
    </div>
  )
}
