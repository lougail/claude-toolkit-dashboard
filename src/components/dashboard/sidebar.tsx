'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  GitBranch,
  ShieldCheck,
  Scale,
  Activity,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarSparklines } from '@/components/dashboard/sidebar-sparklines'

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/audits', label: 'Audits', icon: ShieldCheck },
  { href: '/decisions', label: 'Decisions', icon: Scale },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-white/[0.06] bg-zinc-950 flex flex-col">
      <div className="px-5 py-5">
        <p className="text-sm font-semibold tracking-tight text-zinc-100">
          Claude Toolkit
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">Dashboard</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13px] transition-colors',
                active
                  ? 'bg-white/[0.08] text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <SidebarSparklines />

      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-zinc-500">v0.1.0</p>
      </div>
    </aside>
  )
}
