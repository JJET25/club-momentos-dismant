'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Zap, Gift, FileCheck, AlertTriangle, Download,
  ChevronDown, ArrowUpRight, ArrowDownLeft, Wrench, Star, PartyPopper, X,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface InvoiceDetail {
  uuid_cfdi: string; total_mxn: number; issued_at: string
  rfc_emisor: string; status: string; approved_at: string | null
}
interface Entry {
  id: string; type: string; points: number; balance_after: number
  description: string | null; created_at: string; expires_at: string | null
  invoices: InvoiceDetail | null
}
interface Summary {
  totalEarned: number; totalRedeemed: number; totalInvoices: number
  expiringPoints: number; expiringDate: string | null
}
interface MonthData { month: string; label: string; earned: number; redeemed: number }

// ── Helpers ───────────────────────────────────────────────────

function fmtPts(n: number) { return n.toLocaleString('es-MX') }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

// ── Configuración por tipo ────────────────────────────────────

const TYPE_CFG: Record<string, {
  label: string; Icon: React.ElementType
  bg: string; color: string; badge: string
}> = {
  invoice:       { label: 'Factura aprobada',  Icon: FileCheck,     bg: 'bg-emerald-500/10', color: 'text-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  credit:        { label: 'Crédito',           Icon: ArrowUpRight,  bg: 'bg-emerald-500/10', color: 'text-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  redemption:    { label: 'Canje',             Icon: Gift,          bg: 'bg-orange-500/10',  color: 'text-orange-500',  badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-400'   },
  debit:         { label: 'Débito',            Icon: ArrowDownLeft, bg: 'bg-red-500/10',     color: 'text-red-500',     badge: 'bg-red-500/15 text-red-700 dark:text-red-400'             },
  welcome_bonus: { label: 'Bono bienvenida',   Icon: PartyPopper,   bg: 'bg-blue-500/10',   color: 'text-blue-500',    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-400'          },
  review_bonus:  { label: 'Bono reseña',       Icon: Star,          bg: 'bg-yellow-500/10', color: 'text-yellow-500',  badge: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'   },
  adjustment:    { label: 'Ajuste',            Icon: Wrench,        bg: 'bg-muted',         color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground'                       },
}

const TYPE_OPTIONS = [
  { value: '',               label: 'Todos los tipos' },
  { value: 'invoice',        label: 'Facturas' },
  { value: 'redemption',     label: 'Canjes' },
  { value: 'welcome_bonus',  label: 'Bono bienvenida' },
  { value: 'review_bonus',   label: 'Bono reseña' },
  { value: 'adjustment',     label: 'Ajustes' },
]

// ── Componente: tooltip del chart ─────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-xl px-4 py-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1.5 capitalize">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name === 'earned' ? 'Ganados' : 'Canjeados'}:</span>
          <span className="font-semibold text-foreground">{fmtPts(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Componente: fila de movimiento ────────────────────────────

function EntryRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false)
  const cfg = TYPE_CFG[entry.type] ?? TYPE_CFG.adjustment
  const Icon = cfg.Icon
  const positive = entry.points > 0
  const canExpand = entry.type === 'invoice' && entry.invoices

  return (
    <>
      <li
        onClick={() => canExpand && setOpen(o => !o)}
        className={`flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 transition-colors
          ${canExpand ? 'cursor-pointer hover:bg-muted/30' : ''}`}
      >
        {/* Ícono */}
        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>

        {/* Descripción + badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">
              {entry.description ?? cfg.label}
            </p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge} shrink-0`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">{fmtDate(entry.created_at)}</p>
            {entry.expires_at && (
              <span className="text-[10px] text-amber-500">· Expira {fmtShortDate(entry.expires_at)}</span>
            )}
          </div>
        </div>

        {/* Puntos + saldo */}
        <div className="text-right shrink-0 space-y-0.5">
          <p className={`text-sm font-bold tabular-nums ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {positive ? '+' : ''}{fmtPts(entry.points)} pts
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Saldo: {fmtPts(entry.balance_after)}
          </p>
        </div>

        {/* Indicador expandible */}
        {canExpand && (
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </li>

      {/* Detalle de factura expandido */}
      {open && entry.invoices && (
        <li className="bg-blue-500/5 border-b border-border px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs max-w-2xl">
            <div>
              <p className="text-muted-foreground mb-0.5">Folio Fiscal (UUID)</p>
              <p className="font-mono text-foreground break-all leading-snug">{entry.invoices.uuid_cfdi}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Monto total</p>
              <p className="font-semibold text-foreground">{fmtMXN(entry.invoices.total_mxn)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">RFC Emisor</p>
              <p className="font-mono text-foreground">{entry.invoices.rfc_emisor}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Fecha emisión</p>
              <p className="text-foreground">{fmtDate(entry.invoices.issued_at)}</p>
            </div>
            {entry.invoices.approved_at && (
              <div>
                <p className="text-muted-foreground mb-0.5">Aprobada el</p>
                <p className="text-foreground">{fmtDateTime(entry.invoices.approved_at)}</p>
              </div>
            )}
          </div>
        </li>
      )}
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-muted rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
      <div className="h-48 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function StatementPage() {
  const [balance,  setBalance]  = useState<number | null>(null)
  const [entries,  setEntries]  = useState<Entry[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [byMonth,  setByMonth]  = useState<MonthData[]>([])
  const [loading,  setLoading]  = useState(true)
  const [downloading, setDownloading] = useState(false)

  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo,   setFilterTo]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo)   params.set('to', filterTo)

    const res = await fetch(`/api/client/statement?${params}`)
    if (res.ok) {
      const json = await res.json()
      setBalance(json.balance)
      setEntries(json.entries ?? [])
      setSummary(json.summary ?? null)
      setByMonth(json.byMonth ?? [])
    }
    setLoading(false)
  }, [filterType, filterFrom, filterTo])

  useEffect(() => { load() }, [load])

  async function handleDownload() {
    setDownloading(true)
    const q = new URLSearchParams()
    const month = filterFrom?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)
    if (filterFrom) q.set('from', filterFrom)
    if (filterTo)   q.set('to', filterTo)
    q.set('month', month)
    const res = await fetch(`/api/client/statement/pdf?${q}`)
    if (res.ok) {
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `estado-cuenta-${month}.pdf`; a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(false)
  }

  const hasFilters = filterType || filterFrom || filterTo

  if (loading) return <Skeleton />

  const maxBar = Math.max(...byMonth.map(m => Math.max(m.earned, m.redeemed)), 1)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estado de Cuenta</h1>
          <p className="text-sm text-muted-foreground mt-1">Trazabilidad completa de todos tus movimientos de puntos.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>

      {/* Hero: balance + alerta expiración */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white p-7">
        <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-12 right-16 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <p className="text-blue-200 text-sm font-medium">Saldo disponible</p>
            <p className="text-6xl font-bold tracking-tight mt-1 leading-none">
              {balance === null ? '—' : fmtPts(balance)}
            </p>
            <p className="text-blue-300 text-sm mt-2">puntos</p>
          </div>

          {summary && summary.expiringPoints > 0 && (
            <div className="sm:text-right bg-amber-400/20 border border-amber-400/30 rounded-xl px-4 py-3 shrink-0">
              <div className="flex items-center gap-1.5 sm:justify-end">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <p className="text-xs font-semibold text-amber-300">Puntos por vencer</p>
              </div>
              <p className="text-xl font-bold text-white mt-0.5">{fmtPts(summary.expiringPoints)}</p>
              <p className="text-[11px] text-amber-200 mt-0.5">
                {summary.expiringDate ? `Vencen el ${fmtShortDate(summary.expiringDate)}` : 'próximo mes'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total ganados</p>
              <p className="text-xl font-bold text-foreground">{fmtPts(summary.totalEarned)}</p>
              <p className="text-xs text-muted-foreground">puntos</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total canjeados</p>
              <p className="text-xl font-bold text-foreground">{fmtPts(summary.totalRedeemed)}</p>
              <p className="text-xs text-muted-foreground">puntos</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 col-span-2 md:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Facturas validadas</p>
              <p className="text-xl font-bold text-foreground">{summary.totalInvoices}</p>
              <p className="text-xs text-muted-foreground">históricas</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráfica de actividad mensual */}
      {byMonth.length > 0 && byMonth.some(m => m.earned > 0 || m.redeemed > 0) && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Actividad mensual</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Puntos ganados vs. canjeados (últimos 6 meses)</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Ganados
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
                Canjeados
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byMonth} barGap={4} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? '0' : fmtPts(v)}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
              <Bar dataKey="earned"   name="earned"   fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="redeemed" name="redeemed" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Tipo de movimiento</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full input-field text-sm py-2"
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Desde</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="input-field text-sm py-2 w-full" />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Hasta</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="input-field text-sm py-2 w-full" />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterType(''); setFilterFrom(''); setFilterTo('') }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de movimientos */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Movimientos</h2>
          <span className="text-xs text-muted-foreground">
            {hasFilters
              ? `${entries.length} resultado${entries.length !== 1 ? 's' : ''}`
              : `Últimos ${entries.length}`}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {hasFilters ? 'No hay movimientos con esos filtros.' : 'Aún no tienes movimientos.'}
            </p>
            {!hasFilters && (
              <p className="text-xs text-muted-foreground mt-1">
                Los puntos aparecerán aquí cuando tus facturas sean aprobadas.
              </p>
            )}
          </div>
        ) : (
          <ul>
            {entries.map(e => <EntryRow key={e.id} entry={e} />)}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Mostrando hasta 200 movimientos · Los puntos de facturas expiran a los 12 meses
      </p>
    </div>
  )
}
