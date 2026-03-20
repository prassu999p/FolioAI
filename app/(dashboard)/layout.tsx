import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SyncButton } from '@/components/nav/sync-button'

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
    <div className="min-h-screen">
      {/* Fixed Left Sidebar */}
      <aside className="flex flex-col fixed left-0 top-0 h-screen z-40 bg-surface-container-low w-64">
        {/* Logo */}
        <div className="p-8">
          <h1 className="text-2xl font-black font-headline text-primary">FolioAI</h1>
          <p className="text-xs font-medium text-on-surface-variant/70 uppercase tracking-widest mt-1">
            The Digital Fiduciary
          </p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-2">
          <Link
            href="/families"
            className="flex items-center gap-3 px-4 py-3 text-on-surface/70 hover:text-primary hover:bg-surface-container/50 transition-all rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm font-medium">Family Dashboard</span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-on-surface/70 hover:text-primary hover:bg-surface-container/50 transition-all rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span className="text-sm font-medium">AI Insights</span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-on-surface/70 hover:text-primary hover:bg-surface-container/50 transition-all rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="text-sm font-medium">Tax Intelligence</span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-on-surface/70 hover:text-primary hover:bg-surface-container/50 transition-all rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">track_changes</span>
            <span className="text-sm font-medium">Goals</span>
          </Link>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 mt-auto space-y-2">
          <SyncButton />
          <div className="flex gap-4 px-4 pt-2">
            <Link href="#" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
              Settings
            </Link>
            <Link href="#" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
              Support
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen bg-surface">
        {children}
      </main>
    </div>
  )
}
