'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Users, FileText, ShoppingBag, Coins, TrendingUp,
  AlertTriangle, ArrowRight, Clock, CheckCircle2, XCircle,
  Package, Building2, BarChart2, Gift, ChevronRight,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface RecentInvoice {
  id: string; status: string; total_amount: number; created_at: string; company: string
}
interface RecentRedemption {
  id: string; status: string; points_used: number; created_at: string; company: string; reward: string
}
interface RecentMember {
  id: string; company_name: string; email: string; created_at: string; status: string
}
interface DashboardData {
  totalMembers:        number
  newMembersThisMonth: number
  pointsInCirculation: number
  pointsRedeemed:      number
  pendingInvoices:     number
  pendingRedemptions:  number
  totalAmountThisMonth: number
  topRewards:          { name: string; count: number }[]
  recentInvoices:      RecentInvoice[]
  recentRedemptions:   RecentRedemption[]
  recentMembers:       RecentMember[]
}

// ── Helpers ───────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString('es-MX')}`
}

function fmtPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString('es-MX')
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

function fmtDate() {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Badges de estado ──────────────────────────────────────────

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
    active:    { label: 'Activo',    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    inactive:  { label: 'Inactivo',  cls: 'bg-muted text-muted-foreground' },
    suspended: { label: 'Suspendido', cls: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────────

function KPICard({
  icon: Icon, label, value, sub, alert, href,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  alert?: boolean
  href?: string
}) {
  const inner = (
    <div className={`group bg-card rounded-xl border p-5 flex flex-col gap-3 transition-all ${
      alert
        ? 'border-amber-300/60 bg-amber-500/5'
        : href ? 'hover:border-primary/30 hover:shadow-sm cursor-pointer' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          alert ? 'bg-amber-500/10' : 'bg-primary/8'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${alert ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`} />
        </div>
        {href && (
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 tabular-nums ${alert ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
          {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

// ── Acceso rápido ─────────────────────────────────────────────

function QuickLink({
  icon: Icon, label, desc, href, badge,
}: {
  icon: React.ElementType; label: string; desc: string; href: string; badge?: number
}) {
  return (
    <Link href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-none">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {badge != null && badge > 0 && (
        <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
          {badge}
        </span>
      )}
    </Link>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'invoices' | 'redemptions' | 'members'>('invoices')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/dashboard')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const hasPending = (data?.pendingInvoices ?? 0) > 0 || (data?.pendingRedemptions ?? 0) > 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Operativo</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{fmtDate()}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors mt-1 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Alertas urgentes */}
      {!loading && hasPending && (
        <div className="flex flex-col sm:flex-row gap-3">
          {(data?.pendingInvoices ?? 0) > 0 && (
            <div className="flex-1 flex items-center justify-between gap-4 bg-amber-500/5 border border-amber-300/50 rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {data!.pendingInvoices} factura{data!.pendingInvoices !== 1 ? 's' : ''} pendiente{data!.pendingInvoices !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-500/70">Los puntos no se acreditan hasta aprobarlas</p>
                </div>
              </div>
              <Link href="/admin/invoices"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0">
                Revisar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
          {(data?.pendingRedemptions ?? 0) > 0 && (
            <div className="flex-1 flex items-center justify-between gap-4 bg-blue-500/5 border border-blue-300/50 rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {data!.pendingRedemptions} canje{data!.pendingRedemptions !== 1 ? 's' : ''} sin surtir
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-500/70">Los clientes están esperando su premio</p>
                </div>
              </div>
              <Link href="/admin/redemptions"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0">
                Surtir <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border p-5 animate-pulse">
              <div className="w-9 h-9 bg-muted rounded-lg mb-3" />
              <div className="h-2 bg-muted rounded w-2/3 mb-2" />
              <div className="h-7 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : data ? (
          <>
            <KPICard
              icon={Users}
              label="Miembros activos"
              value={data.totalMembers}
              sub={data.newMembersThisMonth > 0 ? `+${data.newMembersThisMonth} este mes` : 'sin altas este mes'}
              href="/admin/members"
            />
            <KPICard
              icon={TrendingUp}
              label="Nuevos este mes"
              value={data.newMembersThisMonth}
              sub="registros nuevos"
              href="/admin/members"
            />
            <KPICard
              icon={FileText}
              label="Facturas pendientes"
              value={data.pendingInvoices}
              sub="requieren revisión"
              alert={data.pendingInvoices > 0}
              href="/admin/invoices"
            />
            <KPICard
              icon={Package}
              label="Canjes sin surtir"
              value={data.pendingRedemptions}
              sub="pendientes/en proceso"
              alert={data.pendingRedemptions > 0}
            />
            <KPICard
              icon={Coins}
              label="Puntos en circulación"
              value={fmtPts(data.pointsInCirculation)}
              sub="balance neto activo"
            />
            <KPICard
              icon={BarChart2}
              label="Monto validado"
              value={fmtCurrency(data.totalAmountThisMonth)}
              sub="facturas aprobadas mes"
            />
          </>
        ) : (
          <div className="col-span-6 text-center text-muted-foreground py-8 text-sm">
            Error al cargar datos. <button onClick={load} className="underline">Reintentar</button>
          </div>
        )}
      </div>

      {/* Cuerpo principal: actividad reciente + panel lateral */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Actividad reciente — 2/3 */}
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

          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-4 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                  <div className="w-14 h-5 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : activeTab === 'invoices' ? (
            !data?.recentInvoices.length ? (
              <EmptyState icon={FileText} text="Sin facturas recientes" />
            ) : (
              <div className="divide-y divide-border">
                {data.recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
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
            !data?.recentRedemptions.length ? (
              <EmptyState icon={ShoppingBag} text="Sin canjes recientes" />
            ) : (
              <div className="divide-y divide-border">
                {data.recentRedemptions.map(red => (
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
            !data?.recentMembers.length ? (
              <EmptyState icon={Users} text="Sin miembros recientes" />
            ) : (
              <div className="divide-y divide-border">
                {data.recentMembers.map(m => (
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

        {/* Panel lateral — 1/3 */}
        <div className="flex flex-col gap-5">

          {/* Top premios */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold text-foreground">Top premios este mes</h2>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse">
                    <div className="w-4 h-3 bg-muted rounded" />
                    <div className="flex-1 h-3 bg-muted rounded" />
                    <div className="w-8 h-3 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : !data?.topRewards.length ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">
                Sin canjes este mes
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.topRewards.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3 px-5 py-3">
                    <span className={`text-xs font-bold w-4 text-right shrink-0 ${
                      i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-xs text-foreground flex-1 truncate">{r.name}</span>
                    <span className="text-xs font-semibold text-primary shrink-0">{r.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold text-foreground">Accesos rápidos</h2>
            </div>
            <div className="p-3 space-y-1.5">
              <QuickLink
                icon={FileText}
                label="Facturas"
                desc="Aprobar o rechazar"
                href="/admin/invoices"
                badge={data?.pendingInvoices}
              />
              <QuickLink
                icon={ShoppingBag}
                label="Canjes"
                desc="Surtir premios"
                href="/admin/redemptions"
                badge={data?.pendingRedemptions}
              />
              <QuickLink
                icon={Users}
                label="Miembros"
                desc="Gestionar empresas"
                href="/admin/members"
              />
              <QuickLink
                icon={BarChart2}
                label="Reportes"
                desc="Análisis y exportaciones"
                href="/admin/reports"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
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
