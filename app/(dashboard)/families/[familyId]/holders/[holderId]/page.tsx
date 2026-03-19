import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HoldingsTable } from '@/components/holdings/holdings-table'
import { ManualEntryForm } from '@/components/manual-entry/manual-entry-form'
import type { HoldingRow } from '@/lib/supabase/types'

interface HolderHoldingsPageProps {
  params: Promise<{ familyId: string; holderId: string }>
}

async function HoldingsList({ holderId }: { holderId: string }) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: holdings, error } = await (supabase as any).rpc('get_holder_holdings', {
    p_holder_id: holderId,
  })

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load holdings: {error.message}
      </p>
    )
  }

  return <HoldingsTable holdings={(holdings ?? []) as HoldingRow[]} />
}

export default async function HolderHoldingsPage({ params }: HolderHoldingsPageProps) {
  const { familyId, holderId } = await params

  const supabase = await createClient()
  const { data: holderData } = await supabase
    .from('holders')
    .select('id, name, pan')
    .eq('id', holderId)
    .single()
  const holder = holderData as { id: string; name: string; pan: string } | null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {holder?.name ?? 'Holdings'}
          </h1>
          {holder && (
            <p className="text-sm text-muted-foreground mt-1">PAN: {holder.pan}</p>
          )}
        </div>
        <div className="flex gap-2">
          <ManualEntryForm
            holderId={holderId}
            onEntryComplete={() => {}}
          />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground py-8 text-center">
            Loading holdings...
          </div>
        }
      >
        <HoldingsList holderId={holderId} />
      </Suspense>
    </div>
  )
}
