'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Home,
  Store,
  History,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { ThemeToggle } from '@/components/admin/theme-toggle'
import { ProfileMenu } from '@/components/profile-menu'
import { Skeleton, SkeletonRegion } from '@/components/ui/skeleton'
import { RailNav } from '@/components/rail-nav'

interface NavItem {
  href:  string
  label: string
  icon:  LucideIcon
}

interface NavGroup {
  label: string
  icon:  LucideIcon
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    icon:  Home,
    items: [
      { href: '/dashboard',   label: 'Inicio',           icon: LayoutDashboard },
      { href: '/statement',   label: 'Estado de Cuenta', icon: BarChart2 },
    ],
  },
  {
    label: 'Tienda',
    icon:  Store,
    items: [
      { href: '/catalog',    label: 'Catálogo',    icon: Gift },
      { href: '/promotions', label: 'Promociones', icon: Megaphone },
    ],
  },
  {
    label: 'Historial',
    icon:  History,
    items: [
      { href: '/invoices',    label: 'Mis Facturas', icon: FileText },
      { href: '/redemptions', label: 'Mis Canjes',   icon: ShoppingBag },
    ],
  },
  {
    label: 'Privacidad',
    icon:  Shield,
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
  /** Empresa del portal (para el subtítulo y el rol del menú de perfil) */
  company:  string
  /** Marca de la empresa (colores del riel y logo) */
  brand:    { name: string; logo?: string; initial: string; sidebarBg: string }
  /** Preferencia del miembro; si la apagó no se le vuelve a pedir permiso */
  pushEnabled: boolean
}

export function SidebarNav({ name, email, initials, company, brand, pushEnabled }: Props) {
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
    if (pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      import('@/lib/firebase-client').then(m => m.requestAndSavePushToken()).catch(() => {})
    }
  }, [pushEnabled])

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
      <RailNav
        groups={NAV_GROUPS}
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
              <p className="text-[11px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Mi Portal</p>
            </div>
            <Link
              href="/invoices"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <Upload className="w-4 h-4" /> Subir factura
            </Link>
          </div>
        }
        railBottom={
          <>
            <button
              onClick={openNotifications}
              aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
              title="Notificaciones"
              className="relative w-11 h-11 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {/* Menú de perfil: perfil, cambio de empresa, tema y salida */}
            <ProfileMenu
              compact
              name={name}
              subtitle={`Miembro · ${company}`}
              initials={initials}
              roleLabel={`Miembro · ${company} · ${email}`}
              profileHref="/profile"
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
          </>
        }
      />

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
                <SkeletonRegion label="Cargando notificaciones…" className="divide-y divide-border">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex gap-3 px-5 py-4">
                      <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/4" /></div>
                    </div>
                  ))}
                </SkeletonRegion>
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
