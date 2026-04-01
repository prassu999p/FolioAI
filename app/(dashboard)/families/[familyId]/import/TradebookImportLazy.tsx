'use client'

// TradebookImportLazy.tsx
// Client component wrapper that lazy-loads TradebookImportForm with ssr: false.
// This avoids SheetJS (xlsx) from bloating the main bundle while keeping the
// parent import/page.tsx as a Server Component.

import dynamic from 'next/dynamic'

const TradebookImportForm = dynamic(
  () => import('./TradebookImportForm'),
  { ssr: false, loading: () => (
    <div className="px-8 py-12 text-center" style={{ color: '#43474f' }}>
      <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: '#c9e7f7' }}>
        progress_activity
      </span>
      <p className="text-sm">Loading…</p>
    </div>
  ) }
)

interface TradebookImportLazyProps {
  familyId: string
  holders: Array<{ id: string; name: string }>
}

export default function TradebookImportLazy({ familyId, holders }: TradebookImportLazyProps) {
  return <TradebookImportForm familyId={familyId} holders={holders} />
}
