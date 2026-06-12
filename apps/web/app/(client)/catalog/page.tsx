'use client'

import { useEffect, useState } from 'react'
import {
  X, ArrowUpDown, ChevronDown, ChevronUp, AlertTriangle, Check, Copy,
  Fuel, UtensilsCrossed, Tag, ShoppingBag, Plane, Monitor, Gift, Zap,
  type LucideIcon,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────

interface Sku {
  id: string; name: string; description: string | null; image_url: string | null
  points_cost: number; stock: number; geo_type: string; is_digital: boolean; category: string | null
}
interface Review {
  id: string; rating: number; comment: string | null; city: string | null; date: string
}
interface ReviewsMeta { reviews: Review[]; totalCount: number; avgRating: number | null }

const SORT_OPTIONS = [
  { value: 'cost_asc',  label: 'Menor costo' },
  { value: 'cost_desc', label: 'Mayor costo' },
]

// ── Íconos por categoría ──────────────────────────────────────

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Combustible:  Fuel,
  Experiencias: UtensilsCrossed,
  Descuentos:   Tag,
  Merchandise:  ShoppingBag,
  Viajes:       Plane,
  Tecnología:   Monitor,
}

function CategoryIcon({ category, className }: { category: string | null; className?: string }) {
  const Icon = (category && CATEGORY_ICONS[category]) ? CATEGORY_ICONS[category] : Gift
  return <Icon className={className ?? 'w-10 h-10 text-muted-foreground/30'} />
}

// ── Estrella SVG ──────────────────────────────────────────────

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  const path = 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z'
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} viewBox="0 0 24 24" className={`${cls} ${rating >= s ? 'text-amber-400' : 'text-muted-foreground/20'}`}
          fill={rating >= s ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
      ))}
    </span>
  )
}

// ── Modal de detalle ──────────────────────────────────────────

function RewardDetailModal({
  sku, balance, onClose, onRedeem,
}: { sku: Sku; balance: number; onClose: () => void; onRedeem: (sku: Sku) => void }) {
  const canAfford = balance >= sku.points_cost
  const hasStock  = sku.stock > 0
  const [reviewsMeta, setReviewsMeta] = useState<ReviewsMeta | null>(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    fetch(`/api/client/catalog/${sku.id}/reviews`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setReviewsMeta(d) })
  }, [sku.id])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Imagen */}
        <div className="w-full h-48 bg-muted/40 flex items-center justify-center overflow-hidden relative rounded-t-2xl">
          {sku.image_url
            ? <img src={sku.image_url} alt={sku.name} className="w-full h-48 object-cover" />
            : <CategoryIcon category={sku.category} className="w-16 h-16 text-muted-foreground/25" />
          }
          <div className="absolute top-3 left-3 flex gap-1.5">
            {sku.is_digital && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/90 text-white">Digital</span>}
            {!hasStock && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white">Sin stock</span>}
          </div>
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground leading-tight">{sku.name}</h3>
            {sku.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{sku.description}</p>}
          </div>

          {/* Datos */}
          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {[
              { label: 'Costo',           value: `${sku.points_cost.toLocaleString('es-MX')} pts`, highlight: true },
              { label: 'Tu saldo',        value: `${balance.toLocaleString('es-MX')} pts`,          highlight: false },
              { label: 'Stock',           value: sku.stock > 0 ? `${sku.stock} unidades` : 'Sin stock', highlight: false },
              { label: 'Tipo',            value: sku.is_digital ? 'Digital (código)' : 'Físico',   highlight: false },
              { label: 'Cobertura',       value: sku.geo_type === 'national' ? 'Nacional' : 'Local',highlight: false },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className={`text-xs font-semibold ${row.highlight ? 'text-primary' : 'text-foreground'}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Puntos insuficientes */}
          {!canAfford && (
            <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Te faltan <strong>{(sku.points_cost - balance).toLocaleString('es-MX')} puntos</strong> para canjear.
              </p>
            </div>
          )}

          {/* Reseñas */}
          {reviewsMeta && reviewsMeta.totalCount > 0 && (
            <div>
              <button onClick={() => setReviewsOpen(o => !o)}
                className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                <div className="flex items-center gap-2">
                  <StarRow rating={Math.round(reviewsMeta.avgRating ?? 0)} size="md" />
                  <span className="font-bold">{reviewsMeta.avgRating?.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviewsMeta.totalCount} reseñas)</span>
                </div>
                {reviewsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {reviewsOpen && (
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {reviewsMeta.reviews.map(r => (
                    <div key={r.id} className="bg-muted/30 rounded-xl px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <StarRow rating={r.rating} />
                        {r.city && <span className="text-xs text-muted-foreground">{r.city}</span>}
                      </div>
                      {r.comment && <p className="text-xs text-foreground leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => canAfford && hasStock && onRedeem(sku)} disabled={!canAfford || !hasStock}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors
              ${canAfford && hasStock ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
            {!hasStock ? 'Sin stock disponible'
              : !canAfford ? `Necesitas ${(sku.points_cost - balance).toLocaleString('es-MX')} puntos más`
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
  const pct = Math.min(100, Math.round((balance / sku.points_cost) * 100))

  return (
    <button onClick={onClick}
      className="bg-card rounded-2xl border border-border text-left hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden">
      <div className="w-full h-40 bg-muted/30 flex items-center justify-center relative overflow-hidden">
        {sku.image_url
          ? <img src={sku.image_url} alt={sku.name} className="w-full h-40 object-cover group-hover:scale-[1.04] transition-transform duration-300" loading="lazy" />
          : <CategoryIcon category={sku.category} className="w-12 h-12 text-muted-foreground/25" />
        }
        <div className="absolute top-2 left-2 flex gap-1">
          {sku.is_digital
            ? hasStock && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/90 text-white">Digital</span>
            : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/90 text-white">Físico</span>
          }
        </div>
        {canAfford && hasStock && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">Disponible</span>
          </div>
        )}
        {!hasStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-card/90 text-xs font-semibold text-foreground px-3 py-1 rounded-full">Sin stock</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">{sku.name}</p>
        <div className="flex items-center justify-between">
          <span className={`text-base font-bold ${canAfford ? 'text-primary' : 'text-muted-foreground'}`}>
            {sku.points_cost.toLocaleString('es-MX')} <span className="text-xs font-normal text-muted-foreground">pts</span>
          </span>
          {hasStock && sku.stock <= 10 && (
            <span className="text-[10px] text-amber-600 font-semibold">Últimos {sku.stock}</span>
          )}
        </div>
        {canAfford && hasStock ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-600">Puedes canjear</span>
          </div>
        ) : hasStock ? (
          <div>
            <div className="h-1 rounded-full bg-muted overflow-hidden mb-1">
              <div className="h-full rounded-full bg-primary/50" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Faltan <strong className="text-foreground">{(sku.points_cost - balance).toLocaleString('es-MX')}</strong> pts
            </p>
          </div>
        ) : null}
      </div>
    </button>
  )
}

// ── Dirección ─────────────────────────────────────────────────

interface DeliveryAddress {
  full_name: string; phone: string; street: string
  colony: string; city: string; state: string; zip: string; notes: string
}
const EMPTY_ADDR: DeliveryAddress = { full_name: '', phone: '', street: '', colony: '', city: '', state: '', zip: '', notes: '' }

// ── Modal de confirmación ─────────────────────────────────────

function ConfirmModal({
  sku, balance, processing, error, onConfirm, onClose,
}: { sku: Sku; balance: number; processing: boolean; error: string | null; onConfirm: (addr: DeliveryAddress | null) => void; onClose: () => void }) {
  const remaining  = balance - sku.points_cost
  const isPhysical = !sku.is_digital
  const [step, setStep] = useState<'summary' | 'address'>('summary')
  const [addr, setAddr] = useState<DeliveryAddress>(EMPTY_ADDR)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !processing) onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose, processing])

  useEffect(() => {
    if (!isPhysical) return
    fetch('/api/client/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.profile) return
        setAddr(p => ({
          ...p,
          full_name: d.profile.full_name ?? '',
          phone:     d.profile.phone ?? '',
          city:      d.profile.location_city ?? '',
          state:     d.profile.location_state ?? '',
        }))
      })
  }, [isPhysical])

  const setA = (k: keyof DeliveryAddress, v: string) => setAddr(p => ({ ...p, [k]: v }))
  const addrValid = step === 'summary' || !isPhysical || (addr.full_name.trim() && addr.phone.trim() && addr.street.trim() &&
    addr.colony.trim() && addr.city.trim() && addr.state.trim() && addr.zip.trim())

  function handlePrimary() {
    if (isPhysical && step === 'summary') { setStep('address'); return }
    onConfirm(isPhysical ? addr : null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={() => !processing && onClose()}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center gap-3 rounded-t-2xl">
          {isPhysical && step === 'address' && (
            <button onClick={() => setStep('summary')} disabled={processing} className="text-muted-foreground hover:text-foreground shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">{step === 'address' ? 'Dirección de entrega' : 'Confirmar canje'}</h3>
            <p className="text-xs text-muted-foreground truncate">{sku.name}</p>
          </div>
          {isPhysical && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-2 h-2 rounded-full ${step === 'summary' ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-2 h-2 rounded-full ${step === 'address' ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {step === 'summary' && (
            <>
              <div className="divide-y divide-border rounded-xl border overflow-hidden">
                {[
                  { label: 'Costo del canje', value: `-${sku.points_cost.toLocaleString('es-MX')} pts`, red: true },
                  { label: 'Tu saldo actual',  value: `${balance.toLocaleString('es-MX')} pts`, red: false },
                  { label: 'Saldo restante',   value: `${remaining.toLocaleString('es-MX')} pts`, red: false },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.red ? 'text-red-500' : 'text-foreground'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              {isPhysical && (
                <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <p>Premio físico. En el siguiente paso ingresa tu dirección de envío.</p>
                </div>
              )}
            </>
          )}

          {step === 'address' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'full_name', label: 'Nombre completo *', span: 2, placeholder: 'Nombre de quien recibe', type: 'text' },
                  { key: 'phone',     label: 'Teléfono *',         span: 2, placeholder: '10 dígitos',            type: 'tel'  },
                  { key: 'street',    label: 'Calle y número *',   span: 2, placeholder: 'Av. Insurgentes Sur 1234', type: 'text' },
                  { key: 'colony',    label: 'Colonia *',          span: 2, placeholder: 'Del Valle',             type: 'text' },
                  { key: 'city',      label: 'Ciudad *',           span: 1, placeholder: 'Monterrey',             type: 'text' },
                  { key: 'state',     label: 'Estado *',           span: 1, placeholder: 'Nuevo León',            type: 'text' },
                  { key: 'zip',       label: 'C.P. *',             span: 1, placeholder: '64000',                 type: 'text' },
                  { key: 'notes',     label: 'Referencias',        span: 1, placeholder: 'Entre calles…',         type: 'text' },
                ] as { key: keyof DeliveryAddress; label: string; span: number; placeholder: string; type: string }[]).map(f => (
                  <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                    <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                    <input value={addr[f.key]} onChange={e => setA(f.key, e.target.value)}
                      className="input-field mt-1 w-full text-sm" placeholder={f.placeholder} type={f.type}
                      required={f.label.endsWith('*')} maxLength={f.key === 'zip' ? 5 : undefined} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
          <button onClick={onClose} disabled={processing}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handlePrimary} disabled={processing || !addrValid}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {processing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {processing ? 'Procesando…' : step === 'address' ? 'Confirmar canje' : isPhysical ? 'Siguiente' : 'Confirmar canje'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Voucher ───────────────────────────────────────────────────

interface VoucherData {
  id: string; voucher_code: string; points_spent: number; balance_after: number
  sku_name: string; created_at: string; is_digital: boolean
  digital_code: string | null; delivery_address: DeliveryAddress | null
}

function VoucherScreen({ voucher, onClose }: { voucher: VoucherData; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copyCode(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header éxito */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-6 py-8 text-center text-white">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold">Canje exitoso</h3>
          <p className="text-emerald-100 text-sm mt-0.5 line-clamp-1">{voucher.sku_name}</p>
        </div>

        <div className="p-6 space-y-4">
          {voucher.is_digital && voucher.digital_code && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 text-center space-y-2">
              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">Tu código digital</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-foreground">{voucher.digital_code}</p>
              <button onClick={() => copyCode(voucher.digital_code!)}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium mx-auto">
                {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar código</>}
              </button>
            </div>
          )}

          <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {voucher.is_digital ? 'Referencia del canje' : 'Código de voucher'}
            </p>
            <p className="text-2xl font-mono font-bold tracking-widest text-foreground">{voucher.voucher_code}</p>
            {!voucher.is_digital && (
              <button onClick={() => copyCode(voucher.voucher_code)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium mx-auto">
                {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
              </button>
            )}
          </div>

          {voucher.is_digital ? (
            <div className="bg-muted/20 rounded-xl px-4 py-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Siguientes pasos</p>
              <p>Tu código fue enviado a tu correo. También puedes verlo en <strong>Mis Canjes</strong>.</p>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs space-y-2">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Pedido registrado</p>
              {voucher.delivery_address && (
                <div className="text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">{voucher.delivery_address.full_name}</p>
                  <p>{voucher.delivery_address.street}, {voucher.delivery_address.colony}</p>
                  <p>{voucher.delivery_address.city}, {voucher.delivery_address.state} {voucher.delivery_address.zip}</p>
                </div>
              )}
              <p className="text-muted-foreground">Tu ejecutivo de Dismant coordinará el envío.</p>
            </div>
          )}

          <div className="divide-y divide-border rounded-xl border overflow-hidden">
            {[
              { label: 'Puntos canjeados', value: `-${voucher.points_spent.toLocaleString('es-MX')} pts`, red: true },
              { label: 'Saldo restante',   value: `${voucher.balance_after.toLocaleString('es-MX')} pts`, red: false },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className={`text-xs font-semibold ${row.red ? 'text-red-500' : 'text-foreground'}`}>{row.value}</span>
              </div>
            ))}
          </div>

          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function CatalogPage() {
  const [skus, setSkus]             = useState<Sku[]>([])
  const [balance, setBalance]       = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Sku | null>(null)
  const [confirming, setConfirming] = useState<Sku | null>(null)
  const [processing, setProcessing] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [voucher, setVoucher]       = useState<VoucherData | null>(null)
  const [filterCat, setFilterCat]   = useState('')
  const [sort, setSort]             = useState('cost_asc')

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ sort })
    if (filterCat) params.set('category', filterCat)
    const res = await fetch(`/api/client/catalog?${params}`)
    if (res.ok) {
      const data = await res.json()
      setSkus(data.skus); setBalance(data.balance); setCategories(data.categories)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filterCat, sort])

  function handleRedeem(sku: Sku) { setSelected(null); setRedeemError(null); setConfirming(sku) }

  async function confirmRedeem(addr: DeliveryAddress | null) {
    if (!confirming) return
    setProcessing(true); setRedeemError(null)
    const res = await fetch('/api/client/redemptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku_id: confirming.id, delivery_address: addr ?? undefined }),
    })
    const data = await res.json()
    setProcessing(false)
    if (!res.ok) { setRedeemError(data.error ?? 'Error al procesar el canje.'); return }
    setConfirming(null); setVoucher({ ...data.redemption, delivery_address: addr }); load()
  }

  const CatIcon = (cat: string) => {
    const Icon = CATEGORY_ICONS[cat] ?? Gift
    return <Icon className="w-3.5 h-3.5 shrink-0" />
  }

  return (
    <div className="space-y-6">
      {selected && <RewardDetailModal sku={selected} balance={balance} onClose={() => setSelected(null)} onRedeem={handleRedeem} />}
      {confirming && <ConfirmModal sku={confirming} balance={balance} processing={processing} error={redeemError} onConfirm={confirmRedeem} onClose={() => { setConfirming(null); setRedeemError(null) }} />}
      {voucher && <VoucherScreen voucher={voucher} onClose={() => setVoucher(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Premios</h1>
          <p className="text-sm text-muted-foreground mt-1">Canjea tus puntos por premios exclusivos.</p>
        </div>
        <div className="shrink-0 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className="text-lg font-bold text-primary leading-tight">
            {balance.toLocaleString('es-MX')} <span className="text-xs font-normal">pts</span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterCat('')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filterCat === '' ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground'
            }`}>
            <Gift className="w-3 h-3" /> Todas
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filterCat === cat ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground'
              }`}>
              {CatIcon(cat)} {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Ordenar:</span>
          </div>
          <div className="flex gap-1">
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  sort === o.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
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
        <div className="bg-card rounded-2xl border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">
            {filterCat ? `Sin premios en "${filterCat}"` : 'El catálogo estará disponible pronto.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {filterCat ? 'Prueba con otra categoría.' : 'Vuelve a consultar en los próximos días.'}
          </p>
          {filterCat && (
            <button onClick={() => setFilterCat('')} className="mt-4 text-xs font-medium text-primary hover:underline">
              Ver todas las categorías
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {skus.map(sku => <RewardCard key={sku.id} sku={sku} balance={balance} onClick={() => setSelected(sku)} />)}
        </div>
      )}

      {!loading && skus.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          {skus.length} premio{skus.length !== 1 ? 's' : ''} disponible{skus.length !== 1 ? 's' : ''} para tu zona
        </p>
      )}
    </div>
  )
}
