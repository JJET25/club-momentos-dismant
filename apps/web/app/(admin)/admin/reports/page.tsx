'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Tipos ─────────────────────────────────────────────────────

type Tab = 'members' | 'ledger' | 'rewards'

interface MembersReport {
  byMonth:        { month: string; nuevos: number; activos: number }[]
  totalActive:    number
  totalMembers:   number
  activationRate: number
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

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── Reporte 1 — Flujo de clientes ─────────────────────────────

function MembersTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<MembersReport | null>(null)

  useEffect(() => {
    const q = new URLSearchParams({ report: 'members', from, to })
    fetch(`/api/admin/reports?${q}`).then(r => r.ok ? r.json() : null).then(setData)
  }, [from, to])

  if (!data) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" /></div>

  const chartData = data.byMonth.map(d => ({ ...d, mes: fmtMonth(d.month) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total miembros"     value={data.totalMembers.toLocaleString('es-MX')} />
        <KpiCard label="Miembros activos"   value={data.totalActive.toLocaleString('es-MX')} />
        <KpiCard label="Tasa de activación" value={`${data.activationRate}%`} sub="activos vs. total" />
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Nuevos miembros por mes</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v: number) => [v.toLocaleString('es-MX'), '']} />
            <Legend formatter={v => v === 'nuevos' ? 'Nuevos' : 'Activos'} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="nuevos"  fill="#2563eb" radius={[4,4,0,0]} />
            <Bar dataKey="activos" fill="#16a34a" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Reporte 2 — Ledger de puntos ──────────────────────────────

function LedgerTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<LedgerReport | null>(null)

  useEffect(() => {
    const q = new URLSearchParams({ report: 'ledger', from, to })
    fetch(`/api/admin/reports?${q}`).then(r => r.ok ? r.json() : null).then(setData)
  }, [from, to])

  if (!data) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" /></div>

  const chartData = data.byMonth.map(d => ({ ...d, mes: fmtMonth(d.month) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Puntos emitidos"     value={fmtPts(data.totalEmitidos)} />
        <KpiCard label="Puntos canjeados"    value={fmtPts(data.totalCanjeados)} />
        <KpiCard label="En circulación"      value={fmtPts(data.enCirculacion)} sub="saldo acumulado actual" />
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Emitidos vs. canjeados por mes</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v.toLocaleString('es-MX') + ' pts', '']} />
            <Legend formatter={v => v === 'emitidos' ? 'Emitidos' : 'Canjeados'} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="emitidos"  stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="canjeados" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Reporte 3 — Top premios ────────────────────────────────────

function RewardsTab({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<RewardsReport | null>(null)

  useEffect(() => {
    const q = new URLSearchParams({ report: 'rewards', from, to })
    fetch(`/api/admin/reports?${q}`).then(r => r.ok ? r.json() : null).then(setData)
  }, [from, to])

  if (!data) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" /></div>

  return (
    <div className="space-y-4">
      {data.top.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm">Sin canjes en el período seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
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
                        <span className="text-amber-400">★</span>
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
      )}
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

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'members', label: 'Flujo de clientes', icon: '👥' },
    { key: 'ledger',  label: 'Ledger de puntos',  icon: '⚡' },
    { key: 'rewards', label: 'Top premios',        icon: '🏆' },
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
              className="text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            {t.icon} {t.label}
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
