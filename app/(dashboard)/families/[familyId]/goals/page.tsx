import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function GoalsPage({
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

  return (
    <div className="px-12 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary">Goals</h2>
        <p className="text-on-surface-variant mt-1">
          Track financial goals and retirement planning
        </p>
      </div>

      <div className="text-center py-12">
        <div className="mb-4">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant">
            track_changes
          </span>
        </div>
        <p className="text-on-surface-variant">Goals tracking coming soon!</p>
        <p className="text-sm text-on-surface-variant mt-2">
          This feature will be available in Phase 5.
        </p>
      </div>
    </div>
  )
}
