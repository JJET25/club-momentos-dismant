'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  LayoutGrid,
  Briefcase,
  PieChart,
  SlidersHorizontal,
  Check,
  ChevronsUpDown,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { hasPermission, type PERMISSIONS } from '@/lib/permissions'
import { perspectiveOptionsFor, setPerspective } from './perspective-switcher'
import { ProfileMenu } from '@/components/profile-menu'
import { RailNav, type RailGroup } from '@/components/rail-nav'

interface NavItem {
  href:       string
  label:      string
  icon:       LucideIcon
  permission?: keyof typeof PERMISSIONS
}

interface NavGroup {
  label: string
  icon:  LucideIcon
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    icon:  LayoutGrid,
    items: [
      { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/admin/members',   label: 'Miembros',   icon: Users },
      { href: '/admin/invoices',  label: 'Facturas',   icon: FileText },
    ],
  },
  {
    label: 'Gestión',
    icon:  Briefcase,
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
    icon:  PieChart,
    items: [
      { href: '/admin/reports', label: 'Reportes',  icon: BarChart2,  permission: 'VIEW_REPORTS' },
      { href: '/admin/audit',   label: 'Auditoría', icon: ShieldCheck, permission: 'VIEW_AUDIT' },
    ],
  },
  {
    label: 'Sistema',
    icon:  SlidersHorizontal,
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
  /** Marca de la vista activa (colores del riel y logo) */
  brand: { name: string; initial: string; logo?: string; sidebarBg: string }
}

export function AdminSidebarNav({ name, role, allowed, perspective, brand }: Props) {
  const router   = useRouter()
  const isGlobal = role === 'owner' || role === 'admin'
  // Vistas disponibles: Global (solo owner/admin) + empresas asignadas
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

  const groups: RailGroup[] = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(item => canSee(role, item)) }))
    .filter(g => g.items.length > 0)

  return (
    <RailNav
      groups={groups}
      railBg={brand.sidebarBg}
      logo={brand.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-xl object-contain bg-white" />
      ) : (
        <span className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-sm font-bold text-white" aria-label={brand.name}>
          {brand.initial}
        </span>
      )}
      panelTop={
        <div className="mb-3 space-y-3">
          <div className="px-1">
            <p className="text-[13px] font-semibold text-foreground leading-none">{brand.name}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Panel Admin</p>
          </div>
          <ViewSwitcher options={options} value={perspective} label={currentLabel} />
        </div>
      }
      railBottom={
        <ProfileMenu
          compact
          name={name}
          subtitle={`${roleLabel} · ${currentLabel}`}
          initials={initials}
          roleLabel={roleLabel}
          profileHref="/admin/account"
          // La vista se elige en el panel lateral; aquí solo las otras cuentas
          views={[]}
          footer={
            <>
              <ThemeToggle variant="menu" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm font-medium hover:bg-muted"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </>
          }
        />
      }
    />
  )
}

/** Selector de vista (Global o una empresa) arriba del panel de secciones. */
function ViewSwitcher({ options, value, label }: {
  options: { value: string; label: string; hint?: string }[]
  value:   string
  label:   string
}) {
  const [open, setOpen] = useState(false)
  const canSwitch = options.length > 1

  const badge = (
    <span className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200 flex items-center justify-center text-xs font-bold shrink-0">
      {label.slice(0, 1)}
    </span>
  )
  const text = (
    <span className="flex-1 min-w-0">
      <span className="block text-[11px] font-medium text-muted-foreground">Vista</span>
      <span className="block text-sm font-semibold text-foreground truncate">{label}</span>
    </span>
  )

  if (!canSwitch) {
    return <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-border bg-muted/40">{badge}{text}</div>
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left hover:bg-muted transition-colors"
      >
        {badge}{text}
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div role="menu" aria-label="Elegir vista" className="border-t border-border p-1">
          {options.map(o => (
            <button
              key={o.value || 'global'}
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => { if (o.value !== value) setPerspective(o.value); setOpen(false) }}
              className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-sm text-left transition-colors
                ${o.value === value ? 'bg-muted font-semibold' : 'hover:bg-muted'}`}
            >
              <span>
                {o.label}
                {o.hint && <span className="block text-xs font-normal text-muted-foreground">{o.hint}</span>}
              </span>
              {o.value === value && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
