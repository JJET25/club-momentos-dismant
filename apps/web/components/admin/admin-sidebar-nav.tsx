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
  Handshake,
  BarChart2,
  ShieldCheck,
  Settings,
  UserCog,
  LogOut,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { hasPermission, type PERMISSIONS } from '@/lib/permissions'
import { perspectiveOptionsFor, setPerspective } from './perspective-switcher'
import { ProfileMenu } from '@/components/profile-menu'

interface NavItem {
  href:       string
  label:      string
  icon:       LucideIcon
  permission?: keyof typeof PERMISSIONS
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
      { href: '/admin/invitations', label: 'Invitaciones', icon: Mail,      permission: 'MANAGE_INVITATIONS' },
      { href: '/admin/catalog',     label: 'Catálogo',     icon: Gift,      permission: 'MANAGE_CATALOG' },
      { href: '/admin/partners',    label: 'Aliados',      icon: Handshake, permission: 'MANAGE_PARTNERS' },
      { href: '/admin/promotions',  label: 'Promociones',  icon: Megaphone, permission: 'MANAGE_PROMOTIONS' },
      { href: '/admin/redemptions', label: 'Canjes',       icon: Ticket },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { href: '/admin/reports', label: 'Reportes',  icon: BarChart2,  permission: 'VIEW_REPORTS' },
      { href: '/admin/audit',   label: 'Auditoría', icon: ShieldCheck, permission: 'VIEW_AUDIT' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/team',     label: 'Equipo',         icon: UserCog,  permission: 'MANAGE_TEAM' },
      { href: '/admin/settings', label: 'Configuración',  icon: Settings, permission: 'MANAGE_SETTINGS' },
    ],
  },
]

function canSee(role: string, item: NavItem): boolean {
  if (!item.permission) return true
  return hasPermission(role, item.permission)
}

const ROLE_LABEL: Record<string, string> = {
  owner:      'Propietario',
  admin:      'Administrador',
  team_admin: 'Admin. de equipo',
  employee:   'Empleado',
}

interface Props {
  name: string
  role: string
  /** Empresas a las que tiene acceso la sesión */
  allowed: string[]
  /** Empresa activa ('' = vista combinada), ya resuelta en el servidor */
  perspective: string
}

export function AdminSidebarNav({ name, role, allowed, perspective }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const isGlobal = role === 'owner' || role === 'admin'
  // Vistas del menú de perfil: Global (solo owner/admin) + empresas asignadas
  const options  = perspectiveOptionsFor(isGlobal, allowed)

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

  const roleLabel    = ROLE_LABEL[role] ?? role
  const currentLabel = options.find(o => o.value === perspective)?.label ?? 'Global'

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
        <div className="mb-1">
          <ProfileMenu
            name={name}
            subtitle={`${roleLabel} · ${currentLabel}`}
            initials={initials}
            roleLabel={roleLabel}
            views={options}
            view={perspective}
            onSelectView={setPerspective}
          />
        </div>
        <ThemeToggle />
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
