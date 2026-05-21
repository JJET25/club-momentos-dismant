'use client'

import { useEffect, useRef, useState } from 'react'

// ── Tipos ─────────────────────────────────────────────────────

interface Sku {
  id:                   string
  name:                 string
  description:          string | null
  image_url:            string | null
  points_cost:          number
  stock:                number
  stock_alert_threshold: number
  geo_type:             string
  geo_states:           string[]
  geo_cities:           string[]
  is_digital:           boolean
  status:               string
  category:             string | null
  created_at:           string
}

type FormData = {
  name:                 string
  description:          string
  image_url:            string
  points_cost:          string
  stock:                string
  stock_alert_threshold: string
  geo_type:             'national' | 'local'
  geo_states:           string
  geo_cities:           string
  is_digital:           boolean
  category:             string
}

const EMPTY_FORM: FormData = {
  name:                 '',
  description:          '',
  image_url:            '',
  points_cost:          '',
  stock:                '',
  stock_alert_threshold: '10',
  geo_type:             'national',
  geo_states:           '',
  geo_cities:           '',
  is_digital:           false,
  category:             '',
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  active:       { label: 'Activo',       className: 'bg-green-100 text-green-700' },
  paused:       { label: 'Pausado',      className: 'bg-amber-100 text-amber-700' },
  discontinued: { label: 'Descontinuado', className: 'bg-gray-100 text-gray-500' },
}

const MX_STATES = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
]

function fmtPts(n: number) { return n.toLocaleString('es-MX') + ' pts' }

// ── Modal de formulario ────────────────────────────────────────

function SkuFormModal({ sku, onClose, onSaved }: {
  sku:     Sku | null
  onClose: () => void
  onSaved: (saved: Sku) => void
}) {
  const [form, setForm]         = useState<FormData>(sku ? {
    name:                 sku.name,
    description:          sku.description ?? '',
    image_url:            sku.image_url ?? '',
    points_cost:          String(sku.points_cost),
    stock:                String(sku.stock),
    stock_alert_threshold: String(sku.stock_alert_threshold),
    geo_type:             sku.geo_type as 'national' | 'local',
    geo_states:           sku.geo_states.join(', '),
    geo_cities:           sku.geo_cities.join(', '),
    is_digital:           sku.is_digital,
    category:             sku.category ?? '',
  } : EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')

    const payload = {
      name:                 form.name.trim(),
      description:          form.description.trim() || null,
      image_url:            form.image_url.trim() || null,
      points_cost:          parseInt(form.points_cost),
      stock:                parseInt(form.stock),
      stock_alert_threshold: parseInt(form.stock_alert_threshold) || 10,
      geo_type:             form.geo_type,
      geo_states:           form.geo_type === 'local'
                              ? form.geo_states.split(',').map(s => s.trim()).filter(Boolean)
                              : [],
      geo_cities:           form.geo_type === 'local'
                              ? form.geo_cities.split(',').map(s => s.trim()).filter(Boolean)
                              : [],
      is_digital:           form.is_digital,
      category:             form.category.trim() || null,
    }

    const url    = sku ? `/api/admin/catalog/${sku.id}` : '/api/admin/catalog'
    const method = sku ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()

    if (!res.ok) { setSaving(false); setError(json.error ?? 'Error al guardar'); return }

    // Upload image file if selected
    if (imageFile && json.sku?.id) {
      const fd = new FormData()
      fd.append('image', imageFile)
      const imgRes = await fetch(`/api/admin/catalog/${json.sku.id}/image`, { method: 'POST', body: fd })
      if (imgRes.ok) {
        const imgJson = await imgRes.json()
        json.sku.image_url = imgJson.image_url
      }
    }

    setSaving(false)
    onSaved(json.sku)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white rounded-t-2xl border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{sku ? 'Editar premio' : 'Nuevo premio'}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
            <input
              type="text" required value={form.name} onChange={e => set('name', e.target.value)}
              className="input-field mt-1 w-full" placeholder="Ej. Tarjeta regalo Amazon $500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea
              value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} className="input-field mt-1 w-full resize-none"
              placeholder="Descripción visible al miembro…"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Categoría</label>
            <input
              type="text" value={form.category} onChange={e => set('category', e.target.value)}
              className="input-field mt-1 w-full" placeholder="Ej. Electrónica, Gastronomía…"
            />
          </div>

          {/* Costo y stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Costo en puntos *</label>
              <input
                type="number" required min={1} value={form.points_cost}
                onChange={e => set('points_cost', e.target.value)}
                className="input-field mt-1 w-full" placeholder="500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Stock inicial *</label>
              <input
                type="number" required min={0} value={form.stock}
                onChange={e => set('stock', e.target.value)}
                className="input-field mt-1 w-full" placeholder="100"
              />
            </div>
          </div>

          {/* Alerta de stock */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Alerta de stock mínimo</label>
            <input
              type="number" min={0} value={form.stock_alert_threshold}
              onChange={e => set('stock_alert_threshold', e.target.value)}
              className="input-field mt-1 w-full" placeholder="10"
            />
          </div>

          {/* Tipo (físico / digital) */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="is_digital" checked={form.is_digital}
              onChange={e => set('is_digital', e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            <label htmlFor="is_digital" className="text-sm text-foreground">Premio digital (voucher/código)</label>
          </div>

          {/* Cobertura geográfica */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cobertura geográfica</label>
            <div className="flex gap-3 mt-1.5">
              {(['national', 'local'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="geo_type" value={opt} checked={form.geo_type === opt}
                    onChange={() => set('geo_type', opt)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{opt === 'national' ? 'Nacional' : 'Local (por estado/ciudad)'}</span>
                </label>
              ))}
            </div>
          </div>

          {form.geo_type === 'local' && (
            <div className="space-y-3 pl-3 border-l-2 border-primary/20">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Estados (separados por coma)
                </label>
                <input
                  type="text" value={form.geo_states}
                  onChange={e => set('geo_states', e.target.value)}
                  className="input-field mt-1 w-full text-sm"
                  placeholder="Jalisco, Nuevo León, Ciudad de México"
                  list="mx-states-list"
                />
                <datalist id="mx-states-list">
                  {MX_STATES.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Ciudades específicas (opcional, separadas por coma)
                </label>
                <input
                  type="text" value={form.geo_cities}
                  onChange={e => set('geo_cities', e.target.value)}
                  className="input-field mt-1 w-full text-sm"
                  placeholder="Guadalajara, Monterrey"
                />
              </div>
            </div>
          )}

          {/* Imagen */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Imagen</label>
            {form.image_url && !imageFile && (
              <img src={form.image_url} alt="" className="mt-2 h-24 w-24 object-cover rounded-xl border" />
            )}
            {imageFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <span className="text-lg">📎</span> {imageFile.name}
                <button type="button" onClick={() => setImageFile(null)} className="text-red-500 text-xs">✕</button>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                type="text" value={form.image_url} onChange={e => set('image_url', e.target.value)}
                className="input-field flex-1 text-sm" placeholder="https://… (URL de imagen)"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
              >
                Subir archivo
              </button>
            </div>
            <input
              ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setImageFile(f) }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pega una URL o sube un archivo JPG/PNG/WebP (máx 5MB). R2 debe estar configurado para subir archivos.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t px-6 py-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted/30 transition-colors">
            Cancelar
          </button>
          <button
            type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {sku ? 'Guardar cambios' : 'Crear premio'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Card de SKU ────────────────────────────────────────────────

function SkuCard({ sku, onEdit, onToggleStatus }: {
  sku:            Sku
  onEdit:         (sku: Sku) => void
  onToggleStatus: (sku: Sku, status: string) => void
}) {
  const st = STATUS_CFG[sku.status] ?? STATUS_CFG.active
  const stockLow = sku.stock <= sku.stock_alert_threshold && sku.stock > 0
  const stockOut = sku.stock === 0

  return (
    <div className={`bg-card rounded-xl border overflow-hidden flex flex-col ${sku.status === 'paused' ? 'opacity-60' : ''}`}>
      {/* Image */}
      <div className="aspect-video bg-muted/30 relative overflow-hidden">
        {sku.image_url
          ? <img src={sku.image_url} alt={sku.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30">🎁</div>
        }
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
          {st.label}
        </span>
        {sku.is_digital && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Digital
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-foreground text-sm leading-snug">{sku.name}</p>
          {sku.category && <p className="text-xs text-muted-foreground mt-0.5">{sku.category}</p>}
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-primary font-bold text-sm">{fmtPts(sku.points_cost)}</span>
          <span className={`text-xs font-medium ${stockOut ? 'text-red-600' : stockLow ? 'text-amber-600' : 'text-muted-foreground'}`}>
            Stock: {sku.stock.toLocaleString('es-MX')}
            {stockOut && ' — AGOTADO'}
            {stockLow && !stockOut && ' — BAJO'}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          {sku.geo_type === 'national' ? 'Cobertura nacional' : `Local: ${sku.geo_states.slice(0, 2).join(', ')}${sku.geo_states.length > 2 ? '…' : ''}`}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t px-4 py-3 flex gap-2">
        <button
          onClick={() => onEdit(sku)}
          className="flex-1 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted/30 transition-colors"
        >
          Editar
        </button>
        {sku.status === 'active' ? (
          <button
            onClick={() => onToggleStatus(sku, 'paused')}
            className="flex-1 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors"
          >
            Pausar
          </button>
        ) : sku.status === 'paused' ? (
          <button
            onClick={() => onToggleStatus(sku, 'active')}
            className="flex-1 py-1.5 rounded-lg border border-green-200 text-green-700 text-xs font-medium hover:bg-green-50 transition-colors"
          >
            Reactivar
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────

export default function AdminCatalogPage() {
  const [skus, setSkus]           = useState<Sku[]>([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatus] = useState('all')
  const [q, setQ]                 = useState('')
  const [editingSku, setEditing]  = useState<Sku | 'new' | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ status: statusFilter })
    if (q) params.set('q', q)
    const res = await fetch(`/api/admin/catalog?${params}`)
    if (res.ok) { const { skus: data } = await res.json(); setSkus(data) }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter, q])

  async function toggleStatus(sku: Sku, newStatus: string) {
    const res = await fetch(`/api/admin/catalog/${sku.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) load()
  }

  function handleSaved(saved: Sku) {
    setEditing(null)
    load()
  }

  const tabs = [
    { value: 'all',    label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'paused', label: 'Pausados' },
  ]

  return (
    <div className="space-y-6">
      {editingSku !== null && (
        <SkuFormModal
          sku={editingSku === 'new' ? null : editingSku}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de premios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crea y administra los premios disponibles para los miembros.
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          + Nuevo premio
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 border-b flex-1">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                statusFilter === t.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text" placeholder="Buscar por nombre…"
          value={q} onChange={e => setQ(e.target.value)}
          className="input-field text-sm py-2 w-full sm:w-64"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : skus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-4">🎁</p>
          <p className="text-muted-foreground">
            {q ? 'No se encontraron premios con ese nombre.' : 'No hay premios en este estatus.'}
          </p>
          {!q && (
            <button
              onClick={() => setEditing('new')}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Crear el primer premio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skus.map(sku => (
            <SkuCard
              key={sku.id}
              sku={sku}
              onEdit={s => setEditing(s)}
              onToggleStatus={toggleStatus}
            />
          ))}
        </div>
      )}

      {/* Stats bar */}
      {!loading && skus.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {skus.length} premio{skus.length !== 1 ? 's' : ''} mostrado{skus.length !== 1 ? 's' : ''}
          {' · '}
          {skus.filter(s => s.stock === 0).length} agotado{skus.filter(s => s.stock === 0).length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
