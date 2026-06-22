'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, XCircle, Gift, AlertTriangle, Star } from 'lucide-react'

interface Notification {
  id: string; type: string; title: string; body: string
  read_at: string | null; created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const NOTIF_ICONS: Record<string, { Icon: typeof Bell; bg: string; color: string }> = {
  invoice_approved: { Icon: CheckCircle2, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  invoice_rejected: { Icon: XCircle,      bg: 'bg-red-500/10',     color: 'text-red-500'     },
  redemption:       { Icon: Gift,         bg: 'bg-orange-500/10',  color: 'text-orange-500'  },
  points_expiring:  { Icon: AlertTriangle,bg: 'bg-amber-500/10',   color: 'text-amber-500'   },
  welcome:          { Icon: Star,         bg: 'bg-blue-500/10',    color: 'text-blue-500'    },
}

export function NotificationsSection() {
  const [notifs, setNotifs]   = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread]   = useState(0)

  useEffect(() => {
    fetch('/api/client/notifications')
      .then(r => r.json())
      .then(({ notifications, unreadCount }) => {
        setNotifs((notifications ?? []).slice(0, 5))
        setUnread(unreadCount ?? 0)
      })
      .finally(() => setLoading(false))
  }, [])

  async function markAllRead() {
    await fetch('/api/client/notifications', { method: 'PATCH' })
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnread(0)
  }

  if (loading) return <div className="h-32 bg-muted rounded-xl animate-pulse" />

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Notificaciones</h2>
          {unread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">
            Marcar todas como leídas
          </button>
        )}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {notifs.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin notificaciones por ahora.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifs.map(n => {
              const cfg = NOTIF_ICONS[n.type]
              const Icon = cfg?.Icon ?? Bell
              return (
                <li key={n.id} className={`flex items-start gap-4 px-5 py-4 ${!n.read_at ? 'bg-blue-500/5' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl ${cfg?.bg ?? 'bg-muted'} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg?.color ?? 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                      {!n.read_at && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{fmtDate(n.created_at)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
