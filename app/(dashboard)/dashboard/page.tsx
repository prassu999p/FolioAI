import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Family } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null

  // Find this user's family and redirect to it
  const { data: familyData } = await supabase
    .from('families')
    .select('*')
    .eq('user_id', claims!.sub)
    .single()

  const family = familyData as Family | null

  if (family) {
    redirect(`/families/${family.id}`)
  }

  // No family yet — show create family prompt (Plan 06 implements the full UI)
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-semibold mb-2">Welcome to FolioAI</h1>
      <p className="text-muted-foreground">Set up your family portfolio to get started.</p>
      {/* Family creation form — implemented in Plan 06 */}
    </div>
  )
}
