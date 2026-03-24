import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HoldersPage({
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

  // Get holders for this family
  const { data: holders } = await supabase
    .from('holders')
    .select('id, name, pan, is_primary, created_at')
    .eq('family_id', familyId)
    .order('is_primary', { ascending: false }) as { data: Array<{ id: string; name: string; pan: string; is_primary: boolean; created_at: string }> | null }

  if (!holders || holders.length === 0) {
    return (
      <div className="px-12 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary">Individual Holders</h2>
          <p className="text-on-surface-variant mt-1">
            Manage family members and their portfolios
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No holders found.</p>
          <p className="text-sm text-on-surface-variant mt-2">
            Import a CAS to add holders, or add manually.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-12 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary">Individual Holders</h2>
        <p className="text-on-surface-variant mt-1">
          Manage family members and their portfolios
        </p>
      </div>

      <div className="grid gap-4">
        {holders.map((holder) => (
          <a
            key={holder.id}
            href={`/families/${familyId}/holders/${holder.id}`}
            className="block p-6 bg-surface-container-lowest rounded-xl hover:bg-surface-container-high transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary">
                  {holder.name}
                  {holder.is_primary && (
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  PAN: {holder.pan}
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">
                chevron_right
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
