'use client'

import { useEffect, useState } from 'react'
import {
  FileText, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, Zap, X, Ban,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface Invoice {
  id: string
  uuid_cfdi: string
  rfc_emisor: string
  rfc_receptor: string
  total_mxn: number
  issued_at: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  points_generated: number | null
  created_at: string
  rejection_reason: string | null
  approved_at: string | null
}

// ── Helpers ───────────────────────────────────────────────────

function fmtMXN(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtPts(n: number) { return n.toLocaleString('es-MX') }
function shortUUID(uuid: string) { return uuid.slice(0, 8).toUpperCase() + '…' }

const STATUS = {
  pending:   { label: 'Pendiente',  Icon: Clock,         bg: 'bg-amber-500/10',  text: 'text-amber-600',  dot: 'bg-amber-400 animate-pulse', bar: 'bg-amber-400' },
  approved:  { label: 'Aprobada',   Icon: CheckCircle2,  bg: 'bg-emerald-500/10',text: 'text-emerald-600',dot: 'bg-emerald-400',             bar: 'bg-emerald-500' },
  rejected:  { label: 'Rechazada',  Icon: XCircle,       bg: 'bg-red-500/10',    text: 'text-red-500',    dot: 'bg-red-400',                 bar: 'bg-red-500' },
  cancelled: { label: 'Cancelada',  Icon: Ban,           bg: 'bg-muted',         text: 'text-muted-foreground', dot: 'bg-muted-foreground', bar: 'bg-muted-foreground/40' },
}

type StatusKey = keyof typeof STATUS
type Tab = 'all' | StatusKey

// ── Modal de detalle ──────────────────────────────────────────

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const st = STATUS[invoice.status] ?? STATUS.pending
  const StIcon = st.Icon

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Franja de estado */}
        <div className={`h-1.5 ${st.bar}`} />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${st.bg} flex items-center justify-center shrink-0`}>
                <FileText className={`w-5 h-5 ${st.text}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{fmtMXN(invoice.total_mxn)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(invoice.issued_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg} shrink-0`}>
                <StIcon className={`w-3 h-3 ${st.text}`} />
                <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Puntos */}
          {invoice.points_generated != null && (
            <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <Zap className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Puntos acreditados</p>
                <p className="text-lg font-bold text-emerald-600">+{fmtPts(invoice.points_generated)} pts</p>
              </div>
            </div>
          )}

          {/* Motivo de rechazo */}
          {invoice.rejection_reason && (
            <div className="flex items-start gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-600 mb-0.5">Motivo de rechazo</p>
                <p className="text-xs text-muted-foreground">{invoice.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Datos de la factura */}
          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {[
              { label: 'Folio Fiscal',      value: invoice.uuid_cfdi,   mono: true  },
              { label: 'RFC Emisor',         value: invoice.rfc_emisor,  mono: true  },
              { label: 'RFC Receptor',       value: invoice.rfc_receptor,mono: true  },
              { label: 'Monto',              value: fmtMXN(invoice.total_mxn) },
              { label: 'Fecha de factura',   value: fmtDate(invoice.issued_at) },
              { label: 'Registrada el',      value: fmtDateTime(invoice.created_at) },
              ...(invoice.approved_at ? [{ label: 'Aprobada el', value: fmtDateTime(invoice.approved_at) }] : []),
            ].map(row => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-2.5 bg-muted/20">
                <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                <span className={`text-xs font-medium text-foreground text-right break-all ${row.mono ? 'font-mono text-[11px]' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [tab, setTab]           = useState<Tab>('all')

  useEffect(() => {
    fetch('/api/client/invoices')
      .then(r => r.ok ? r.json() : { invoices: [] })
      .then(({ invoices: data }) => { setInvoices(data); setLoading(false) })
  }, [])

  const pending   = invoices.filter(i => i.status === 'pending')
  const approved  = invoices.filter(i => i.status === 'approved')
  const rejected  = invoices.filter(i => i.status === 'rejected')
  const totalPts  = invoices.reduce((s, i) => s + (i.points_generated ?? 0), 0)
  const totalMXN  = approved.reduce((s, i) => s + i.total_mxn, 0)

  const visible = tab === 'all' ? invoices : invoices.filter(i => i.status === tab)

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'all',       label: 'Todas',      count: invoices.length },
    { key: 'pending',   label: 'Pendientes', count: pending.length },
    { key: 'approved',  label: 'Aprobadas',  count: approved.length },
    { key: 'rejected',  label: 'Rechazadas', count: rejected.length },
  ]

  return (
    <div className="space-y-6">
      {selected && <InvoiceModal invoice={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Facturas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulta el estado de tus facturas registradas en el programa.
        </p>
      </div>

      {/* Banner informativo */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3.5">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Las facturas son registradas por tu ejecutivo de cuenta. Aquí puedes consultar cuáles están pendientes de validación, cuáles fueron aprobadas y los puntos que generaron.
        </p>
      </div>

      {/* KPIs */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-xs text-muted-foreground">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pending.length}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground">Aprobadas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{approved.length}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-xs text-muted-foreground">Pts ganados</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{fmtPts(totalPts)}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-xs text-muted-foreground">Monto validado</span>
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">{fmtMXN(totalMXN)}</p>
          </div>
        </div>
      )}

      {/* Banner facturas pendientes */}
      {!loading && pending.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/30 rounded-xl px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {pending.length} factura{pending.length > 1 ? 's' : ''} en revisión
              </p>
              <p className="text-xs text-muted-foreground">En proceso de validación</p>
            </div>
          </div>
          <button onClick={() => setTab('pending')} className="text-xs font-semibold text-amber-600 hover:underline shrink-0">Ver</button>
        </div>
      )}

      {loading ? <Skeleton /> : invoices.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Sin facturas registradas</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Tu ejecutivo de cuenta registrará tus facturas. Una vez validadas, los puntos se acreditarán automáticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit flex-wrap">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl py-12 text-center">
              <p className="text-sm text-muted-foreground">No hay facturas en esta categoría.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map(inv => {
                const st = STATUS[inv.status] ?? STATUS.pending
                const StIcon = st.Icon
                return (
                  <button key={inv.id} onClick={() => setSelected(inv)}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-4 hover:bg-muted/20 hover:border-muted-foreground/20 transition-all text-left group">

                    {/* Icono estado */}
                    <div className={`w-10 h-10 rounded-xl ${st.bg} flex items-center justify-center shrink-0`}>
                      <StIcon className={`w-5 h-5 ${st.text}`} />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{fmtMXN(inv.total_mxn)}</p>
                        {inv.points_generated != null && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            +{fmtPts(inv.points_generated)} pts
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{fmtDate(inv.issued_at)}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/60">{shortUUID(inv.uuid_cfdi)}</span>
                      </div>
                      {inv.rejection_reason && (
                        <p className="text-[11px] text-red-500 mt-0.5 truncate">{inv.rejection_reason}</p>
                      )}
                    </div>

                    {/* Badge de estado */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span className={`text-[10px] font-bold ${st.text}`}>{st.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
