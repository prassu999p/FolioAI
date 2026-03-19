import { createClient } from '@/lib/supabase/server'
import { FamilyDashboard } from '@/components/family/family-dashboard'
import { notFound } from 'next/navigation'

export default async function FamilyDashboardPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params
  const supabase = await createClient()

  // Verify this family belongs to the authenticated user (RLS handles this too)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family } = await (supabase.from('families') as any)
    .select('id, name')
    .eq('id', familyId)
    .single() as { data: { id: string; name: string } | null }

  if (!family) notFound()

  return <FamilyDashboard familyId={familyId} />
}
