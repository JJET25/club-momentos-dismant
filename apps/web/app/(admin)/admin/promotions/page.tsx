'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2, Megaphone, BadgeCheck, Calendar, Globe, MapPin, ImagePlus, X, Upload, Pencil, Star } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface Partner {
  id:          string
  name:        string
  logo_url:    string | null
  is_verified: boolean
}

interface Promotion {
  id:              string
  title:           string
  description:     string | null
  image_url:       string | null
  banner_key:      string | null
  destination_url: string | null
  geo_type:        'national' | 'local'
  geo_states:      string[] | null
  geo_cities:      string[] | null
  valid_from:      string
  valid_until:     string
  status:          string
  featured:        boolean
  created_at:      string
  partners:        Partner | null
}

// ── Config ────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Borrador',    bg: 'bg-zinc-500/15',   text: 'text-zinc-500' },
  in_review: { label: 'En revisión', bg: 'bg-amber-500/15',  text: 'text-amber-600' },
  approved:  { label: 'Programada',  bg: 'bg-blue-500/15',   text: 'text-blue-600' },
  active:    { label: 'Activa',      bg: 'bg-emerald-500/15',text: 'text-emerald-600' },
  expired:   { label: 'Vencida',     bg: 'bg-zinc-400/15',   text: 'text-zinc-400' },
  rejected:  { label: 'Rechazada',   bg: 'bg-red-500/15',    text: 'text-red-600' },
}

const PENDING_STATUSES = ['draft', 'in_review']
const HISTORY_STATUSES = ['approved', 'active', 'expired', 'rejected']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── BannerImage ───────────────────────────────────────────────

function BannerImage({ promo, className = '' }: { promo: Promotion; className?: string }) {
  const src = promo.banner_key
    ? `/api/admin/promotions/${promo.id}/banner`
    : promo.image_url ?? null

  if (src) {
    return (
      <img
        src={src}
        alt={promo.title}
        className={`w-full h-full object-cover ${className}`}
      />
    )
  }

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <Megaphone className="w-10 h-10 text-muted-foreground/20" />
    </div>
  )
}

// ── PromotionCard ─────────────────────────────────────────────

function PromotionCard({
  promo, isPending, isOwner, onApprove, onReject, onToggleFeatured, onDelete, onBannerUploaded, onEdit,
}: {
  promo:              Promotion
  isPending:          boolean
  isOwner:            boolean
  onApprove:          (id: string) => void
  onReject:           (promo: Promotion) => void
  onToggleFeatured:   (id: string, current: boolean) => void
  onDelete:           (promo: Promotion) => void
  onBannerUploaded:   (id: string, key: string) => void
  onEdit:             (promo: Promotion) => void
}) {
  const [approving, setApproving]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const cfg = STATUS_CFG[promo.status] ?? { label: promo.status, bg: 'bg-zinc-400/15', text: 'text-zinc-400' }
  const hasBanner = !!(promo.banner_key || promo.image_url)

  async function handleApprove() {
    setApproving(true)
    const res = await fetch(`/api/admin/promotions/${promo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setApproving(false)
    if (res.ok) onApprove(promo.id)
  }

  async function handleBannerFile(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/admin/promotions/${promo.id}/banner`, { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) {
      const { bannerKey } = await res.json()
      onBannerUploaded(promo.id, bannerKey)
    }
  }

  const partner = promo.partners

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group">
      {/* Banner */}
      <div className="relative aspect-[2/1] bg-gradient-to-br from-primary/10 via-primary/5 to-muted overflow-hidden">
        <BannerImage promo={promo} />

        {/* Gradiente inferior para legibilidad del partner */}
        {partner && (
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        )}

        {/* Badges de estado — esquina superior derecha */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
          {promo.featured && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/90 text-white backdrop-blur-sm">
              <Star className="w-2.5 h-2.5 fill-white" /> Destacada
            </span>
          )}
        </div>

        {/* Controles de hover — esquina superior izquierda */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerFile(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Subir imagen de banner"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/70 disabled:opacity-60 transition-colors"
          >
            {uploading
              ? <><div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Subiendo…</>
              : <><ImagePlus className="w-3 h-3" /> {hasBanner ? 'Cambiar' : 'Imagen'}</>
            }
          </button>
          <button
            onClick={() => onEdit(promo)}
            title="Editar promoción"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/70 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
        </div>

        {/* Partner info sobre el gradiente */}
        {partner && (
          <div className="absolute bottom-0 inset-x-0 p-3 flex items-center gap-2">
            {partner.logo_url ? (
              <img src={partner.logo_url} alt="" className="w-6 h-6 rounded-full bg-white object-contain ring-1 ring-white/30 shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-white">{partner.name[0]}</span>
              </div>
            )}
            <span className="text-xs font-medium text-white leading-none">{partner.name}</span>
            {partner.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {promo.title}
        </h3>
        {promo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {promo.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{fmtDate(promo.valid_from)} — {fmtDate(promo.valid_until)}</span>
          <span className="ml-auto flex items-center gap-1">
            {promo.geo_type === 'national'
              ? <><Globe className="w-3 h-3" /> Nacional</>
              : <><MapPin className="w-3 h-3" /> Local</>
            }
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        {isPending && (
          <>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {approving ? '…' : 'Aprobar'}
            </button>
            <button
              onClick={() => onReject(promo)}
              className="flex-1 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              Rechazar
            </button>
          </>
        )}

        {!isPending && (promo.status === 'active' || promo.status === 'approved') && (
          <button
            onClick={() => onToggleFeatured(promo.id, promo.featured)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              promo.featured
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/30'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            }`}
          >
            {promo.featured
              ? 'Quitar destacada'
              : <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" /> Destacar</span>
            }
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => onDelete(promo)}
            title="Eliminar"
            className="p-2 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 dark:hover:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-900"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Modal de rechazo ──────────────────────────────────────────

function RejectModal({ promo, onClose, onRejected }: {
  promo:      Promotion
  onClose:    () => void
  onRejected: (id: string) => void
}) {
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { setError('La razón es obligatoria'); return }
    setLoading(true)
    const res = await fetch(`/api/admin/promotions/${promo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
    })
    setLoading(false)
    if (!res.ok) { setError('Error al rechazar'); return }
    onRejected(promo.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-base text-foreground">Rechazar promoción</h3>
        <p className="text-sm text-muted-foreground">{promo.title}</p>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Razón del rechazo <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe por qué se rechaza esta promoción…"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
            {loading ? 'Rechazando…' : 'Rechazar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Modal de eliminación ──────────────────────────────────────

function DeleteModal({ promo, onClose, onDeleted }: {
  promo:     Promotion
  onClose:   () => void
  onDeleted: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/admin/promotions/${promo.id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Error al eliminar'); return }
    onDeleted(promo.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Eliminar promoción</h3>
            <p className="text-xs text-muted-foreground">Esta acción es irreversible</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-600">
          ¿Eliminar <strong>{promo.title}</strong>? Se borrará permanentemente.
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de edición ──────────────────────────────────────────

function EditModal({ promo, onClose, onUpdated }: {
  promo:      Promotion
  onClose:    () => void
  onUpdated:  (updated: Partial<Promotion> & { id: string }) => void
}) {
  function toLocalDT(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [form, setForm] = useState({
    title:           promo.title,
    description:     promo.description ?? '',
    destination_url: promo.destination_url ?? '',
    geo_type:        promo.geo_type as 'national' | 'local',
    geo_states:      (promo.geo_states ?? []).join(', '),
    geo_cities:      (promo.geo_cities ?? []).join(', '),
    valid_from:      toLocalDT(promo.valid_from),
    valid_until:     toLocalDT(promo.valid_until),
    featured:        promo.featured,
  })
  const [bannerFile, setBannerFile]       = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [dragging, setDragging]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleFile(file: File) {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      setError('Formato no válido. Usa JPG, PNG, WEBP o GIF.'); return
    }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB.'); return }
    setError('')
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  function clearBanner() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerFile(null)
    setBannerPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.valid_from || !form.valid_until) { setError('Las fechas son obligatorias'); return }
    if (form.valid_from >= form.valid_until) { setError('La fecha de fin debe ser posterior al inicio'); return }

    setLoading(true)

    const res = await fetch(`/api/admin/promotions/${promo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:           form.title.trim(),
        description:     form.description.trim() || null,
        destination_url: form.destination_url.trim() || null,
        geo_type:        form.geo_type,
        geo_states:      form.geo_type === 'local'
          ? form.geo_states.split(',').map(s => s.trim()).filter(Boolean) : [],
        geo_cities: form.geo_type === 'local'
          ? form.geo_cities.split(',').map(s => s.trim()).filter(Boolean) : [],
        valid_from:  new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        featured:    form.featured,
      }),
    })

    if (!res.ok) {
      setLoading(false)
      const d = await res.json()
      setError(d.error ?? 'Error al guardar')
      return
    }

    const updates: Partial<Promotion> & { id: string } = {
      id:              promo.id,
      title:           form.title.trim(),
      description:     form.description.trim() || null,
      destination_url: form.destination_url.trim() || null,
      geo_type:        form.geo_type,
      geo_states:      form.geo_type === 'local'
        ? form.geo_states.split(',').map(s => s.trim()).filter(Boolean) : [],
      geo_cities: form.geo_type === 'local'
        ? form.geo_cities.split(',').map(s => s.trim()).filter(Boolean) : [],
      valid_from:  new Date(form.valid_from).toISOString(),
      valid_until: new Date(form.valid_until).toISOString(),
      featured:    form.featured,
    }

    // Subir nuevo banner si se seleccionó
    if (bannerFile) {
      const fd = new FormData()
      fd.append('file', bannerFile)
      const bannerRes = await fetch(`/api/admin/promotions/${promo.id}/banner`, {
        method: 'POST', body: fd,
      }).catch(() => null)
      if (bannerRes?.ok) {
        const { bannerKey } = await bannerRes.json()
        updates.banner_key = bannerKey
      }
    }

    setLoading(false)
    onUpdated(updates)
    onClose()
  }

  const currentBannerSrc = promo.banner_key
    ? `/api/admin/promotions/${promo.id}/banner`
    : promo.image_url ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold text-base text-foreground">Editar promoción</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{promo.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Banner */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Imagen del banner</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {(bannerPreview || currentBannerSrc) ? (
              <div className="relative rounded-xl overflow-hidden aspect-[2/1] bg-muted">
                <img
                  src={bannerPreview ?? currentBannerSrc!}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium hover:bg-black/80"
                  >
                    <ImagePlus className="w-3 h-3" /> Cambiar
                  </button>
                  {bannerPreview && (
                    <button
                      type="button"
                      onClick={clearBanner}
                      className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
                className={`aspect-[2/1] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <Upload className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Arrastra o haz clic para subir</p>
                <p className="text-xs text-muted-foreground/60">JPG, PNG, WEBP, GIF · máx. 5 MB</p>
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Descripción</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* URL destino */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">URL destino</label>
            <input
              type="url"
              value={form.destination_url}
              onChange={e => set('destination_url', e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={e => set('valid_from', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Fin <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={e => set('valid_until', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Cobertura */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Cobertura</label>
            <select
              value={form.geo_type}
              onChange={e => set('geo_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="national">Todo México</option>
              <option value="local">Local (por estado/ciudad)</option>
            </select>
          </div>

          {form.geo_type === 'local' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Estados (coma)</label>
                <input
                  type="text"
                  value={form.geo_states}
                  onChange={e => set('geo_states', e.target.value)}
                  placeholder="Nuevo León, Jalisco"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Ciudades (coma)</label>
                <input
                  type="text"
                  value={form.geo_cities}
                  onChange={e => set('geo_cities', e.target.value)}
                  placeholder="Monterrey, Guadalajara"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => set('featured', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">Marcar como destacada (banner principal)</span>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Modal de creación ─────────────────────────────────────────

const MX_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
]

type FormData = {
  partner_id:      string
  title:           string
  description:     string
  destination_url: string
  geo_type:        'national' | 'local'
  geo_states:      string
  geo_cities:      string
  valid_from:      string
  valid_until:     string
  featured:        boolean
}

const EMPTY_FORM: FormData = {
  partner_id: '', title: '', description: '', destination_url: '',
  geo_type: 'national', geo_states: '', geo_cities: '',
  valid_from: '', valid_until: '', featured: false,
}

function CreateModal({ partners, onClose, onCreated }: {
  partners:  Partner[]
  onClose:   () => void
  onCreated: (p: Promotion) => void
}) {
  const [form, setForm]           = useState<FormData>(EMPTY_FORM)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [dragging, setDragging]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Formato de imagen no válido. Usa JPG, PNG, WEBP o GIF.'); return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB.'); return
    }
    setError('')
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  function clearBanner() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview)
    setBannerFile(null)
    setBannerPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.partner_id) { setError('Selecciona un aliado'); return }
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.valid_from || !form.valid_until) { setError('Las fechas son obligatorias'); return }
    if (form.valid_from >= form.valid_until) { setError('La fecha de fin debe ser posterior al inicio'); return }

    setLoading(true)
    const res = await fetch('/api/admin/promotions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id:      form.partner_id,
        title:           form.title.trim(),
        description:     form.description.trim() || null,
        destination_url: form.destination_url.trim() || null,
        geo_type:        form.geo_type,
        geo_states:      form.geo_type === 'local'
          ? form.geo_states.split(',').map(s => s.trim()).filter(Boolean) : [],
        geo_cities: form.geo_type === 'local'
          ? form.geo_cities.split(',').map(s => s.trim()).filter(Boolean) : [],
        valid_from:  new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        featured:    form.featured,
      }),
    })

    if (!res.ok) {
      setLoading(false)
      const d = await res.json()
      setError(d.error ?? 'Error al crear')
      return
    }

    const { promotion } = await res.json()

    // Subir banner si se seleccionó uno
    if (bannerFile) {
      const fd = new FormData()
      fd.append('file', bannerFile)
      const bannerRes = await fetch(`/api/admin/promotions/${promotion.id}/banner`, {
        method: 'POST', body: fd,
      }).catch(() => null)

      if (bannerRes?.ok) {
        const { bannerKey } = await bannerRes.json()
        promotion.banner_key = bannerKey
      }
    }

    setLoading(false)
    onCreated(promotion)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-base text-foreground">Nueva promoción</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Banner upload */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Imagen del banner</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {bannerPreview ? (
              <div className="relative rounded-xl overflow-hidden aspect-[2/1] bg-muted">
                <img src={bannerPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearBanner}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setDragging(false)
                  const f = e.dataTransfer.files[0]; if (f) handleFile(f)
                }}
                onClick={() => fileRef.current?.click()}
                className={`aspect-[2/1] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <Upload className="w-8 h-8 text-muted-foreground/40" />
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Arrastra una imagen o haz clic</p>
                  <p className="text-xs text-muted-foreground/60">JPG, PNG, WEBP, GIF · máx. 5 MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Aliado */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Aliado <span className="text-red-500">*</span>
            </label>
            <select
              value={form.partner_id}
              onChange={e => set('partner_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Selecciona un aliado…</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.is_verified ? ' — verificado' : ''}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Nombre de la promoción"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Descripción</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Descripción opcional…"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* URL destino */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">URL destino</label>
            <input
              type="url"
              value={form.destination_url}
              onChange={e => set('destination_url', e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={e => set('valid_from', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Fin <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={e => set('valid_until', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Cobertura */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Cobertura</label>
            <select
              value={form.geo_type}
              onChange={e => set('geo_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="national">Todo México</option>
              <option value="local">Local (por estado/ciudad)</option>
            </select>
          </div>

          {form.geo_type === 'local' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Estados (coma)</label>
                <input
                  type="text"
                  value={form.geo_states}
                  onChange={e => set('geo_states', e.target.value)}
                  placeholder={MX_STATES[8]}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Ciudades (coma)</label>
                <input
                  type="text"
                  value={form.geo_cities}
                  onChange={e => set('geo_cities', e.target.value)}
                  placeholder="Monterrey, Guadalajara"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => set('featured', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">Marcar como destacada (banner principal)</span>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? 'Creando…' : 'Crear promoción'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

type Tab = 'pending' | 'history'

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [partners, setPartners]     = useState<Partner[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>('pending')
  const [rejecting, setRejecting]   = useState<Promotion | null>(null)
  const [deleting, setDeleting]     = useState<Promotion | null>(null)
  const [editing, setEditing]       = useState<Promotion | null>(null)
  const [creating, setCreating]     = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [isOwner, setIsOwner]       = useState(false)

  async function load() {
    setLoading(true)
    const [promoRes, partnerRes, meRes] = await Promise.all([
      fetch('/api/admin/promotions'),
      fetch('/api/admin/partners'),
      fetch('/api/admin/me'),
    ])
    if (promoRes.ok)   { const d = await promoRes.json();   setPromotions(d.promotions ?? []) }
    if (partnerRes.ok) { const d = await partnerRes.json(); setPartners(d.partners ?? []) }
    if (meRes.ok)      { const d = await meRes.json();      setIsOwner(d.role === 'owner') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleApproved(id: string) {
    setPromotions(prev => prev.map(p =>
      p.id === id
        ? { ...p, status: new Date() >= new Date(p.valid_from) ? 'active' : 'approved' }
        : p
    ))
  }

  function handleRejected(id: string) {
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p))
  }

  async function handleToggleFeatured(id: string, current: boolean) {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !current }),
    })
    if (res.ok) setPromotions(prev => prev.map(p => p.id === id ? { ...p, featured: !current } : p))
  }

  function handleCreated(promo: Promotion) {
    setPromotions(prev => [promo, ...prev])
  }

  function handleDeleted(id: string) {
    setPromotions(prev => prev.filter(p => p.id !== id))
  }

  function handleBannerUploaded(id: string, key: string) {
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, banner_key: key } : p))
  }

  function handleEdited(updated: Partial<Promotion> & { id: string }) {
    setPromotions(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  const pending = promotions.filter(p => PENDING_STATUSES.includes(p.status))
  const history = promotions.filter(p => HISTORY_STATUSES.includes(p.status))
  const historyFiltered = statusFilter === 'all' ? history : history.filter(p => p.status === statusFilter)
  const displayed = tab === 'pending' ? pending : historyFiltered

  return (
    <div className="space-y-6">
      {rejecting && (
        <RejectModal promo={rejecting} onClose={() => setRejecting(null)} onRejected={handleRejected} />
      )}
      {deleting && (
        <DeleteModal promo={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />
      )}
      {editing && (
        <EditModal promo={editing} onClose={() => setEditing(null)} onUpdated={handleEdited} />
      )}
      {creating && (
        <CreateModal partners={partners} onClose={() => setCreating(false)} onCreated={handleCreated} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promociones de Aliados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revisa, aprueba y gestiona las promociones en el portal.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Nueva promoción
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-1 border-b border-border">
        {([
          { key: 'pending' as Tab, label: 'En revisión',       count: pending.length },
          { key: 'history' as Tab, label: 'Activas / Historial', count: history.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtro historial */}
      {tab === 'history' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Estado:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos</option>
            {HISTORY_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Grid de tarjetas */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[2/1] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <Megaphone className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {tab === 'pending' ? 'No hay promociones en revisión.' : 'No hay promociones en el historial.'}
          </p>
          <p className="text-xs text-muted-foreground">
            {tab === 'pending'
              ? 'Las nuevas promociones de aliados aparecerán aquí.'
              : 'Las promociones aprobadas, activas y rechazadas se muestran aquí.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(p => (
            <PromotionCard
              key={p.id}
              promo={p}
              isPending={tab === 'pending'}
              isOwner={isOwner}
              onApprove={handleApproved}
              onReject={setRejecting}
              onToggleFeatured={handleToggleFeatured}
              onDelete={setDeleting}
              onBannerUploaded={handleBannerUploaded}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}
    </div>
  )
}
