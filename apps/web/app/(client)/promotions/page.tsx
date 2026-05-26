'use client'

import { useEffect, useState } from 'react'

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
  featured:        boolean
  partners:        Partner | null
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modal de detalle ──────────────────────────────────────────

function PromotionDetail({ promo, onClose }: { promo: Promotion; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const partner = promo.partners

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen */}
        {promo.image_url ? (
          <img src={promo.image_url} alt={promo.title} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-6xl">🎁</span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">{promo.title}</h2>
              {partner && (
                <div className="flex items-center gap-1.5 mt-1">
                  {partner.logo_url
                    ? <img src={partner.logo_url} alt={partner.name} className="w-4 h-4 rounded object-contain" />
                    : <span className="text-xs">🏪</span>
                  }
                  <span className="text-xs text-muted-foreground">{partner.name}</span>
                  {partner.is_verified && <span className="text-xs text-blue-500">✓</span>}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Descripción */}
          {promo.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{promo.description}</p>
          )}

          {/* Meta */}
          <div className="divide-y divide-border rounded-xl border overflow-hidden text-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
              <span className="text-muted-foreground">Válida hasta</span>
              <span className="font-medium text-foreground">{fmtDate(promo.valid_until)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
              <span className="text-muted-foreground">Zona</span>
              <span className="font-medium text-foreground">
                {promo.geo_type === 'national'
                  ? 'Todo México'
                  : [
                      ...(promo.geo_cities ?? []),
                      ...(promo.geo_states ?? []),
                    ].join(', ') || 'Local'
                }
              </span>
            </div>
          </div>

          {/* CTA */}
          {promo.destination_url && (
            <a
              href={promo.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Ver más
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {!promo.destination_url && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de promoción ───────────────────────────────────────

function PromotionCard({ promo, onClick }: { promo: Promotion; onClick: () => void }) {
  const partner = promo.partners
  const daysLeft = Math.ceil((new Date(promo.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <button
      onClick={onClick}
      className="group w-full bg-card rounded-xl border overflow-hidden hover:shadow-md transition-all duration-200 text-left"
    >
      {/* Imagen */}
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {promo.image_url ? (
          <img
            src={promo.image_url}
            alt={promo.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl">🎁</span>
          </div>
        )}
        {/* Zone badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            promo.geo_type === 'national'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {promo.geo_type === 'national' ? '🌎 Nacional' : '📍 Local'}
          </span>
        </div>
        {/* Expiry warning */}
        {daysLeft <= 7 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              {daysLeft <= 1 ? 'Último día' : `${daysLeft}d`}
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-2">
        {partner && (
          <div className="flex items-center gap-1.5">
            {partner.logo_url
              ? <img src={partner.logo_url} alt={partner.name} className="w-4 h-4 rounded object-contain" />
              : <span className="text-xs">🏪</span>
            }
            <span className="text-xs text-muted-foreground">{partner.name}</span>
            {partner.is_verified && <span className="text-xs text-blue-500">✓</span>}
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {promo.title}
        </h3>
        {promo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{promo.description}</p>
        )}
        <p className="text-xs text-muted-foreground pt-1">
          Hasta el {fmtDate(promo.valid_until)}
        </p>
      </div>
    </button>
  )
}

// ── Página principal ───────────────────────────────────────────

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Promotion | null>(null)

  useEffect(() => {
    fetch('/api/client/promotions')
      .then(r => r.ok ? r.json() : { promotions: [] })
      .then(({ promotions: data }) => { setPromotions(data); setLoading(false) })
  }, [])

  const featured = promotions.find(p => p.featured)
  const rest     = promotions.filter(p => !p.featured || p.id !== featured?.id)

  return (
    <div className="space-y-8">
      {selected && <PromotionDetail promo={selected} onClose={() => setSelected(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Promociones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ofertas exclusivas de nuestros aliados disponibles en tu zona.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border overflow-hidden animate-pulse">
              <div className="aspect-[16/9] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="bg-card rounded-xl border p-16 text-center">
          <div className="text-5xl mb-4">📢</div>
          <p className="text-base font-semibold text-foreground mb-1">Sin promociones activas en tu zona</p>
          <p className="text-sm text-muted-foreground">
            Por ahora no hay promociones disponibles para tu ubicación. Vuelve pronto.
          </p>
        </div>
      ) : (
        <>
          {/* Destacada */}
          {featured && (
            <button
              onClick={() => setSelected(featured)}
              className="group w-full bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative sm:w-2/5 aspect-[16/9] sm:aspect-auto bg-muted overflow-hidden">
                  {featured.image_url ? (
                    <img
                      src={featured.image_url}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-6xl">🎁</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">
                      ⭐ Destacada
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-6 flex flex-col justify-center space-y-3">
                  {featured.partners && (
                    <div className="flex items-center gap-2">
                      {featured.partners.logo_url
                        ? <img src={featured.partners.logo_url} alt={featured.partners.name} className="w-5 h-5 rounded object-contain" />
                        : <span>🏪</span>
                      }
                      <span className="text-sm text-muted-foreground">{featured.partners.name}</span>
                      {featured.partners.is_verified && <span className="text-sm text-blue-500">✓ Verificado</span>}
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-foreground leading-tight">{featured.title}</h2>
                  {featured.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{featured.description}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      featured.geo_type === 'national' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {featured.geo_type === 'national' ? '🌎 Nacional' : '📍 Local'}
                    </span>
                    <span className="text-xs text-muted-foreground">Hasta el {fmtDate(featured.valid_until)}</span>
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map(p => (
                <PromotionCard key={p.id} promo={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
