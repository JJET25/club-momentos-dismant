'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
  ChevronsUpDown,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { hasPermission, type PERMISSIONS } from '@/lib/permissions'
import { PERSPECTIVE_OPTIONS, readPerspective, setPerspective } from './perspective-switcher'

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
}

export function AdminSidebarNav({ name, role }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const isGlobal = role === 'owner' || role === 'admin'

  const [perspective, setPerspectiveState] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPerspectiveState(readPerspective()) }, [])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

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

  const currentLabel = PERSPECTIVE_OPTIONS.find(o => o.value === perspective)?.label ?? 'Todas las empresas'

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
        <div ref={menuRef} className="relative mb-1">
          {/* Menú de perspectiva */}
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-white/10 bg-[#0f172a] shadow-xl overflow-hidden">
              <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Ver como
              </p>
              {PERSPECTIVE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPerspective(opt.value)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors
                    ${opt.value === perspective
                      ? 'text-white bg-white/10'
                      : 'text-brand-300 hover:text-white hover:bg-white/5'}`}
                >
                  {opt.label}
                  {opt.value === perspective && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {isGlobal ? (
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-white leading-none truncate">{name}</p>
                <p className="text-[11px] text-brand-400 mt-0.5 truncate">{currentLabel}</p>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            </button>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white leading-none truncate">{name}</p>
                <p className="text-[11px] text-brand-400 mt-0.5">{ROLE_LABEL[role] ?? role}</p>
              </div>
            </div>
          )}
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
