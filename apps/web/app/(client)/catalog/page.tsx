'use client'

import { useEffect, useState } from 'react'

// ── Tipos ────────────────────────────────────────────────────

interface Sku {
  id:          string
  name:        string
  description: string | null
  image_url:   string | null
  points_cost: number
  stock:       number
  geo_type:    string
  is_digital:  boolean
  category:    string | null
}

const SORT_OPTIONS = [
  { value: 'cost_asc',  label: 'Menor costo' },
  { value: 'cost_desc', label: 'Mayor costo' },
]

// ── Modal de detalle (US-016) ─────────────────────────────────

function RewardDetailModal({
  sku, balance, onClose, onRedeem,
}: {
  sku: Sku
  balance: number
  onClose: () => void
  onRedeem: (sku: Sku) => void
}) {
  const canAfford = balance >= sku.points_cost
  const hasStock  = sku.stock > 0

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen */}
        <div className="w-full h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center rounded-t-2xl">
          {sku.image_url
            ? <img src={sku.image_url} alt={sku.name} className="w-full h-48 object-cover rounded-t-2xl" />
            : <span className="text-6xl">{categoryIcon(sku.category)}</span>
          }
        </div>

        {/* Contenido */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-foreground leading-tight">{sku.name}</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {sku.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{sku.description}</p>
          )}

          {/* Detalles */}
          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {[
              { label: 'Costo', value: `${sku.points_cost.toLocaleString('es-MX')} pts` },
              { label: 'Stock disponible', value: sku.stock > 0 ? `${sku.stock} unidades` : 'Sin stock' },
              { label: 'Tu saldo', value: `${balance.toLocaleString('es-MX')} pts` },
              { label: 'Tipo', value: sku.is_digital ? 'Digital (código)' : 'Físico' },
              { label: 'Cobertura', value: sku.geo_type === 'national' ? 'Nacional' : 'Local' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-xs font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Aviso de puntos insuficientes */}
          {!canAfford && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-700">
              Te faltan{' '}
              <strong>{(sku.points_cost - balance).toLocaleString('es-MX')} puntos</strong>{' '}
              para canjear este premio.
            </div>
          )}

          {/* Botón de canje */}
          <button
            onClick={() => canAfford && hasStock && onRedeem(sku)}
            disabled={!canAfford || !hasStock}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors
              ${canAfford && hasStock
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
          >
            {!hasStock
              ? 'Sin stock disponible'
              : !canAfford
              ? `Necesitas ${(sku.points_cost - balance).toLocaleString('es-MX')} puntos más`
              : 'Canjear premio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de premio ─────────────────────────────────────────

function RewardCard({ sku, balance, onClick }: { sku: Sku; balance: number; onClick: () => void }) {
  const canAfford = balance >= sku.points_cost
  const hasStock  = sku.stock > 0

  return (
    <button
      onClick={onClick}
      className="bg-card rounded-2xl border text-left hover:shadow-md hover:border-primary/30 transition-all group overflow-hidden"
    >
      {/* Imagen / placeholder */}
      <div className="w-full h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
        {sku.image_url
          ? <img src={sku.image_url} alt={sku.name} className="w-full h-40 object-cover" loading="lazy" />
          : <span className="text-5xl">{categoryIcon(sku.category)}</span>
        }
        {!hasStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-xs font-semibold text-foreground px-3 py-1 rounded-full">
              Sin stock
            </span>
          </div>
        )}
        {sku.is_digital && hasStock && (
          <span className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            Digital
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {sku.name}
        </p>

        <div className="flex items-center justify-between">
          <span className={`text-base font-bold ${canAfford ? 'text-primary' : 'text-muted-foreground'}`}>
            {sku.points_cost.toLocaleString('es-MX')} pts
          </span>
          {hasStock && sku.stock <= 10 && (
            <span className="text-xs text-amber-600 font-medium">
              ¡Últimos {sku.stock}!
            </span>
          )}
        </div>

        {!canAfford && hasStock && (
          <p className="text-xs text-muted-foreground">
            Te faltan {(sku.points_cost - balance).toLocaleString('es-MX')} pts
          </p>
        )}
      </div>
    </button>
  )
}

// ── Helper ────────────────────────────────────────────────────

function categoryIcon(category: string | null): string {
  const map: Record<string, string> = {
    Combustible:  '⛽',
    Experiencias: '🍽️',
    Descuentos:   '🏷️',
    Merchandise:  '👕',
    Viajes:       '✈️',
    Tecnología:   '💻',
  }
  return category ? (map[category] ?? '🎁') : '🎁'
}

// ── Página principal ──────────────────────────────────────────

export default function CatalogPage() {
  const [skus, setSkus]         = useState<Sku[]>([])
  const [balance, setBalance]   = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Sku | null>(null)

  const [filterCat, setFilterCat] = useState('')
  const [sort, setSort]           = useState('cost_asc')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ sort })
    if (filterCat) params.set('category', filterCat)
    const res = await fetch(`/api/client/catalog?${params}`)
    if (res.ok) {
      const data = await res.json()
      setSkus(data.skus)
      setBalance(data.balance)
      setCategories(data.categories)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filterCat, sort])

  function handleRedeem(sku: Sku) {
    // US-017 — flujo de canje (próxima historia)
    alert(`Próximamente: flujo de canje para "${sku.name}"`)
  }

  return (
    <div className="space-y-8">

      {selected && (
        <RewardDetailModal
          sku={selected}
          balance={balance}
          onClose={() => setSelected(null)}
          onRedeem={(sku) => { setSelected(null); handleRedeem(sku) }}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Premios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Canjea tus puntos por premios. Tienes{' '}
            <span className="font-semibold text-primary">{balance.toLocaleString('es-MX')} pts</span>{' '}
            disponibles.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Categoría</label>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="input-field text-sm py-2"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Ordenar por</label>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input-field text-sm py-2"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {filterCat && (
          <button onClick={() => setFilterCat('')} className="text-sm text-muted-foreground hover:text-foreground pb-0.5">
            Limpiar filtro
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border overflow-hidden animate-pulse">
              <div className="h-40 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-5 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : skus.length === 0 ? (
        <div className="bg-card rounded-xl border p-16 text-center">
          <div className="text-5xl mb-4">🎁</div>
          <p className="text-base font-semibold text-foreground mb-1">
            {filterCat ? 'Sin premios en esta categoría.' : 'El catálogo estará disponible pronto.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {filterCat ? 'Prueba con otra categoría.' : 'Vuelve a consultar en los próximos días.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {skus.map(sku => (
            <RewardCard
              key={sku.id}
              sku={sku}
              balance={balance}
              onClick={() => setSelected(sku)}
            />
          ))}
        </div>
      )}

      {!loading && skus.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {skus.length} premio{skus.length !== 1 ? 's' : ''} disponible{skus.length !== 1 ? 's' : ''} para tu zona
        </p>
      )}
    </div>
  )
}
