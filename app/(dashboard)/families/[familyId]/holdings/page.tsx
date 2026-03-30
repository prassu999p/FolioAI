// app/(dashboard)/families/[familyId]/holdings/page.tsx
// Server Component — unified stock holdings view for a family.
// Shows ALL stock holdings for every holder across all sources (zerodha, tradebook, manual).
// Redirect target after tradebook import.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StockHoldingsTable from '@/components/holdings/stock-holdings-table'

interface PageProps {
  params: Promise<{ familyId: string }>
}

export default async function StockHoldingsPage({ params }: PageProps) {
  const { familyId } = await params
  const supabase = await createClient()

  // Verify family belongs to this user (RLS enforces; notFound() gives a clean 404)
  const { data: family } = await (supabase as any)
    .from('families')
    .select('id, name')
    .eq('id', familyId)
    .single()

  if (!family) notFound()

  // Fetch all stock holdings for every holder in this family (all sources)
  const { data: stockHoldings } = await (supabase as any)
    .from('stock_holdings')
    .select(
      'id, tradingsymbol, exchange, isin, quantity, average_price, last_price, pnl, source, imported_at, import_filename, holder_id'
    )
    .in(
      'holder_id',
      (supabase as any).from('holders').select('id').eq('family_id', familyId)
    )
    .order('tradingsymbol')

  return (
    <>
      {/* TopAppBar */}
      <header
        className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-30"
        style={{ backgroundColor: '#f4faff' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href={`/families/${familyId}`}
            className="p-2 rounded-full hover:bg-[#c9e7f7] transition-colors"
            style={{ color: '#001f2a' }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h2
            className="text-xl font-bold tracking-tight font-headline"
            style={{ color: '#001736' }}
          >
            Stock Holdings
          </h2>
        </div>

        <Link
          href={`/families/${familyId}/import?tab=tradebook`}
          className="text-sm font-semibold px-4 py-2 rounded-xl border transition-colors hover:bg-[#e6f6ff]"
          style={{ color: '#006d43', borderColor: '#c9e7f7' }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">upload_file</span>
            Import Tradebook
          </span>
        </Link>
      </header>

      <main className="px-8 py-6">
        <StockHoldingsTable holdings={stockHoldings ?? []} />
      </main>
    </>
  )
}
