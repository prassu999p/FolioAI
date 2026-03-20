import { createClient } from '@/lib/supabase/server'
import { FamilyDashboard } from '@/components/family/family-dashboard'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function FamilyDashboardPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family } = await (supabase.from('families') as any)
    .select('id, name')
    .eq('id', familyId)
    .single() as { data: { id: string; name: string } | null }

  if (!family) notFound()

  return (
    <>
      {/* Sticky TopAppBar */}
      <header
        className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-30"
        style={{ backgroundColor: '#f4faff' }}
      >
        <div className="flex items-center gap-8">
          <h2 className="text-xl font-bold tracking-tight font-headline" style={{ color: '#002B5B' }}>
            Family Dashboard
          </h2>
          <Link
            href={`/families/${familyId}/import`}
            className="font-bold border-b-2 py-1 text-sm transition-colors"
            style={{ color: '#002B5B', borderColor: '#002B5B' }}
          >
            Import CAS
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full transition-colors hover:bg-[#c9e7f7]" style={{ color: 'rgba(0,31,42,0.6)' }}>
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 rounded-full transition-colors hover:bg-[#c9e7f7]" style={{ color: 'rgba(0,31,42,0.6)' }}>
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: '#002B5B' }}
          >
            {family.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="p-8 max-w-7xl mx-auto">
        <FamilyDashboard familyId={familyId} />
      </div>
    </>
  )
}
