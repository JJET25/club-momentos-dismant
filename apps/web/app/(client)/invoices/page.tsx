'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Invoice {
  id: string
  uuid_cfdi: string
  total_mxn: number
  issued_at: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  points_generated: number | null
  created_at: string
  rejection_reason: string | null
}

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobada',   className: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rechazada',  className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada',  className: 'bg-gray-100 text-gray-600' },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncateUUID(uuid: string) {
  return `${uuid.slice(0, 8)}...`
}

type UploadState =
  | { status: 'idle' }
  | { status: 'dragging' }
  | { status: 'uploading' }
  | { status: 'success'; invoice: Invoice }
  | { status: 'error'; message: string }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadInvoices() {
    const res = await fetch('/api/client/invoices')
    if (res.ok) {
      const { invoices: data } = await res.json()
      setInvoices(data)
    }
    setLoadingList(false)
  }

  useEffect(() => { loadInvoices() }, [])

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

  const isDragging = upload.status === 'dragging'
  const isUploading = upload.status === 'uploading'

  return (
    <div className="space-y-8">
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
        {upload.status === 'idle' || upload.status === 'dragging' ? (
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
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-primary text-sm"
            >
              Seleccionar archivo XML
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <p className="text-xs text-muted-foreground mt-4">Solo archivos .xml · Máximo 2 MB</p>
          </>
        ) : upload.status === 'uploading' ? (
          <div className="py-4">
            <div className="animate-spin w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Procesando factura...</p>
          </div>
        ) : upload.status === 'success' ? (
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
            <p className="text-xs text-muted-foreground mt-2">
              Estatus: Pendiente de validación por el equipo Dismant.
            </p>
            <button onClick={resetUpload} className="mt-4 text-sm text-primary hover:underline">
              Subir otra factura
            </button>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-foreground mb-2">No se pudo registrar la factura</p>
            <p className="text-sm text-red-600 mb-4">{upload.message}</p>
            <button onClick={resetUpload} className="btn-secondary text-sm">
              Intentar con otro archivo
            </button>
          </div>
        )}
      </div>

      {/* Lista de facturas */}
      <div className="bg-card rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-foreground">Historial de facturas</h2>
        </div>

        {loadingList ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aún no has registrado ninguna factura.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Folio Fiscal</th>
                <th className="px-6 py-3 font-medium">Fecha emisión</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Puntos</th>
                <th className="px-6 py-3 font-medium">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(inv => {
                const st = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending
                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-foreground">
                      {truncateUUID(inv.uuid_cfdi)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.issued_at)}</td>
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
                      {inv.status === 'rejected' && inv.rejection_reason && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{inv.rejection_reason}</p>
                      )}
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
