import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SyncButton } from '@/components/nav/sync-button'
import { AddHolderForm } from '@/components/family/add-holder-form'
import type { HoldingRow } from '@/lib/supabase/types'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

interface HolderWithAUM {
  id: string
  name: string
  pan: string
  totalCurrentValue: number | null
  oldestNavDate: string | null
}

interface FamilyDashboardProps {
  familyId: string
}

export async function FamilyDashboard({ familyId }: FamilyDashboardProps) {
  const supabase = await createClient()

  // Fetch family info with holders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family } = await (supabase.from('families') as any)
    .select('id, name, holders(id, name, pan)')
    .eq('id', familyId)
    .single() as {
      data: {
        id: string
        name: string
        holders: Array<{ id: string; name: string; pan: string }>
      } | null
    }

  if (!family) {
    return <p className="text-muted-foreground">Family not found.</p>
  }

  // For each holder, get their holdings via RPC to compute AUM
  const holdersWithAUM: HolderWithAUM[] = await Promise.all(
    family.holders.map(async (holder) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: holdings } = await (supabase as any).rpc('get_holder_holdings', {
        p_holder_id: holder.id,
      }) as { data: HoldingRow[] | null }

      const holdingsList = holdings ?? []
      const hasNavData = holdingsList.some(h => h.current_value !== null)

      const totalCurrentValue = hasNavData
        ? holdingsList.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
        : null

      // Find oldest nav_date (least recently updated fund)
      const navDates = holdingsList
        .map(h => h.current_nav_date)
        .filter((d): d is string => d !== null)

      const oldestNavDate = navDates.length > 0
        ? navDates.sort()[0]  // lexicographic sort works for ISO dates
        : null

      return {
        id: holder.id,
        name: holder.name,
        pan: holder.pan,
        totalCurrentValue,
        oldestNavDate,
      }
    })
  )

  // Total AUM — only if all holders have nav data
  const allHaveNav = holdersWithAUM.every(h => h.totalCurrentValue !== null)
  const totalAUM = allHaveNav
    ? holdersWithAUM.reduce((sum, h) => sum + (h.totalCurrentValue ?? 0), 0)
    : null

  // Oldest nav date across all holders
  const allNavDates = holdersWithAUM
    .map(h => h.oldestNavDate)
    .filter((d): d is string => d !== null)
  const oldestNavDate = allNavDates.length > 0 ? allNavDates.sort()[0] : null

  // Mask PAN: show only last 4 chars
  function maskPAN(pan: string): string {
    return pan.length >= 4 ? `XXXXXX${pan.slice(-4)}` : pan
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{family.name}</h1>
          {oldestNavDate && (
            <p className="text-sm text-muted-foreground mt-1">
              NAV as of {oldestNavDate}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <AddHolderForm familyId={familyId} />
          <SyncButton />
        </div>
      </div>

      {/* Total AUM Card */}
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground mb-1">Total Family AUM</p>
        <p className="text-3xl font-bold font-mono">
          {totalAUM !== null ? formatINR(totalAUM) : '—'}
        </p>
        {totalAUM === null && (
          <p className="text-xs text-muted-foreground mt-1">
            Sync NAV to calculate current portfolio value
          </p>
        )}
      </div>

      {/* Holder Cards */}
      {holdersWithAUM.length === 0 ? (
        <p className="text-muted-foreground">
          No holders yet. Use &ldquo;Add Holder&rdquo; to get started.
        </p>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4">Holders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdersWithAUM.map((holder) => (
              <Link
                key={holder.id}
                href={`/families/${familyId}/holders/${holder.id}`}
                className="block"
              >
                <div className="rounded-lg border bg-card p-4 hover:bg-accent transition-colors cursor-pointer">
                  <p className="font-medium">{holder.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {maskPAN(holder.pan)}
                  </p>
                  <p className="text-xl font-bold font-mono mt-3">
                    {holder.totalCurrentValue !== null
                      ? formatINR(holder.totalCurrentValue)
                      : '—'}
                  </p>
                  {holder.oldestNavDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      NAV as of {holder.oldestNavDate}
                    </p>
                  )}
                  <p className="text-xs text-primary mt-2">View Holdings →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
