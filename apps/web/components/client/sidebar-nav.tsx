'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Inicio',          icon: '🏠' },
  { href: '/catalog',     label: 'Catálogo',         icon: '🎁' },
  { href: '/invoices',    label: 'Mis Facturas',     icon: '📄' },
  { href: '/redemptions', label: 'Mis Canjes',       icon: '🎫' },
  { href: '/statement',   label: 'Estado de Cuenta', icon: '📊' },
  { href: '/promotions',  label: 'Promociones',      icon: '📢' },
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

  const [notifOpen, setNotifOpen]   = useState(false)
  const [notifs, setNotifs]         = useState<Notification[]>([])
  const [unread, setUnread]         = useState(0)
  const [loadingN, setLoadingN]     = useState(false)

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

  async function openNotifications() {
    setNotifOpen(true)
    if (unread > 0) {
      await fetch('/api/client/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [] }) })
      setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      setUnread(0)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const typeIcon: Record<string, string> = {
    'invoice.approved': '✅',
    'invoice.rejected': '❌',
    'points.adjustment': '⚡',
    'redemption.ready': '🎁',
  }

  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Notificaciones + Perfil + logout */}
      <div className="p-4 border-t space-y-1">

        {/* Campana de notificaciones */}
        <button
          onClick={openNotifications}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full relative"
        >
          <span className="relative">
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          Notificaciones
          {unread > 0 && (
            <span className="ml-auto text-xs font-medium text-red-500">{unread} nueva{unread !== 1 ? 's' : ''}</span>
          )}
        </button>

        {/* Panel de notificaciones */}
        {notifOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setNotifOpen(false)}>
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="font-bold text-base">Notificaciones</h3>
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
                    <p className="text-3xl mb-3">🔔</p>
                    <p className="text-sm text-muted-foreground">Sin notificaciones por ahora.</p>
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className={`px-5 py-4 border-b last:border-b-0 ${!n.read_at ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg shrink-0">{typeIcon[n.type] ?? '📩'}</span>
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

        {/* Avatar / Perfil */}
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
            ${pathname === '/profile'
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'}`}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
            <span className="text-xs font-bold text-primary-foreground">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
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
