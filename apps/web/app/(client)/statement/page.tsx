'use client'

import { useEffect, useState } from 'react'

// ── Tipos ────────────────────────────────────────────────────

interface InvoiceDetail {
  uuid_cfdi:   string
  total_mxn:   number
  issued_at:   string
  rfc_emisor:  string
  status:      string
  approved_at: string | null
  approved_by: string | null
}

interface Entry {
  id:           string
  type:         string
  points:       number
  balance_after: number
  description:  string | null
  created_at:   string
  expires_at:   string | null
  invoices:     InvoiceDetail | null
}

// ── Configuración por tipo ───────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: string; className: string }> = {
  invoice:        { label: 'Factura',      icon: '📄', className: 'bg-blue-50 text-blue-700' },
  redemption:     { label: 'Canje',        icon: '🎫', className: 'bg-orange-50 text-orange-700' },
  welcome_bonus:  { label: 'Bono bienvenida', icon: '🎁', className: 'bg-purple-50 text-purple-700' },
  review_bonus:   { label: 'Bono reseña',  icon: '⭐', className: 'bg-yellow-50 text-yellow-700' },
  adjustment:     { label: 'Ajuste',       icon: '⚙️', className: 'bg-gray-100 text-gray-600' },
}

const TYPE_OPTIONS = [
  { value: '',               label: 'Todos los tipos' },
  { value: 'invoice',        label: 'Factura' },
  { value: 'redemption',     label: 'Canje' },
  { value: 'welcome_bonus',  label: 'Bono bienvenida' },
  { value: 'review_bonus',   label: 'Bono reseña' },
  { value: 'adjustment',     label: 'Ajuste' },
]

// ── Helpers ──────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}
function fmtPoints(n: number) {
  return (n > 0 ? '+' : '') + n.toLocaleString('es-MX')
}

// ── Fila expandible ──────────────────────────────────────────

function EntryRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false)
  const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.adjustment
  const positive = entry.points > 0

  const canExpand = entry.type === 'invoice' && entry.invoices

  return (
    <>
      <tr
        onClick={() => canExpand && setOpen(o => !o)}
        className={`border-b transition-colors ${canExpand ? 'cursor-pointer hover:bg-muted/30' : ''}`}
      >
        {/* Fecha */}
        <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
          {fmtDate(entry.created_at)}
        </td>

        {/* Tipo */}
        <td className="px-5 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
        </td>

        {/* Descripción */}
        <td className="px-5 py-3 text-sm text-foreground">
          <div className="flex items-center gap-2">
            <span>{entry.description ?? cfg.label}</span>
            {canExpand && (
              <svg
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </td>

        {/* Puntos */}
        <td className={`px-5 py-3 text-sm font-semibold text-right ${positive ? 'text-green-600' : 'text-red-500'}`}>
          {fmtPoints(entry.points)}
        </td>

        {/* Saldo */}
        <td className="px-5 py-3 text-sm font-medium text-foreground text-right">
          {entry.balance_after.toLocaleString('es-MX')}
        </td>
      </tr>

      {/* Fila de detalle expandida (solo facturas) */}
      {open && entry.invoices && (
        <tr className="bg-blue-50/50 border-b">
          <td colSpan={5} className="px-8 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs max-w-xl">
              <div>
                <span className="text-muted-foreground">Folio Fiscal (UUID)</span>
                <p className="font-mono font-medium text-foreground break-all">{entry.invoices.uuid_cfdi}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Monto total</span>
                <p className="font-medium text-foreground">{fmtCurrency(entry.invoices.total_mxn)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">RFC Emisor</span>
                <p className="font-mono font-medium text-foreground">{entry.invoices.rfc_emisor}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha emisión</span>
                <p className="font-medium text-foreground">{fmtDate(entry.invoices.issued_at)}</p>
              </div>
              {entry.invoices.approved_at && (
                <div>
                  <span className="text-muted-foreground">Aprobada el</span>
                  <p className="font-medium text-foreground">{fmtDateTime(entry.invoices.approved_at)}</p>
                </div>
              )}
              {entry.expires_at && (
                <div>
                  <span className="text-muted-foreground">Puntos expiran</span>
                  <p className="font-medium text-amber-600">{fmtDate(entry.expires_at)}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function StatementPage() {
  const [balance, setBalance]   = useState<number | null>(null)
  const [entries, setEntries]   = useState<Entry[]>([])
  const [loading, setLoading]   = useState(true)

  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo,   setFilterTo]   = useState('')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo)   params.set('to', filterTo)

    const res = await fetch(`/api/client/statement?${params}`)
    if (res.ok) {
      const { balance: bal, entries: data } = await res.json()
      setBalance(bal)
      setEntries(data)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filterType, filterFrom, filterTo])

  function clearFilters() {
    setFilterType('')
    setFilterFrom('')
    setFilterTo('')
  }

  const hasFilters = filterType || filterFrom || filterTo

  return (
    <div className="space-y-8">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estado de Cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Trazabilidad completa de todos tus movimientos de puntos.
          </p>
        </div>
        <button
          onClick={() => {
            const q = new URLSearchParams()
            if (filterFrom) q.set('from', filterFrom)
            if (filterTo)   q.set('to', filterTo)
            window.open(`/statement/pdf?${q}`, '_blank')
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Descargar PDF
        </button>
      </div>

      {/* Saldo actual */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8">
        <p className="text-sm font-medium opacity-80 mb-1">Saldo actual</p>
        <p className="text-5xl font-bold tracking-tight">
          {balance === null ? '—' : balance.toLocaleString('es-MX')}
        </p>
        <p className="text-sm opacity-70 mt-2">puntos disponibles</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="input-field text-sm py-2"
          >
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Desde</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="input-field text-sm py-2" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground pb-0.5">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Movimientos</h2>
          {!loading && hasFilters && (
            <span className="text-xs text-muted-foreground">
              {entries.length} resultado{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm font-medium text-foreground mb-1">
              {hasFilters ? 'No hay movimientos con esos filtros.' : 'Aún no tienes movimientos.'}
            </p>
            {!hasFilters && (
              <p className="text-xs text-muted-foreground">
                Los puntos aparecerán aquí cuando tus facturas sean aprobadas.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Descripción</th>
                  <th className="px-5 py-3 font-medium text-right">Puntos</th>
                  <th className="px-5 py-3 font-medium text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => <EntryRow key={entry.id} entry={entry} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Mostrando hasta 200 movimientos más recientes · Los puntos de facturas expiran a los 12 meses
      </p>
    </div>
  )
}
