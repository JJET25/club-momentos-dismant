'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavItem {
  href:      string
  label:     string
  icon:      string
  minRole?:  'employee' | 'admin' | 'owner'  // mínimo rol requerido (default: employee)
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard',   label: 'Dashboard',     icon: '📊' },
  { href: '/admin/members',     label: 'Miembros',      icon: '👥' },
  { href: '/admin/invoices',    label: 'Facturas',      icon: '📄' },
  { href: '/admin/invitations', label: 'Invitaciones',  icon: '✉️',  minRole: 'admin' },
  { href: '/admin/catalog',     label: 'Catálogo',      icon: '🎁',  minRole: 'admin' },
  { href: '/admin/promotions',  label: 'Promociones',   icon: '📢',  minRole: 'admin' },
  { href: '/admin/reports',     label: 'Reportes',      icon: '📈',  minRole: 'admin' },
  { href: '/admin/audit',       label: 'Auditoría',     icon: '🔍',  minRole: 'admin' },
  { href: '/admin/settings',    label: 'Configuración', icon: '⚙️',  minRole: 'owner' },
]

const ROLE_RANK: Record<string, number> = {
  employee: 1,
  admin:    2,
  owner:    3,
}

function canSee(role: string, item: NavItem): boolean {
  if (!item.minRole) return true
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[item.minRole] ?? 0)
}

interface Props {
  name: string
  role: string
}

export function AdminSidebarNav({ name, role }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const roleLabel: Record<string, string> = {
    owner:    'Propietario',
    admin:    'Administrador',
    employee: 'Empleado',
  }

  const visibleItems = NAV_ITEMS.filter(item => canSee(role, item))

  return (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-brand-300 hover:text-white hover:bg-white/10'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-brand-800 space-y-1">
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          <p className="text-xs text-brand-400">{roleLabel[role] ?? role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-400 hover:text-white hover:bg-white/10 transition-colors w-full"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
