import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateFamilyForm } from '@/components/family/create-family-form'
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

  // No family yet — show create family form
  return (
    <div className="py-16 flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Welcome to FolioAI</h1>
        <p className="text-muted-foreground">
          Create a family portfolio to get started tracking your mutual fund investments.
        </p>
      </div>
      <CreateFamilyForm />
    </div>
  )
}
