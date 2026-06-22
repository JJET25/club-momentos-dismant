'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ShieldCheck, Plus, Search, X, Pencil, Paperclip, ImageIcon, FileText, Upload, RefreshCw } from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────

interface InvoiceMember {
  id:           string
  full_name:    string
  company_name: string | null
  rfc:          string
}

interface Invoice {
  id:                  string
  uuid_cfdi:           string
  folio_referencia:    string | null
  evidence_key:        string | null
  rfc_emisor:          string
  rfc_receptor:        string
  total_mxn:           number
  issued_at:           string
  status:              string
  verification_status: string
  points_generated:    number | null
  rejection_reason:    string | null
  approved_at:         string | null
  verified_at:         string | null
  registered_by:       string | null
  created_at:          string
  members:             InvoiceMember | null
}

interface MemberOption {
  id:           string
  full_name:    string
  company_name: string | null
  rfc:          string
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  approved:  { label: 'Aprobada',   className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  rejected:  { label: 'Rechazada',  className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  cancelled: { label: 'Cancelada',  className: 'bg-muted text-muted-foreground' },
}

function isManager(role: string) { return role === 'owner' || role === 'admin' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function isImageKey(key: string | null) {
  if (!key) return false
  return /\.(jpg|jpeg|png|webp|heic)$/i.test(key)
}

// ── Componente de evidencia ───────────────────────────────────

function EvidenceSection({ invoice, onUpdate }: {
  invoice:  Invoice
  onUpdate: (key: string) => void
}) {
  const [url, setUrl]           = useState<string | null>(null)
  const [loadingUrl, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const fileRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!invoice.evidence_key) return
    setLoading(true)
    fetch(`/api/admin/invoices/${invoice.id}/evidence`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setUrl(d.url) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [invoice.id, invoice.evidence_key])

  async function upload(file: File) {
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}/evidence`, {
        method: 'POST',
        body:   fd,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al subir')
      }
      const { evidenceKey } = await res.json()
      onUpdate(evidenceKey)
      // Fetch signed URL immediately
      const r2 = await fetch(`/api/admin/invoices/${invoice.id}/evidence`)
      if (r2.ok) {
        const d = await r2.json()
        if (d.url) setUrl(d.url)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = ''
  }

  const hasEvidence = !!invoice.evidence_key
  const isImage     = isImageKey(invoice.evidence_key)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Evidencia</span>
        {hasEvidence && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {uploading ? 'Subiendo…' : 'Reemplazar'}
          </button>
        )}
      </div>

      {hasEvidence ? (
        loadingUrl ? (
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
        ) : url ? (
          isImage ? (
            <button
              onClick={() => window.open(url, '_blank')}
              className="block w-full rounded-xl overflow-hidden border hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Evidencia" className="w-full object-cover max-h-48" />
            </button>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">Ver documento PDF</span>
            </a>
          )
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No se pudo cargar la evidencia</p>
        )
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Subiendo…' : 'Adjuntar foto o PDF del documento'}
          </span>
          <span className="text-xs text-muted-foreground/60">JPG, PNG, PDF · máx. 8 MB</span>
        </button>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  )
}

// ── Modal de edición ─────────────────────────────────────────

function EditInvoiceModal({ invoice, userRole, onClose, onSuccess }: {
  invoice:    Invoice
  userRole:   string
  onClose:    () => void
  onSuccess:  (updated: Invoice) => void
}) {
  const isVerified = invoice.verification_status === 'verified'

  const [folio,  setFolio]  = useState(invoice.folio_referencia ?? '')
  const [monto,  setMonto]  = useState(String(invoice.total_mxn))
  const [puntos, setPuntos] = useState(String(invoice.points_generated ?? ''))
  const [fecha,  setFecha]  = useState(invoice.issued_at.slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')

    const body: Record<string, unknown> = {}
    if (folio !== (invoice.folio_referencia ?? '')) body.folioReferencia = folio
    if (monto !== String(invoice.total_mxn))        body.totalMxn = parseFloat(monto)
    if (fecha !== invoice.issued_at.slice(0, 10))   body.issuedAt = fecha
    if (!isVerified && puntos !== String(invoice.points_generated ?? '')) {
      body.pointsGenerated = parseInt(puntos)
    }

    if (Object.keys(body).length === 0) { onClose(); return }

    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al guardar')
      }
      const { invoice: updated } = await res.json()
      onSuccess(updated)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Editar factura</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Folio de referencia
              <span className="ml-1 text-muted-foreground/60 font-normal">(ej. FA-1234, REM-567)</span>
            </label>
            <input
              type="text"
              placeholder="FA-1234"
              value={folio}
              onChange={e => setFolio(e.target.value)}
              className="input-field text-sm w-full"
              autoFocus
            />
          </div>

          {!isVerified && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Puntos a asignar</label>
              <input
                type="number"
                min="1"
                step="1"
                value={puntos}
                onChange={e => setPuntos(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Monto MXN</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Fecha de emisión</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted/40">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Panel de detalle (side drawer) ───────────────────────────

function InvoiceDetailPanel({ invoice: initialInvoice, userRole, onClose, onRefresh }: {
  invoice:    Invoice
  userRole:   string
  onClose:    () => void
  onRefresh:  () => void
}) {
  const [invoice, setInvoice]           = useState(initialInvoice)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing]     = useState<'reject' | 'verify' | null>(null)
  const [error, setError]               = useState('')
  const [showEdit, setShowEdit]         = useState(false)

  const canEdit     = invoice.status !== 'rejected' && invoice.status !== 'cancelled'
  const isVerified  = invoice.verification_status === 'verified'
  const canEditRole = !isVerified || isManager(userRole)
  const isManual    = invoice.uuid_cfdi.startsWith('MANUAL-')
  const canVerify   = isManager(userRole) && !isVerified && invoice.status !== 'rejected' && invoice.status !== 'cancelled'

  async function callAction(endpoint: string, method = 'POST', body?: object) {
    const res = await fetch(endpoint, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error desconocido') }
    return res.json()
  }

  async function reject() {
    if (!rejectReason.trim()) { setError('La razón de rechazo es obligatoria'); return }
    setProcessing('reject'); setError('')
    try {
      await callAction(`/api/admin/invoices/${invoice.id}/reject`, 'POST', { reason: rejectReason.trim() })
      onRefresh(); onClose()
    } catch (e) { setError((e as Error).message); setProcessing(null) }
  }

  async function verify() {
    setProcessing('verify'); setError('')
    try {
      await callAction(`/api/admin/invoices/${invoice.id}/verify`)
      onRefresh(); onClose()
    } catch (e) { setError((e as Error).message); setProcessing(null) }
  }

  // Iniciales para el avatar
  const initials = (invoice.members?.full_name ?? '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <>
      {showEdit && (
        <EditInvoiceModal
          invoice={invoice}
          userRole={userRole}
          onClose={() => setShowEdit(false)}
          onSuccess={updated => setInvoice(prev => ({ ...prev, ...updated }))}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
        <div
          className="bg-card rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[88vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header fijo */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <h3 className="text-base font-bold">Detalle de factura</h3>
            <div className="flex items-center gap-1">
              {canEdit && canEditRole && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Editar factura"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo scrollable */}
          <div className="overflow-y-auto flex-1 px-6 py-5 pb-7 space-y-5">

            {/* Hero del miembro */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{invoice.members?.full_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {invoice.members?.company_name && <span>{invoice.members.company_name} · </span>}
                  <span className="font-mono">{invoice.members?.rfc}</span>
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CFG[invoice.status]?.className ?? ''}`}>
                {STATUS_CFG[invoice.status]?.label ?? invoice.status}
              </span>
              {isManual && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  Manual
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {isVerified && <ShieldCheck className="w-3 h-3" />}
                {isVerified ? 'Verificada' : 'Sin verificar'}
              </span>
              {invoice.evidence_key && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {isImageKey(invoice.evidence_key) ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  Con evidencia
                </span>
              )}
            </div>

            {/* Datos */}
            <div className="divide-y divide-border rounded-xl border overflow-hidden">
              {[
                { label: 'Folio referencia',    value: invoice.folio_referencia ?? '—',    mono: false },
                { label: 'Folio Fiscal (UUID)',  value: invoice.uuid_cfdi,                  mono: true  },
                { label: 'RFC Emisor',           value: invoice.rfc_emisor || '—',          mono: true  },
                { label: 'RFC Receptor',         value: invoice.rfc_receptor,               mono: true  },
                { label: 'Total',                value: fmtCurrency(invoice.total_mxn),     mono: false },
                { label: 'Fecha emisión',        value: fmtDate(invoice.issued_at),         mono: false },
                { label: 'Fecha de registro',    value: fmtDate(invoice.created_at),        mono: false },
                { label: 'Puntos asignados',     value: invoice.points_generated != null
                    ? `+${invoice.points_generated.toLocaleString('es-MX')} pts` : '—',     mono: false },
                ...(invoice.verified_at    ? [{ label: 'Verificada el',    value: fmtDate(invoice.verified_at),       mono: false }] : []),
                ...(invoice.rejection_reason ? [{ label: 'Razón de rechazo', value: invoice.rejection_reason,         mono: false }] : []),
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                  <span className={`text-xs font-medium text-right break-all ml-4 ${row.mono ? 'font-mono text-[11px]' : ''}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Evidencia */}
            <EvidenceSection
              invoice={invoice}
              onUpdate={key => setInvoice(prev => ({ ...prev, evidence_key: key }))}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
            )}

            {/* Acciones */}
            {canVerify && (
              <div className="space-y-2">
                <button
                  onClick={verify}
                  disabled={!!processing}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {processing === 'verify'
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <ShieldCheck className="w-4 h-4" />
                  }
                  Verificar y acreditar{invoice.points_generated != null
                    ? ` +${invoice.points_generated.toLocaleString('es-MX')} pts`
                    : ' puntos'}
                </button>

                {invoice.status !== 'rejected' && (
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
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 shrink-0 flex items-center gap-1.5"
                    >
                      {processing === 'reject' && (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isManager(userRole) && (
              <p className="text-xs text-muted-foreground text-center pb-1">
                Solo los administradores pueden verificar o rechazar facturas.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Modal de registro manual ──────────────────────────────────

function RegisterInvoiceModal({ onClose, onSuccess }: {
  onClose:   () => void
  onSuccess: () => void
}) {
  const [query, setQuery]             = useState('')
  const [members, setMembers]         = useState<MemberOption[]>([])
  const [allMembers, setAllMembers]   = useState<MemberOption[]>([])
  const [selectedMember, setSelected] = useState<MemberOption | null>(null)
  const [searching, setSearching]     = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [folio, setFolio]             = useState('')
  const [points, setPoints]           = useState('')
  const [totalMxn, setTotalMxn]       = useState('')
  const [description, setDescription] = useState('')
  const [issuedAt, setIssuedAt]       = useState('')
  const [evidenceFile, setEvidence]   = useState<File | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const fileRef                       = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSearching(true)
    fetch('/api/admin/members')
      .then(r => r.ok ? r.json() : { members: [] })
      .then(({ members: data }) => {
        setAllMembers(data ?? [])
        setMembers(data ?? [])
      })
      .catch(() => {})
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    if (!query.trim()) { setMembers(allMembers); return }
    const q = query.toLowerCase()
    setMembers(
      allMembers.filter(m =>
        m.full_name.toLowerCase().includes(q) ||
        m.rfc.toLowerCase().includes(q) ||
        (m.company_name ?? '').toLowerCase().includes(q)
      )
    )
  }, [query, allMembers])

  function onEvidenceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setEvidence(file)
    e.target.value = ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember) { setError('Selecciona un miembro'); return }
    const pts = parseInt(points)
    if (!pts || pts <= 0) { setError('Los puntos deben ser un número positivo'); return }

    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/admin/invoices/manual', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          memberId:         selectedMember.id,
          points:           pts,
          folioReferencia:  folio.trim() || undefined,
          totalMxn:         totalMxn ? parseFloat(totalMxn) : undefined,
          description:      description.trim() || undefined,
          issuedAt:         issuedAt || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Error al registrar')
      }
      const { invoice } = await res.json()

      // Subir evidencia si se seleccionó un archivo (no bloqueante)
      if (evidenceFile && invoice?.id) {
        const fd = new FormData()
        fd.append('file', evidenceFile)
        await fetch(`/api/admin/invoices/${invoice.id}/evidence`, {
          method: 'POST',
          body:   fd,
        }).catch(() => {}) // Si falla, la factura ya está creada
      }

      onSuccess(); onClose()
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Registrar factura manual</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Registra una operación realizada fuera de la plataforma. Los puntos se acreditarán solo cuando un administrador verifique el registro.
        </p>

        <form onSubmit={submit} className="space-y-4">
          {/* Búsqueda de miembro */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Miembro *</label>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{selectedMember.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedMember.company_name} · {selectedMember.rfc}</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setQuery('') }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, RFC o empresa…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                  className="input-field pl-9 text-sm w-full"
                />
                {searching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                )}
                {inputFocused && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    {members.length === 0 && !searching ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</p>
                    ) : (
                      members.slice(0, 8).map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setSelected(m); setQuery(''); setInputFocused(false) }}
                          className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-0"
                        >
                          <p className="text-sm font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">{m.company_name} · {m.rfc}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Folio de referencia */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Folio de referencia *
              <span className="ml-1 font-normal text-muted-foreground/60">(el que aparece en el documento físico)</span>
            </label>
            <input
              type="text"
              placeholder="Ej. FA-1234, REM-567, NV-001…"
              value={folio}
              onChange={e => setFolio(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>

          {/* Puntos */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Puntos a asignar *</label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Ej. 500"
              value={points}
              onChange={e => setPoints(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>

          {/* Monto y fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Monto MXN</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={totalMxn}
                onChange={e => setTotalMxn(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Fecha de emisión</label>
              <input
                type="date"
                value={issuedAt}
                onChange={e => setIssuedAt(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Descripción / referencia</label>
            <input
              type="text"
              placeholder="Ej. Compra en sucursal CDMX…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-field text-sm w-full"
            />
          </div>

          {/* Evidencia */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Evidencia
              <span className="ml-1 font-normal text-muted-foreground/60">(foto o PDF del documento)</span>
            </label>
            {evidenceFile ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/20">
                {evidenceFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{evidenceFile.name}</span>
                <button
                  type="button"
                  onClick={() => setEvidence(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors text-left"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Adjuntar foto o PDF del documento</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              className="hidden"
              onChange={onEvidenceChange}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Plus className="w-4 h-4" />
            }
            Registrar factura
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function AdminInvoicesPage() {
  const [invoices, setInvoices]         = useState<Invoice[]>([])
  const [loading, setLoading]           = useState(true)
  const [status, setStatus]             = useState('pending')
  const [selected, setSelected]         = useState<Invoice | null>(null)
  const [userRole, setUserRole]         = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [search, setSearch]             = useState('')
  const [counts, setCounts]             = useState<Record<string, number>>({})

  const load = useCallback(async (st = status) => {
    setLoading(true)
    const res = await fetch(`/api/admin/invoices?status=${st}`)
    if (res.ok) {
      const { invoices: data } = await res.json()
      setInvoices(data)
      setCounts(prev => ({ ...prev, [st]: data.length }))
    }
    setLoading(false)
  }, [status])

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: { role: string } | null) => { if (d?.role) setUserRole(d.role) })
      .catch(() => {})
  }, [])

  useEffect(() => { load(status) }, [status, load])

  const tabs = ['pending', 'approved', 'rejected'] as const

  const TAB_LABELS: Record<string, string> = {
    pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas',
  }

  const filtered = search.trim()
    ? invoices.filter(inv => {
        const q = search.toLowerCase()
        return (
          (inv.members?.full_name ?? '').toLowerCase().includes(q) ||
          (inv.members?.company_name ?? '').toLowerCase().includes(q) ||
          (inv.members?.rfc ?? '').toLowerCase().includes(q) ||
          (inv.folio_referencia ?? '').toLowerCase().includes(q)
        )
      })
    : invoices

  return (
    <div className="space-y-6">
      {selected && (
        <InvoiceDetailPanel
          invoice={selected}
          userRole={userRole}
          onClose={() => setSelected(null)}
          onRefresh={() => load(status)}
        />
      )}

      {showRegister && (
        <RegisterInvoiceModal
          onClose={() => setShowRegister(false)}
          onSuccess={() => { load('pending'); setStatus('pending') }}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revisa y acredita puntos. Managers verifican; empleados registran.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => load(status)}
            disabled={loading}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Registrar manual
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 border-b flex-1">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setStatus(t)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                status === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {TAB_LABELS[t]}
              {counts[t] != null && counts[t] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  status === t ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresa, RFC, folio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 pr-3 text-sm py-2 w-full sm:w-60"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Miembro</th>
              <th className="px-5 py-3 font-medium">Folio</th>
              <th className="px-5 py-3 font-medium">Monto</th>
              <th className="px-5 py-3 font-medium">Subida</th>
              <th className="px-5 py-3 font-medium">Puntos</th>
              <th className="px-5 py-3 font-medium">Estatus</th>
              <th className="px-5 py-3 font-medium">Verificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                  {search ? `Sin resultados para "${search}".` : status === 'pending' ? 'Sin facturas pendientes.' : 'Sin facturas en este estatus.'}
                </td>
              </tr>
            ) : filtered.map(inv => {
              const st         = STATUS_CFG[inv.status] ?? STATUS_CFG.pending
              const isManual   = inv.uuid_cfdi.startsWith('MANUAL-')
              const isVerified = inv.verification_status === 'verified'
              const folioLabel = inv.folio_referencia
                ?? (isManual ? inv.uuid_cfdi : `${inv.uuid_cfdi.slice(0, 8)}…`)
              const folioIsRef = !!inv.folio_referencia

              return (
                <tr
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium">{inv.members?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{inv.members?.company_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-mono text-xs font-semibold ${
                        folioIsRef ? 'text-foreground' : isManual ? 'text-purple-600' : 'text-muted-foreground'
                      }`}>
                        {folioLabel}
                      </p>
                      {inv.evidence_key && (
                        <span title="Tiene evidencia adjunta">
                          {isImageKey(inv.evidence_key)
                            ? <ImageIcon className="w-3 h-3 text-blue-500" />
                            : <FileText className="w-3 h-3 text-blue-500" />
                          }
                        </span>
                      )}
                    </div>
                    {folioIsRef && isManual && (
                      <p className="text-xs text-purple-500 font-mono">manual</p>
                    )}
                  </td>
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
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {isVerified && <ShieldCheck className="w-3 h-3" />}
                      {isVerified ? 'Verificada' : 'Pendiente'}
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
