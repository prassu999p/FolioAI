import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'
import { ChatWidget } from '@/components/ai/chat-widget'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null

  if (!claims) {
    redirect('/login')
  }

  // Try to get user's first family for nav links
  const { data: families } = await supabase
    .from('families')
    .select('id')
    .eq('user_id', claims.sub)
    .limit(1) as { data: Array<{ id: string }> | null }

  const familyId = families?.[0]?.id ?? null

  // Always start with dashboard - it handles redirect to family or create form
  const NAV_ITEMS = [
    { label: 'Family Dashboard', icon: 'dashboard', href: '/dashboard' },
    { label: 'Individual Holders', icon: 'group', href: familyId ? `/families/${familyId}/holders` : '/dashboard' },
    { label: 'Asset Allocation', icon: 'pie_chart', href: familyId ? `/families/${familyId}/allocation` : '/dashboard' },
    { label: 'Goals', icon: 'track_changes', href: familyId ? `/families/${familyId}/goals` : '/dashboard' },
    { label: 'Tax Intelligence', icon: 'receipt_long', href: familyId ? `/families/${familyId}/tax` : '/dashboard' },
    { label: 'AI Insights', icon: 'auto_awesome', href: familyId ? `/families/${familyId}/ai` : '/dashboard' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar navItems={NAV_ITEMS} />

      {/* Main Content */}
      <main className="ml-64 min-h-screen" style={{ backgroundColor: '#f4faff' }}>
        {children}
        <ChatWidget familyId={familyId} />
      </main>
    </div>
  )
}
