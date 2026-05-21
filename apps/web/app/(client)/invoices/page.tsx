'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobada',   className: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazada',  className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada',  className: 'bg-gray-100 text-gray-600' },
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estatus' },
  { value: 'pending',   label: 'Pendiente' },
  { value: 'approved',  label: 'Aprobada' },
  { value: 'rejected',  label: 'Rechazada' },
  { value: 'cancelled', label: 'Cancelada' },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function truncateUUID(uuid: string) { return `${uuid.slice(0, 8)}...` }

// ── Modal de detalle ─────────────────────────────────────────

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const st = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.pending

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-foreground">Detalle de factura</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Estatus */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estatus</span>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${st.className}`}>
              {st.label}
            </span>
          </div>

          {invoice.rejection_reason && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <strong>Motivo de rechazo:</strong> {invoice.rejection_reason}
            </div>
          )}

          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {[
              { label: 'Folio Fiscal (UUID)', value: invoice.uuid_cfdi, mono: true },
              { label: 'RFC Emisor',   value: invoice.rfc_emisor,   mono: true },
              { label: 'RFC Receptor', value: invoice.rfc_receptor, mono: true },
              { label: 'Total',        value: formatCurrency(invoice.total_mxn) },
              { label: 'Fecha emisión', value: formatDate(invoice.issued_at) },
              { label: 'Fecha de subida', value: formatDateTime(invoice.created_at) },
              ...(invoice.approved_at
                ? [{ label: 'Fecha aprobación', value: formatDateTime(invoice.approved_at) }]
                : []),
              ...(invoice.points_generated != null
                ? [{ label: 'Puntos generados', value: `+${invoice.points_generated.toLocaleString('es-MX')} pts` }]
                : []),
            ].map(row => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3 bg-muted/20">
                <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                <span className={`text-xs font-medium text-foreground text-right break-all ${row.mono ? 'font-mono' : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Zona de carga ────────────────────────────────────────────

type UploadState =
  | { status: 'idle' }
  | { status: 'dragging' }
  | { status: 'uploading' }
  | { status: 'success'; invoice: Invoice }
  | { status: 'error'; message: string }

// ── Página principal ─────────────────────────────────────────

export default function InvoicesPage() {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' })
  const [selected, setSelected] = useState<Invoice | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtros
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  async function loadInvoices() {
    const res = await fetch('/api/client/invoices')
    if (res.ok) {
      const { invoices: data } = await res.json()
      setAllInvoices(data)
    }
    setLoadingList(false)
  }

  useEffect(() => { loadInvoices() }, [])

  // Filtrado cliente
  const invoices = allInvoices.filter(inv => {
    if (filterStatus && inv.status !== filterStatus) return false
    if (filterFrom && inv.created_at < filterFrom) return false
    if (filterTo && inv.created_at > filterTo + 'T23:59:59') return false
    return true
  })

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setUpload({ status: 'error', message: 'Solo se aceptan archivos XML de CFDI.' })
      return
    }
    setUpload({ status: 'uploading' })
    const form = new FormData()
    form.append('xml', file)
    const res = await fetch('/api/client/invoices', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      setUpload({ status: 'error', message: data.error ?? 'Error al procesar la factura.' })
      return
    }
    setUpload({ status: 'success', invoice: data.invoice })
    loadInvoices()
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUpload({ status: 'idle' })
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUpload({ status: 'dragging' })
  }, [])

  const onDragLeave = useCallback(() => {
    setUpload(s => s.status === 'dragging' ? { status: 'idle' } : s)
  }, [])

  function resetUpload() {
    setUpload({ status: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  function clearFilters() {
    setFilterStatus('')
    setFilterFrom('')
    setFilterTo('')
  }

  const hasFilters = filterStatus || filterFrom || filterTo
  const isDragging = upload.status === 'dragging'

  return (
    <div className="space-y-8">

      {selected && (
        <InvoiceDetailModal invoice={selected} onClose={() => setSelected(null)} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Facturas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sube tus facturas XML de Dismant para acumular puntos.
        </p>
      </div>

      {/* Zona de carga */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`rounded-2xl border-2 border-dashed transition-colors p-10 text-center
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}
      >
        {(upload.status === 'idle' || upload.status === 'dragging') && (
          <>
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu XML aquí'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">o selecciónalo desde tu equipo</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary text-sm">
              Seleccionar archivo XML
            </button>
            <input ref={inputRef} type="file" accept=".xml" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <p className="text-xs text-muted-foreground mt-4">Solo archivos .xml · Máximo 2 MB</p>
          </>
        )}

        {upload.status === 'uploading' && (
          <div className="py-4">
            <div className="animate-spin w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Procesando factura...</p>
          </div>
        )}

        {upload.status === 'success' && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Factura registrada</p>
            <p className="text-sm text-muted-foreground mb-1">
              UUID: <span className="font-mono">{truncateUUID(upload.invoice.uuid_cfdi)}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              Total: <strong>{formatCurrency(upload.invoice.total_mxn)}</strong>
            </p>
            {upload.invoice.points_generated != null && (
              <p className="text-sm font-medium text-primary mt-2">
                +{upload.invoice.points_generated.toLocaleString('es-MX')} puntos estimados
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Pendiente de validación por el equipo Dismant.</p>
            <button onClick={resetUpload} className="mt-4 text-sm text-primary hover:underline">
              Subir otra factura
            </button>
          </div>
        )}

        {upload.status === 'error' && (
          <div className="py-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-foreground mb-2">No se pudo registrar la factura</p>
            <p className="text-sm text-red-600 mb-4">{upload.message}</p>
            <button onClick={resetUpload} className="btn-secondary text-sm">Intentar con otro archivo</button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Estatus</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-field text-sm py-2"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Desde</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="input-field text-sm py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="input-field text-sm py-2"
          />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground pb-0.5">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Historial de facturas</h2>
          {hasFilters && (
            <span className="text-xs text-muted-foreground">{invoices.length} resultado{invoices.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loadingList ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {hasFilters ? 'No hay facturas que coincidan con los filtros.' : 'Aún no has registrado ninguna factura.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Folio Fiscal</th>
                <th className="px-6 py-3 font-medium">Fecha de subida</th>
                <th className="px-6 py-3 font-medium">Monto</th>
                <th className="px-6 py-3 font-medium">Puntos</th>
                <th className="px-6 py-3 font-medium">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(inv => {
                const st = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending
                return (
                  <tr
                    key={inv.id}
                    onClick={() => setSelected(inv)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-xs">{truncateUUID(inv.uuid_cfdi)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.created_at)}</td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(inv.total_mxn)}</td>
                    <td className="px-6 py-4">
                      {inv.points_generated != null
                        ? <span className="text-primary font-medium">+{inv.points_generated.toLocaleString('es-MX')}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
