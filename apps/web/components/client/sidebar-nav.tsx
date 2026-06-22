'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Gift,
  FileText,
  ShoppingBag,
  BarChart2,
  Megaphone,
  Bell,
  LogOut,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/admin/theme-toggle'

interface NavItem {
  href:  string
  label: string
  icon:  LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',   label: 'Inicio',           icon: LayoutDashboard },
      { href: '/statement',   label: 'Estado de Cuenta', icon: BarChart2 },
    ],
  },
  {
    label: 'Tienda',
    items: [
      { href: '/catalog',    label: 'Catálogo',    icon: Gift },
      { href: '/promotions', label: 'Promociones', icon: Megaphone },
    ],
  },
  {
    label: 'Historial',
    items: [
      { href: '/invoices',    label: 'Mis Facturas', icon: FileText },
      { href: '/redemptions', label: 'Mis Canjes',   icon: ShoppingBag },
    ],
  },
  {
    label: 'Privacidad',
    items: [
      { href: '/arco', label: 'Derechos ARCO', icon: Shield },
    ],
  },
]

interface Notification {
  id:         string
  type:       string
  title:      string
  body:       string
  metadata:   Record<string, unknown> | null
  read_at:    string | null
  created_at: string
}

interface Props {
  name:     string
  email:    string
  initials: string
}

export function SidebarNav({ name, email, initials }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs]       = useState<Notification[]>([])
  const [unread, setUnread]       = useState(0)
  const [loadingN, setLoadingN]   = useState(false)

  async function fetchNotifications() {
    setLoadingN(true)
    const res = await fetch('/api/client/notifications')
    if (res.ok) {
      const { notifications, unreadCount } = await res.json()
      setNotifs(notifications)
      setUnread(unreadCount)
    }
    setLoadingN(false)
  }

  useEffect(() => { fetchNotifications() }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      import('@/lib/firebase-client').then(m => m.requestAndSavePushToken()).catch(() => {})
    }
  }, [])

  async function openNotifications() {
    setNotifOpen(true)
    if (unread > 0) {
      await fetch('/api/client/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      })
      setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      setUnread(0)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  type NotifIcon = { Icon: LucideIcon; bg: string; color: string }
  const NOTIF_ICONS: Record<string, NotifIcon> = {
    'invoice.approved':  { Icon: CheckCircle2, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
    'invoice.rejected':  { Icon: XCircle,      bg: 'bg-red-500/10',     color: 'text-red-500'     },
    'points.adjustment': { Icon: Zap,          bg: 'bg-blue-500/10',    color: 'text-blue-500'    },
    'redemption.ready':  { Icon: Gift,         bg: 'bg-orange-500/10',  color: 'text-orange-500'  },
  }

  return (
    <>
      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-500 select-none">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
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
        ))}
      </nav>

      {/* Footer: notificaciones + usuario + logout */}
      <div className="px-3 py-4 border-t border-brand-800 space-y-0.5">

        {/* Campana de notificaciones */}
        <button
          onClick={openNotifications}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-brand-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <span className="relative">
            <Bell className="w-4 h-4 shrink-0 text-brand-500" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          Notificaciones
          {unread > 0 && (
            <span className="ml-auto text-xs font-medium text-red-400">{unread}</span>
          )}
        </button>

        {/* Usuario — clic lleva al perfil */}
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all group ${
            pathname === '/profile' ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-2 transition-all ${
            pathname === '/profile' ? 'bg-brand-500 ring-brand-400' : 'bg-brand-700 ring-transparent group-hover:ring-brand-600'
          }`}>
            <span className="text-[11px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white leading-none truncate">{name}</p>
            <p className="text-[11px] text-brand-400 mt-0.5 truncate">{email}</p>
          </div>
        </Link>

        <ThemeToggle />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-brand-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>

      {/* Panel de notificaciones */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="bg-background border border-border rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-base text-foreground">Notificaciones</h3>
              <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingN ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Cargando…</div>
              ) : notifs.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Sin notificaciones por ahora.</p>
                </div>
              ) : notifs.map(n => (
                <div
                  key={n.id}
                  className={`px-5 py-4 border-b border-border last:border-b-0 ${!n.read_at ? 'bg-blue-500/5' : ''}`}
                >
                  <div className="flex gap-3">
                    {(() => {
                      const cfg = NOTIF_ICONS[n.type]
                      const Icon = cfg?.Icon ?? Bell
                      const bg   = cfg?.bg   ?? 'bg-muted'
                      const col  = cfg?.color ?? 'text-muted-foreground'
                      return (
                        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${col}`} />
                        </div>
                      )
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{fmtDate(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
