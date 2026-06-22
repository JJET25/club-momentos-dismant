'use client'

import { useEffect, useState } from 'react'
import {
  Globe, MapPin, BadgeCheck, Building2, Tag, Star, Megaphone, X, ChevronRight, ExternalLink,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface Partner { id: string; name: string; logo_url: string | null; is_verified: boolean }

interface Promotion {
  id: string; title: string; description: string | null; image_url: string | null
  destination_url: string | null; geo_type: 'national' | 'local'
  geo_states: string[] | null; geo_cities: string[] | null
  valid_from: string; valid_until: string; featured: boolean; partners: Partner | null
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Badge de zona ─────────────────────────────────────────────

function GeoBadge({ type, size = 'sm' }: { type: 'national' | 'local'; size?: 'sm' | 'md' }) {
  const iconCls = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'
  const textCls = size === 'md' ? 'text-xs' : 'text-[10px]'
  if (type === 'national') return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 ${textCls}`}>
      <Globe className={iconCls} /> Nacional
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 ${textCls}`}>
      <MapPin className={iconCls} /> Local
    </span>
  )
}

// ── Partner label ─────────────────────────────────────────────

function PartnerLabel({ partner, size = 'sm' }: { partner: Partner; size?: 'sm' | 'md' }) {
  const iconCls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-1.5">
      {partner.logo_url
        ? <img src={partner.logo_url} alt={partner.name} className={`${iconCls} rounded object-contain`} />
        : <div className={`${iconCls} rounded bg-muted flex items-center justify-center shrink-0`}>
            <Building2 className="w-2.5 h-2.5 text-muted-foreground" />
          </div>
      }
      <span className={`${size === 'md' ? 'text-sm' : 'text-xs'} text-muted-foreground`}>{partner.name}</span>
      {partner.is_verified && <BadgeCheck className={`${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} text-blue-500 shrink-0`} />}
    </div>
  )
}

// ── Placeholder de imagen ─────────────────────────────────────

function ImagePlaceholder({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br from-primary/10 to-muted flex items-center justify-center`}>
      <div className={`${size === 'large' ? 'w-20 h-20' : 'w-14 h-14'} rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center`}>
        <Tag className={`${size === 'large' ? 'w-10 h-10' : 'w-7 h-7'} text-muted-foreground/30`} />
      </div>
    </div>
  )
}

// ── Modal de detalle ──────────────────────────────────────────

function PromotionDetail({ promo, onClose }: { promo: Promotion; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Imagen */}
        <div className="relative w-full h-52">
          {promo.image_url
            ? <img src={promo.image_url} alt={promo.title} className="w-full h-52 object-cover" />
            : <ImagePlaceholder size="large" />
          }
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute top-3 left-3">
            <GeoBadge type={promo.geo_type} />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">{promo.title}</h2>
              {promo.partners && (
                <div className="mt-1.5">
                  <PartnerLabel partner={promo.partners} />
                </div>
              )}
            </div>
          </div>

          {promo.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{promo.description}</p>
          )}

          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
              <span className="text-xs text-muted-foreground">Válida hasta</span>
              <span className="text-xs font-semibold text-foreground">{fmtDate(promo.valid_until)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
              <span className="text-xs text-muted-foreground">Cobertura</span>
              <GeoBadge type={promo.geo_type} />
            </div>
            {promo.geo_type === 'local' && (promo.geo_cities?.length || promo.geo_states?.length) && (
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">Zonas</span>
                <span className="text-xs font-medium text-foreground text-right max-w-[60%]">
                  {[...(promo.geo_cities ?? []), ...(promo.geo_states ?? [])].join(', ')}
                </span>
              </div>
            )}
          </div>

          {promo.destination_url ? (
            <a href={promo.destination_url} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Ver oferta <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de promoción ──────────────────────────────────────

function PromotionCard({ promo, onClick }: { promo: Promotion; onClick: () => void }) {
  const daysLeft = Math.ceil((new Date(promo.valid_until).getTime() - Date.now()) / 86400000)

  return (
    <button onClick={onClick}
      className="group w-full bg-card rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left">
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {promo.image_url
          ? <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <ImagePlaceholder />
        }
        <div className="absolute top-2 left-2">
          <GeoBadge type={promo.geo_type} />
        </div>
        {daysLeft <= 7 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/90 text-white">
              {daysLeft <= 1 ? 'Último día' : `${daysLeft}d`}
            </span>
          </div>
        )}
        {promo.featured && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-white shadow">
              <Star className="w-2.5 h-2.5 fill-white" /> Destacada
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        {promo.partners && <PartnerLabel partner={promo.partners} />}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {promo.title}
        </h3>
        {promo.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{promo.description}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Hasta {fmtDate(promo.valid_until)}</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}

// ── Página principal ──────────────────────────────────────────

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
        <p className="text-sm text-muted-foreground mt-1">Ofertas exclusivas de nuestros aliados disponibles en tu zona.</p>
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
        <div className="bg-card rounded-2xl border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Sin promociones activas en tu zona</p>
          <p className="text-sm text-muted-foreground">Por ahora no hay promociones disponibles. Vuelve pronto.</p>
        </div>
      ) : (
        <>
          {/* Promoción destacada */}
          {featured && (
            <button onClick={() => setSelected(featured)}
              className="group w-full bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left">
              <div className="flex flex-col sm:flex-row">
                <div className="relative sm:w-2/5 aspect-[16/9] sm:aspect-auto bg-muted overflow-hidden min-h-[180px]">
                  {featured.image_url
                    ? <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <ImagePlaceholder size="large" />
                  }
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-white shadow">
                      <Star className="w-3 h-3 fill-white" /> Destacada
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-6 flex flex-col justify-center space-y-3">
                  {featured.partners && <PartnerLabel partner={featured.partners} size="md" />}
                  <h2 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                    {featured.title}
                  </h2>
                  {featured.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{featured.description}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <GeoBadge type={featured.geo_type} size="md" />
                    <span className="text-xs text-muted-foreground">Hasta {fmtDate(featured.valid_until)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                    Ver promoción <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map(p => <PromotionCard key={p.id} promo={p} onClick={() => setSelected(p)} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
