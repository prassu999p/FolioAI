import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <span className="font-semibold text-lg">FolioAI</span>
          <span className="text-sm text-muted-foreground">{claims.email ?? ''}</span>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
