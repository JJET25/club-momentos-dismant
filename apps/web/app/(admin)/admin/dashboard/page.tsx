import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ElementType } from 'react'
import {
  Users, FileText, ShoppingBag, Coins, TrendingUp,
  AlertTriangle, ArrowRight, Package, BarChart2, ChevronRight,
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { STAFF_ROLES } from '@/lib/permissions'
import { ActivityTabs } from './activity-tabs'
import { RefreshButton } from './refresh-button'

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

function fmtDate() {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function KPICard({
  icon: Icon, label, value, sub, alert, href,
}: {
  icon: ElementType; label: string; value: string | number; sub?: string; alert?: boolean; href?: string
}) {
  const inner = (
    <div className={`group bg-card rounded-xl border p-5 flex flex-col gap-3 transition-all ${
      alert
        ? 'border-amber-300/60 bg-amber-500/5'
        : href ? 'hover:border-primary/30 hover:shadow-sm cursor-pointer' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${alert ? 'bg-amber-500/10' : 'bg-primary/8'}`}>
          <Icon className={`w-4.5 h-4.5 ${alert ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`} />
        </div>
        {href && <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />}
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

function QuickLink({
  icon: Icon, label, desc, href, badge,
}: {
  icon: ElementType; label: string; desc: string; href: string; badge?: number
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

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    redirect('/login')
  }

  const supabase = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    membersRes,
    newMembersRes,
    ledgerRes,
    pendingInvoicesRes,
    approvedInvoicesRes,
    pendingRedemptionsRes,
    topRewardsRes,
    recentInvoicesRes,
    recentRedemptionsRes,
    recentMembersRes,
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('ledger_entries').select('points, type'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invoices').select('id, total_amount').eq('status', 'approved').gte('created_at', startOfMonth),
    supabase.from('redemptions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    supabase.from('redemptions').select('reward_skus!sku_id(name)').gte('created_at', startOfMonth),
    supabase.from('invoices')
      .select('id, status, total_amount, created_at, members!member_id(company_name, rfc)')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('redemptions')
      .select('id, status, points_used, created_at, members!member_id(company_name), reward_skus!sku_id(name)')
      .order('created_at', { ascending: false }).limit(6),
    supabase.from('members')
      .select('id, company_name, email, created_at, status')
      .order('created_at', { ascending: false }).limit(6),
  ])

  const entries = ledgerRes.data ?? []
  const pointsInCirculation = entries.reduce((acc, e) => acc + e.points, 0)
  const totalAmountThisMonth = (approvedInvoicesRes.data ?? []).reduce((acc, inv) => acc + (inv.total_amount ?? 0), 0)

  const skuCounts: Record<string, { name: string; count: number }> = {}
  for (const r of topRewardsRes.data ?? []) {
    const sku = (r.reward_skus as unknown) as { name: string } | null
    if (!sku) continue
    if (!skuCounts[sku.name]) skuCounts[sku.name] = { name: sku.name, count: 0 }
    skuCounts[sku.name].count++
  }
  const topRewards = Object.values(skuCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  const pendingInvoices    = pendingInvoicesRes.count ?? 0
  const pendingRedemptions = pendingRedemptionsRes.count ?? 0
  const hasPending         = pendingInvoices > 0 || pendingRedemptions > 0

  const recentInvoices = (recentInvoicesRes.data ?? []).map(inv => {
    const m = (inv.members as unknown) as { company_name: string; rfc: string } | null
    return { id: inv.id, status: inv.status, total_amount: inv.total_amount ?? 0, created_at: inv.created_at, company: m?.company_name ?? m?.rfc ?? '—' }
  })

  const recentRedemptions = (recentRedemptionsRes.data ?? []).map(red => {
    const m   = (red.members as unknown) as { company_name: string } | null
    const sku = (red.reward_skus as unknown) as { name: string } | null
    return { id: red.id, status: red.status, points_used: red.points_used ?? 0, created_at: red.created_at, company: m?.company_name ?? '—', reward: sku?.name ?? '—' }
  })

  const recentMembers = (recentMembersRes.data ?? []).map(m => ({
    id: m.id, company_name: m.company_name, email: m.email, created_at: m.created_at, status: m.status,
  }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Operativo</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{fmtDate()}</p>
        </div>
        <RefreshButton />
      </div>

      {/* Alertas urgentes */}
      {hasPending && (
        <div className="flex flex-col sm:flex-row gap-3">
          {pendingInvoices > 0 && (
            <div className="flex-1 flex items-center justify-between gap-4 bg-amber-500/5 border border-amber-300/50 rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {pendingInvoices} factura{pendingInvoices !== 1 ? 's' : ''} pendiente{pendingInvoices !== 1 ? 's' : ''}
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
          {pendingRedemptions > 0 && (
            <div className="flex-1 flex items-center justify-between gap-4 bg-blue-500/5 border border-blue-300/50 rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {pendingRedemptions} canje{pendingRedemptions !== 1 ? 's' : ''} sin surtir
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
        <KPICard icon={Users}    label="Miembros activos"    value={membersRes.count ?? 0}
          sub={(newMembersRes.count ?? 0) > 0 ? `+${newMembersRes.count} este mes` : 'sin altas este mes'} href="/admin/members" />
        <KPICard icon={TrendingUp} label="Nuevos este mes"   value={newMembersRes.count ?? 0} sub="registros nuevos" href="/admin/members" />
        <KPICard icon={FileText}  label="Facturas pendientes" value={pendingInvoices} sub="requieren revisión" alert={pendingInvoices > 0} href="/admin/invoices" />
        <KPICard icon={Package}   label="Canjes sin surtir"  value={pendingRedemptions} sub="pendientes/en proceso" alert={pendingRedemptions > 0} />
        <KPICard icon={Coins}     label="Puntos en circulación" value={fmtPts(pointsInCirculation)} sub="balance neto activo" />
        <KPICard icon={BarChart2} label="Monto validado"     value={fmtCurrency(totalAmountThisMonth)} sub="facturas aprobadas mes" />
      </div>

      {/* Cuerpo principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ActivityTabs
          recentInvoices={recentInvoices}
          recentRedemptions={recentRedemptions}
          recentMembers={recentMembers}
        />

        {/* Panel lateral */}
        <div className="flex flex-col gap-5">
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold text-foreground">Top premios este mes</h2>
            </div>
            {topRewards.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">Sin canjes este mes</div>
            ) : (
              <div className="divide-y divide-border">
                {topRewards.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3 px-5 py-3">
                    <span className={`text-xs font-bold w-4 text-right shrink-0 ${
                      i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'
                    }`}>{i + 1}</span>
                    <span className="text-xs text-foreground flex-1 truncate">{r.name}</span>
                    <span className="text-xs font-semibold text-primary shrink-0">{r.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold text-foreground">Accesos rápidos</h2>
            </div>
            <div className="p-3 space-y-1.5">
              <QuickLink icon={FileText}    label="Facturas" desc="Aprobar o rechazar"     href="/admin/invoices"    badge={pendingInvoices} />
              <QuickLink icon={ShoppingBag} label="Canjes"   desc="Surtir premios"         href="/admin/redemptions" badge={pendingRedemptions} />
              <QuickLink icon={Users}       label="Miembros" desc="Gestionar empresas"     href="/admin/members" />
              <QuickLink icon={BarChart2}   label="Reportes" desc="Análisis y exportaciones" href="/admin/reports" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
