'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  Gift,
  Megaphone,
  BarChart2,
  ShieldCheck,
  Settings,
  UserCog,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href:     string
  label:    string
  icon:     LucideIcon
  minRole?: 'employee' | 'admin' | 'owner'
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/admin/members',   label: 'Miembros',   icon: Users },
      { href: '/admin/invoices',  label: 'Facturas',   icon: FileText },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/admin/invitations', label: 'Invitaciones', icon: Mail,      minRole: 'admin' },
      { href: '/admin/catalog',     label: 'Catálogo',     icon: Gift,      minRole: 'admin' },
      { href: '/admin/promotions',  label: 'Promociones',  icon: Megaphone, minRole: 'admin' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { href: '/admin/reports', label: 'Reportes',  icon: BarChart2,  minRole: 'admin' },
      { href: '/admin/audit',   label: 'Auditoría', icon: ShieldCheck, minRole: 'admin' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/team',     label: 'Equipo',         icon: UserCog, minRole: 'owner' },
      { href: '/admin/settings', label: 'Configuración',  icon: Settings, minRole: 'owner' },
    ],
  },
]

const ROLE_RANK: Record<string, number> = { employee: 1, admin: 2, owner: 3 }

function canSee(role: string, item: NavItem): boolean {
  if (!item.minRole) return true
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[item.minRole] ?? 0)
}

const ROLE_LABEL: Record<string, string> = {
  owner:    'Propietario',
  admin:    'Administrador',
  employee: 'Empleado',
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

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <>
      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const visible = group.items.filter(item => canSee(role, item))
          if (!visible.length) return null
          return (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-500 select-none">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visible.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon   = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${active
                          ? 'bg-white/10 text-white'
                          : 'text-brand-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-brand-500'}`} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="px-3 py-4 border-t border-brand-800">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-none truncate">{name}</p>
            <p className="text-[11px] text-brand-400 mt-0.5">{ROLE_LABEL[role] ?? role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-brand-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
