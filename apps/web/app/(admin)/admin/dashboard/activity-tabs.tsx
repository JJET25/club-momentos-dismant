'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText, ShoppingBag, Users, Gift, Building2,
  Clock, CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react'

export interface RecentInvoice {
  id: string; status: string; total_amount: number; created_at: string; company: string
}
export interface RecentRedemption {
  id: string; status: string; points_used: number; created_at: string; company: string; reward: string
}
export interface RecentMember {
  id: string; company_name: string; email: string; created_at: string; status: string
}

interface Props {
  recentInvoices: RecentInvoice[]
  recentRedemptions: RecentRedemption[]
  recentMembers: RecentMember[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'Pendiente',  cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    approved: { label: 'Aprobada',   cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    rejected: { label: 'Rechazada',  cls: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function RedemptionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'Pendiente',  cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    processing: { label: 'En proceso', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    fulfilled:  { label: 'Surtido',    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    cancelled:  { label: 'Cancelado',  cls: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function MemberStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Activo',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    inactive:  { label: 'Inactivo',   cls: 'bg-muted text-muted-foreground' },
    suspended: { label: 'Suspendido', cls: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <Icon className="w-7 h-7 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export function ActivityTabs({ recentInvoices, recentRedemptions, recentMembers }: Props) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'redemptions' | 'members'>('invoices')

  return (
    <div className="xl:col-span-2 bg-card rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
        <div className="flex gap-1">
          {([
            { key: 'invoices',    label: 'Facturas'  },
            { key: 'redemptions', label: 'Canjes'    },
            { key: 'members',     label: 'Miembros'  },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'invoices' ? (
        !recentInvoices.length ? (
          <EmptyState icon={FileText} text="Sin facturas recientes" />
        ) : (
          <div className="divide-y divide-border">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  inv.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600'
                  : inv.status === 'rejected' ? 'bg-red-500/10 text-red-600'
                  : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {inv.status === 'approved' ? <CheckCircle2 className="w-4 h-4" />
                    : inv.status === 'rejected' ? <XCircle className="w-4 h-4" />
                    : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inv.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.total_amount > 0
                      ? `$${inv.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : '—'
                    } · {timeAgo(inv.created_at)}
                  </p>
                </div>
                <InvoiceStatusBadge status={inv.status} />
              </div>
            ))}
            <div className="px-6 py-3 border-t">
              <Link href="/admin/invoices" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas las facturas <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      ) : activeTab === 'redemptions' ? (
        !recentRedemptions.length ? (
          <EmptyState icon={ShoppingBag} text="Sin canjes recientes" />
        ) : (
          <div className="divide-y divide-border">
            {recentRedemptions.map(red => (
              <div key={red.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{red.reward}</p>
                  <p className="text-xs text-muted-foreground">
                    {red.company} · {red.points_used.toLocaleString('es-MX')} pts · {timeAgo(red.created_at)}
                  </p>
                </div>
                <RedemptionStatusBadge status={red.status} />
              </div>
            ))}
            <div className="px-6 py-3 border-t">
              <Link href="/admin/redemptions" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos los canjes <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      ) : (
        !recentMembers.length ? (
          <EmptyState icon={Users} text="Sin miembros recientes" />
        ) : (
          <div className="divide-y divide-border">
            {recentMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.company_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email} · {timeAgo(m.created_at)}</p>
                </div>
                <MemberStatusBadge status={m.status} />
              </div>
            ))}
            <div className="px-6 py-3 border-t">
              <Link href="/admin/members" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos los miembros <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  )
}
