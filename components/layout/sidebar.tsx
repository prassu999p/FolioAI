'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  icon: string
  href: string
}

interface SidebarProps {
  navItems: NavItem[]
}

export function Sidebar({ navItems }: SidebarProps) {
  const pathname = usePathname()

  const isNavItemActive = (itemHref: string): boolean => {
    // For dashboard, check if path is exactly /dashboard or matches the family pattern
    if (itemHref === '/dashboard') {
      return pathname === '/dashboard'
    }

    // For family-scoped routes, check if pathname starts with the href
    // This handles /families/{familyId}/holders, /families/{familyId}/allocation, etc.
    return pathname.startsWith(itemHref)
  }

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 h-screen z-40 w-64 transition-all duration-300 ease-in-out"
      style={{ backgroundColor: '#e6f6ff' }}
    >
      {/* Logo */}
      <div className="px-8 py-10">
        <h1
          className="text-2xl font-black font-headline tracking-tight"
          style={{ color: '#002B5B' }}
        >
          FolioAI
        </h1>
        <p
          className="text-xs uppercase tracking-widest font-medium mt-1"
          style={{ color: 'rgba(0,31,42,0.6)' }}
        >
          The Digital Fiduciary
        </p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ label, icon, href }) => {
          const isActive = isNavItemActive(href)
          return (
            <Link
              key={label}
              href={href}
              className={
                isActive
                  ? 'flex items-center px-8 py-4 bg-white rounded-r-full font-bold shadow-sm transition-all duration-300'
                  : 'flex items-center px-8 py-4 transition-all duration-300 hover:bg-[#c9e7f7]/50'
              }
              style={
                isActive ? { color: '#002B5B' } : { color: 'rgba(0,31,42,0.7)' }
              }
            >
              <span className="material-symbols-outlined mr-4">{icon}</span>
              <span className="font-label text-sm">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Ask AI CTA */}
      <div className="p-6">
        <button
          className="w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 text-white"
          style={{ backgroundColor: '#001736' }}
        >
          <span
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          Ask AI Intelligence
        </button>
      </div>

      {/* Support + Settings */}
      <div className="px-6 pb-6 space-y-2 border-t border-black/5 pt-4">
        <Link
          href="#"
          className="flex items-center text-sm transition-colors"
          style={{ color: 'rgba(0,31,42,0.7)' }}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">
            help
          </span>
          Support
        </Link>
        <Link
          href="#"
          className="flex items-center text-sm transition-colors"
          style={{ color: 'rgba(0,31,42,0.7)' }}
        >
          <span className="material-symbols-outlined mr-3 text-[18px]">
            settings
          </span>
          Settings
        </Link>
      </div>
    </aside>
  )
}
