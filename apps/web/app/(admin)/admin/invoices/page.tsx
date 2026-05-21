'use client'

import { useEffect, useState } from 'react'

// ── Tipos ────────────────────────────────────────────────────

interface InvoiceMember {
  id:       string
  full_name: string
  company_name: string | null
  rfc:      string
}

interface Invoice {
  id:               string
  uuid_cfdi:        string
  rfc_emisor:       string
  rfc_receptor:     string
  total_mxn:        number
  issued_at:        string
  status:           string
  points_generated: number | null
  rejection_reason: string | null
  approved_at:      string | null
  created_at:       string
  members:          InvoiceMember | null
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobada',   className: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazada',  className: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Cancelada',  className: 'bg-gray-100 text-gray-500' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

// ── Panel de detalle lateral ──────────────────────────────────

function InvoiceDetailPanel({ invoice, onClose, onAction }: {
  invoice: Invoice
  onClose: () => void
  onAction: () => void
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing]     = useState<'approve' | 'reject' | null>(null)
  const [error, setError]               = useState('')

  async function approve() {
    setProcessing('approve'); setError('')
    const res = await fetch(`/api/admin/invoices/${invoice.id}/approve`, { method: 'POST' })
    setProcessing(null)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    onAction()
    onClose()
  }

  async function reject() {
    if (!rejectReason.trim()) { setError('La razón de rechazo es obligatoria'); return }
    setProcessing('reject'); setError('')
    const res = await fetch(`/api/admin/invoices/${invoice.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason.trim() }),
    })
    setProcessing(null)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    onAction()
    onClose()
  }

  const isPending = invoice.status === 'pending'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-5 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Detalle de factura</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Datos del miembro */}
        <div className="bg-muted/30 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{invoice.members?.full_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{invoice.members?.company_name} · {invoice.members?.rfc}</p>
        </div>

        {/* Datos del CFDI */}
        <div className="divide-y divide-border rounded-xl border overflow-hidden">
          {[
            { label: 'Folio Fiscal',    value: invoice.uuid_cfdi,        mono: true  },
            { label: 'RFC Emisor',      value: invoice.rfc_emisor,       mono: true  },
            { label: 'RFC Receptor',    value: invoice.rfc_receptor,     mono: true  },
            { label: 'Total',           value: fmtCurrency(invoice.total_mxn)        },
            { label: 'Fecha emisión',   value: fmtDate(invoice.issued_at)            },
            { label: 'Fecha de subida', value: fmtDate(invoice.created_at)           },
            { label: 'Puntos estimados', value: invoice.points_generated != null
                ? `+${invoice.points_generated.toLocaleString('es-MX')} pts` : '—'  },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/20">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className={`text-xs font-medium text-foreground text-right break-all ${row.mono ? 'font-mono' : ''}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
        )}

        {/* Acciones */}
        {isPending ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={approve}
                disabled={!!processing}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {processing === 'approve' && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                ✓ Aprobar
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Razón de rechazo…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="input-field text-sm py-2 flex-1"
              />
              <button
                onClick={reject}
                disabled={!!processing}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60 flex items-center gap-1.5 shrink-0"
              >
                {processing === 'reject' && <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />}
                Rechazar
              </button>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl px-4 py-3 text-sm ${STATUS_CFG[invoice.status]?.className ?? ''}`}>
            <strong>{STATUS_CFG[invoice.status]?.label}</strong>
            {invoice.rejection_reason && ` — ${invoice.rejection_reason}`}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading]   = useState(true)
  const [status, setStatus]     = useState('pending')
  const [selected, setSelected] = useState<Invoice | null>(null)

  async function load(st = status) {
    setLoading(true)
    const res = await fetch(`/api/admin/invoices?status=${st}`)
    if (res.ok) {
      const { invoices: data } = await res.json()
      setInvoices(data)
    }
    setLoading(false)
  }

  useEffect(() => { load(status) }, [status])

  const tabs = ['pending', 'approved', 'rejected'] as const

  return (
    <div className="space-y-6">
      {selected && (
        <InvoiceDetailPanel
          invoice={selected}
          onClose={() => setSelected(null)}
          onAction={() => load(status)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revisa y aprueba las facturas pendientes para acreditar puntos.
        </p>
      </div>

      {/* Tabs de estatus */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setStatus(t)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors capitalize ${
              status === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'pending' ? 'Pendientes' : t === 'approved' ? 'Aprobadas' : 'Rechazadas'}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Miembro</th>
              <th className="px-5 py-3 font-medium">Folio Fiscal</th>
              <th className="px-5 py-3 font-medium">Monto</th>
              <th className="px-5 py-3 font-medium">Subida</th>
              <th className="px-5 py-3 font-medium">Puntos est.</th>
              <th className="px-5 py-3 font-medium">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                ))}</tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  {status === 'pending' ? '✓ Sin facturas pendientes.' : 'Sin facturas en este estatus.'}
                </td>
              </tr>
            ) : invoices.map(inv => {
              const st = STATUS_CFG[inv.status] ?? STATUS_CFG.pending
              return (
                <tr
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground">{inv.members?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{inv.members?.company_name}</p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{inv.uuid_cfdi.slice(0, 8)}…</td>
                  <td className="px-5 py-4 font-medium">{fmtCurrency(inv.total_mxn)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{fmtDate(inv.created_at)}</td>
                  <td className="px-5 py-4 text-primary font-medium">
                    {inv.points_generated != null ? `+${inv.points_generated.toLocaleString('es-MX')}` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
