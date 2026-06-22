'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  Users, Zap, Trophy, Star, TrendingUp, FileText, ShieldCheck,
  Gift, UserCheck, UserPlus, type LucideIcon,
} from 'lucide-react'

// ── Dark mode hook ────────────────────────────────────────────

function useDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains('dark'))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ── Tipos ─────────────────────────────────────────────────────

type Tab = 'members' | 'ledger' | 'rewards'

interface MembersReport {
  byMonth:        { month: string; nuevos: number; activos: number }[]
  totalActive:    number
  totalMembers:   number
  activationRate: number
  newInPeriod:    number
  invoiceStats: {
    total: number
    approved: number
    approvalRate: number
    byMonth: { month: string; facturas: number; aprobadas: number }[]
  }
}

interface LedgerReport {
  byMonth:       { month: string; emitidos: number; canjeados: number }[]
  totalEmitidos:  number
  totalCanjeados: number
  enCirculacion:  number
}

interface RewardsReport {
  top: { name: string; category: string | null; count: number; avgRating: number | null; reviewRate: number }[]
}

// ── Helpers ───────────────────────────────────────────────────

function fmtPts(n: number) { return n.toLocaleString('es-MX') + ' pts' }
function fmtMonth(m: string) {
  return new Date(m + '-01').toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
}

// ── KpiCard mejorado ──────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label:   string
  value:   string | number
  sub?:    string
  icon?:   React.ElementType
  accent?: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-3">
      {Icon && (
        <div className={`mt-0.5 p-2 rounded-lg bg-muted/60 ${accent ?? 'text-primary'}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${accent ?? 'text-foreground'}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Reporte 1 — Flujo de clientes ─────────────────────────────

function MembersTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<MembersReport | null>(null)
  const dark = useDark()

  useEffect(() => {
    const q = new URLSearchParams({ report: 'members', from, to })
    fetch(`/api/admin/reports?${q}`).then(r => r.ok ? r.json() : null).then(setData)
  }, [from, to])

  if (!data) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" /></div>

  const grid  = dark ? '#1e293b' : '#e2e8f0'
  const muted = dark ? '#64748b' : '#94a3b8'
  const tooltipStyle = { background: dark ? '#1e293b' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }

  const chartData    = data.byMonth.map(d => ({ ...d, mes: fmtMonth(d.month) }))
  const invChartData = (data.invoiceStats?.byMonth ?? []).map(d => ({ ...d, mes: fmtMonth(d.month) }))

  const pieData = [
    { name: 'Activos',   value: data.totalActive },
    { name: 'Inactivos', value: Math.max(0, data.totalMembers - data.totalActive) },
  ]
  const pieColors = dark ? ['#10b981', '#334155'] : ['#10b981', '#e2e8f0']

  return (
    <div className="space-y-6">
      {/* Fila 1 de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total miembros"
          value={data.totalMembers.toLocaleString('es-MX')}
          icon={Users}
        />
        <KpiCard
          label="Miembros activos"
          value={data.totalActive.toLocaleString('es-MX')}
          icon={UserCheck}
          accent="text-emerald-500"
        />
        <KpiCard
          label="Tasa de activación"
          value={`${data.activationRate}%`}
          sub="activos vs. total"
          icon={TrendingUp}
        />
      </div>

      {/* Fila 2 de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Nuevos en período"
          value={(data.newInPeriod ?? 0).toLocaleString('es-MX')}
          icon={UserPlus}
          accent="text-blue-500"
        />
        <KpiCard
          label="Total facturas"
          value={(data.invoiceStats?.total ?? 0).toLocaleString('es-MX')}
          sub="en el período"
          icon={FileText}
        />
        <KpiCard
          label="Tasa de aprobación"
          value={`${data.invoiceStats?.approvalRate ?? 0}%`}
          sub="facturas aprobadas"
          icon={ShieldCheck}
          accent={(data.invoiceStats?.approvalRate ?? 0) > 70 ? 'text-emerald-500' : undefined}
        />
      </div>

      {/* AreaChart — Tendencia de nuevos miembros */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Tendencia de nuevos miembros</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradNuevos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradActivos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString('es-MX'), '']} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'nuevos' ? 'Nuevos' : 'Activos'} />
            <Area type="monotone" dataKey="nuevos"  stroke="#3b82f6" strokeWidth={2} fill="url(#gradNuevos)"  dot={{ r: 3, fill: '#3b82f6' }} />
            <Area type="monotone" dataKey="activos" stroke="#10b981" strokeWidth={2} fill="url(#gradActivos)" dot={{ r: 3, fill: '#10b981' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PieChart (donut) — Distribución activos vs inactivos */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Distribución activos vs. inactivos</p>
        <div className="flex items-center justify-center gap-8">
          <div className="relative" style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{data.totalMembers.toLocaleString('es-MX')}</span>
              <span className="text-xs text-muted-foreground">total</span>
            </div>
          </div>
          <div className="space-y-3">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: pieColors[i] }} />
                <span className="text-sm text-foreground">{entry.name}</span>
                <span className="text-sm font-semibold text-foreground ml-2">{entry.value.toLocaleString('es-MX')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BarChart — Facturas por mes */}
      {invChartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Facturas por mes</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={invChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFacturas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#93c5fd" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grid} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString('es-MX'), '']} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'facturas' ? 'Total' : 'Aprobadas'} />
              <Bar dataKey="facturas"  fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="aprobadas" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Reporte 2 — Ledger de puntos ──────────────────────────────

function LedgerTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<LedgerReport | null>(null)
  const dark = useDark()

  useEffect(() => {
    const q = new URLSearchParams({ report: 'ledger', from, to })
    fetch(`/api/admin/reports?${q}`).then(r => r.ok ? r.json() : null).then(setData)
  }, [from, to])

  if (!data) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" /></div>

  const grid  = dark ? '#1e293b' : '#e2e8f0'
  const muted = dark ? '#64748b' : '#94a3b8'
  const tooltipStyle = { background: dark ? '#1e293b' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }

  const chartData = data.byMonth.map(d => ({ ...d, mes: fmtMonth(d.month) }))
  const canjeRate = data.totalEmitidos ? Math.round((data.totalCanjeados / data.totalEmitidos) * 100) : 0

  const pieData = [
    { name: 'Canjeados',      value: data.totalCanjeados },
    { name: 'En circulación', value: data.enCirculacion },
  ]
  const pieColors = ['#f97316', '#3b82f6']

  return (
    <div className="space-y-6">
      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Puntos emitidos"
          value={fmtPts(data.totalEmitidos)}
          icon={Zap}
          accent="text-blue-500"
        />
        <KpiCard
          label="Puntos canjeados"
          value={fmtPts(data.totalCanjeados)}
          icon={Gift}
          accent="text-orange-500"
        />
        <KpiCard
          label="En circulación"
          value={fmtPts(data.enCirculacion)}
          sub="saldo acumulado actual"
          icon={TrendingUp}
        />
        <KpiCard
          label="Tasa de canje"
          value={`${canjeRate}%`}
          sub="canjeados vs. emitidos"
          icon={TrendingUp}
          accent="text-emerald-500"
        />
      </div>

      {/* AreaChart — Emitidos vs canjeados */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Emitidos vs. canjeados por mes</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEmitidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCanjeados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString('es-MX') + ' pts', '']} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'emitidos' ? 'Emitidos' : 'Canjeados'} />
            <Area type="monotone" dataKey="emitidos"  stroke="#3b82f6" strokeWidth={2} fill="url(#gradEmitidos)"  dot={{ r: 3, fill: '#3b82f6' }} />
            <Area type="monotone" dataKey="canjeados" stroke="#f97316" strokeWidth={2} fill="url(#gradCanjeados)" dot={{ r: 3, fill: '#f97316' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PieChart (donut) — Estado de los puntos */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Estado de los puntos</p>
        <div className="flex items-center justify-center gap-8">
          <div className="relative" style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtPts(v), '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{data.totalEmitidos.toLocaleString('es-MX')}</span>
              <span className="text-xs text-muted-foreground">emitidos</span>
            </div>
          </div>
          <div className="space-y-3">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: pieColors[i] }} />
                <span className="text-sm text-foreground">{entry.name}</span>
                <span className="text-sm font-semibold text-foreground ml-2">{fmtPts(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reporte 3 — Top premios ────────────────────────────────────

function RewardsTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<RewardsReport | null>(null)
  const dark = useDark()

  useEffect(() => {
    const q = new URLSearchParams({ report: 'rewards', from, to })
    fetch(`/api/admin/reports?${q}`).then(r => r.ok ? r.json() : null).then(setData)
  }, [from, to])

  if (!data) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" /></div>

  const grid  = dark ? '#1e293b' : '#e2e8f0'
  const muted = dark ? '#64748b' : '#94a3b8'
  const tooltipStyle = { background: dark ? '#1e293b' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }

  if (data.top.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <p className="text-muted-foreground text-sm">Sin canjes en el período seleccionado.</p>
      </div>
    )
  }

  const totalCanjes   = data.top.reduce((s, x) => s + x.count, 0)
  const premiosUnicos = data.top.length
  const ratingsValidos = data.top.filter(x => x.avgRating !== null).map(x => x.avgRating as number)
  const avgRating = ratingsValidos.length
    ? Math.round((ratingsValidos.reduce((s, v) => s + v, 0) / ratingsValidos.length) * 10) / 10
    : null

  const top5 = data.top.slice(0, 5).map(x => ({
    name: x.name.length > 20 ? x.name.slice(0, 20) + '…' : x.name,
    canjes: x.count,
  }))

  return (
    <div className="space-y-4">
      {/* 3 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total canjes"
          value={totalCanjes.toLocaleString('es-MX')}
          icon={Trophy}
        />
        <KpiCard
          label="Premios únicos"
          value={premiosUnicos}
          icon={Gift}
        />
        <KpiCard
          label="Rating promedio"
          value={avgRating !== null ? avgRating.toFixed(1) : '—'}
          sub={ratingsValidos.length > 0 ? `${ratingsValidos.length} reseñas` : 'Sin reseñas'}
          icon={Star}
          accent={avgRating !== null && avgRating >= 4 ? 'text-amber-500' : undefined}
        />
      </div>

      {/* Horizontal BarChart — Top 5 */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Top 5 premios más canjeados</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart layout="vertical" data={top5} margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: muted }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: muted }} width={140} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString('es-MX'), 'Canjes']} />
            <Bar dataKey="canjes" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla completa */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['#', 'Premio', 'Categoría', 'Canjes', 'Rating promedio', 'Tasa de reseña'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.top.map((item, i) => (
              <tr key={i} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{item.category ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-primary">{item.count.toLocaleString('es-MX')}</td>
                <td className="px-4 py-3 text-sm">
                  {item.avgRating != null ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {item.avgRating.toFixed(1)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.reviewRate}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.reviewRate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

function defaultDates() {
  const to   = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
  return { from, to }
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('members')
  const { from: defaultFrom, to: defaultTo } = defaultDates()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo]     = useState(defaultTo)

  const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'members', label: 'Flujo de clientes', icon: Users },
    { key: 'ledger',  label: 'Ledger de puntos',  icon: Zap },
    { key: 'rewards', label: 'Top premios',        icon: Trophy },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes Operativos</h1>
          <p className="text-muted-foreground text-sm mt-1">Métricas del programa de lealtad.</p>
        </div>

        {/* Filtro de fechas */}
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
          </div>
          <button
            onClick={() => { setFrom(defaultFrom); setTo(defaultTo) }}
            className="py-1.5 px-3 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            Últimos 6 meses
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {(() => { const Icon = t.icon; return <Icon className="w-4 h-4" /> })()}
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'members' && <MembersTab from={from} to={to} />}
      {tab === 'ledger'  && <LedgerTab  from={from} to={to} />}
      {tab === 'rewards' && <RewardsTab from={from} to={to} />}
    </div>
  )
}
