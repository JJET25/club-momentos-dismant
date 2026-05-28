'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

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

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Borrador',    className: 'bg-gray-100 text-gray-600' },
  in_review: { label: 'En revisión', className: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Programada',  className: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activa',      className: 'bg-green-100 text-green-700' },
  expired:   { label: 'Vencida',     className: 'bg-gray-100 text-gray-500' },
  rejected:  { label: 'Rechazada',   className: 'bg-red-100 text-red-600' },
}

const PENDING_STATUSES  = ['draft', 'in_review']
const HISTORY_STATUSES  = ['approved', 'active', 'expired', 'rejected']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modal de rechazo ──────────────────────────────────────────

function RejectModal({ promo, onClose, onRejected }: {
  promo:      Promotion
  onClose:    () => void
  onRejected: (id: string) => void
}) {
  const [reason, setReason]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { setError('La razón es obligatoria'); return }
    setLoading(true)
    const res = await fetch(`/api/admin/promotions/${promo.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'reject', rejection_reason: reason }),
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
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
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
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
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Eliminar promoción</h3>
            <p className="text-xs text-muted-foreground">Esta acción es irreversible</p>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700">
          ¿Eliminar <strong>{promo.title}</strong>? Se borrará permanentemente del sistema.
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
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
  image_url:       string
  destination_url: string
  geo_type:        'national' | 'local'
  geo_states:      string
  geo_cities:      string
  valid_from:      string
  valid_until:     string
  featured:        boolean
}

const EMPTY_FORM: FormData = {
  partner_id:      '',
  title:           '',
  description:     '',
  image_url:       '',
  destination_url: '',
  geo_type:        'national',
  geo_states:      '',
  geo_cities:      '',
  valid_from:      '',
  valid_until:     '',
  featured:        false,
}

function CreateModal({ partners, onClose, onCreated }: {
  partners:  Partner[]
  onClose:   () => void
  onCreated: (p: Promotion) => void
}) {
  const [form, setForm]       = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.partner_id) { setError('Selecciona un aliado'); return }
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.valid_from || !form.valid_until) { setError('Las fechas son obligatorias'); return }
    if (form.valid_from >= form.valid_until) { setError('La fecha de fin debe ser posterior al inicio'); return }

    setLoading(true)
    const res = await fetch('/api/admin/promotions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id:      form.partner_id,
        title:           form.title.trim(),
        description:     form.description.trim() || null,
        image_url:       form.image_url.trim() || null,
        destination_url: form.destination_url.trim() || null,
        geo_type:        form.geo_type,
        geo_states:      form.geo_type === 'local'
          ? form.geo_states.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        geo_cities: form.geo_type === 'local'
          ? form.geo_cities.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        valid_from:  new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        featured:    form.featured,
      }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al crear'); return }
    const { promotion } = await res.json()
    onCreated(promotion)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground">Nueva promoción</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Aliado */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Aliado <span className="text-red-500">*</span>
          </label>
          <select
            value={form.partner_id}
            onChange={e => set('partner_id', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Selecciona un aliado…</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.is_verified ? ' ✓' : ''}</option>
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
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* URLs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">URL de imagen</label>
            <input
              type="url"
              value={form.image_url}
              onChange={e => set('image_url', e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">URL destino</label>
            <input
              type="url"
              value={form.destination_url}
              onChange={e => set('destination_url', e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
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
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Cobertura */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Cobertura</label>
          <select
            value={form.geo_type}
            onChange={e => set('geo_type', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Ciudades (coma)</label>
              <input
                type="text"
                value={form.geo_cities}
                onChange={e => set('geo_cities', e.target.value)}
                placeholder="Monterrey, Guadalajara"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
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
      </form>
    </div>
  )
}

// ── Tarjeta de promoción ───────────────────────────────────────

function PromotionRow({
  promo, isPending, isOwner, onApprove, onReject, onToggleFeatured, onDelete,
}: {
  promo:            Promotion
  isPending:        boolean
  isOwner:          boolean
  onApprove:        (id: string) => void
  onReject:         (promo: Promotion) => void
  onToggleFeatured: (id: string, current: boolean) => void
  onDelete:         (promo: Promotion) => void
}) {
  const [approving, setApproving] = useState(false)
  const cfg = STATUS_CFG[promo.status] ?? { label: promo.status, className: 'bg-gray-100 text-gray-500' }

  async function handleApprove() {
    setApproving(true)
    const res = await fetch(`/api/admin/promotions/${promo.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'approve' }),
    })
    setApproving(false)
    if (res.ok) onApprove(promo.id)
  }

  const partner = promo.partners

  return (
    <div className="bg-white border border-border rounded-xl p-4 flex gap-4">
      {/* Imagen */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {promo.image_url
          ? <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
          : <span className="text-2xl">📢</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0 truncate">
            {promo.title}
          </p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.className}`}>
            {cfg.label}
          </span>
          {promo.featured && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              Destacada
            </span>
          )}
        </div>

        {partner && (
          <p className="text-xs text-muted-foreground">
            {partner.name}{partner.is_verified ? ' ✓' : ''}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {fmtDate(promo.valid_from)} — {fmtDate(promo.valid_until)}
          {' · '}
          {promo.geo_type === 'national' ? 'Nacional' : 'Local'}
        </p>
      </div>

      {/* Acciones */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        {isPending && (
          <>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {approving ? '…' : 'Aprobar'}
            </button>
            <button
              onClick={() => onReject(promo)}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100"
            >
              Rechazar
            </button>
          </>
        )}

        {!isPending && (promo.status === 'active' || promo.status === 'approved') && (
          <button
            onClick={() => onToggleFeatured(promo.id, promo.featured)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              promo.featured
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            }`}
          >
            {promo.featured ? 'Quitar destacada' : 'Destacar'}
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => onDelete(promo)}
            title="Eliminar promoción"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
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
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ featured: !current }),
    })
    if (res.ok) {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, featured: !current } : p))
    }
  }

  function handleCreated(promo: Promotion) {
    setPromotions(prev => [promo as Promotion, ...prev])
  }

  function handleDeleted(id: string) {
    setPromotions(prev => prev.filter(p => p.id !== id))
  }

  const pending = promotions.filter(p => PENDING_STATUSES.includes(p.status))
  const history = promotions.filter(p => HISTORY_STATUSES.includes(p.status))

  const historyFiltered = statusFilter === 'all'
    ? history
    : history.filter(p => p.status === statusFilter)

  const displayed = tab === 'pending' ? pending : historyFiltered

  return (
    <div className="space-y-6">
      {rejecting && (
        <RejectModal
          promo={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={handleRejected}
        />
      )}

      {deleting && (
        <DeleteModal
          promo={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}

      {creating && (
        <CreateModal
          partners={partners}
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
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
          { key: 'pending' as Tab,  label: 'En revisión', count: pending.length },
          { key: 'history' as Tab,  label: 'Activas / Historial', count: history.length },
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

      {/* Filtro de historial */}
      {tab === 'history' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Estado:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos</option>
            {HISTORY_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-4 flex gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-16 text-center">
          <p className="text-4xl mb-3">📢</p>
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
        <div className="space-y-3">
          {displayed.map(p => (
            <PromotionRow
              key={p.id}
              promo={p}
              isPending={tab === 'pending'}
              isOwner={isOwner}
              onApprove={handleApproved}
              onReject={setRejecting}
              onToggleFeatured={handleToggleFeatured}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
