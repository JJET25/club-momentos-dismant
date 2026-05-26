'use client'

import { useEffect, useState } from 'react'

// ── Tipos ────────────────────────────────────────────────────

interface SkuInfo {
  id:        string
  name:      string
  image_url: string | null
  category:  string | null
  is_digital: boolean
}

interface Redemption {
  id:          string
  points_spent: number
  voucher_code: string
  status:      'active' | 'used' | 'expired'
  created_at:  string
  reward_skus: SkuInfo | null
  has_review:  boolean
}

// ── Config ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:  { label: 'Activo',   className: 'bg-green-100 text-green-700' },
  used:    { label: 'Usado',    className: 'bg-gray-100 text-gray-500' },
  expired: { label: 'Expirado', className: 'bg-red-100 text-red-500' },
}

function categoryIcon(cat: string | null): string {
  const map: Record<string, string> = {
    Combustible:  '⛽',
    Experiencias: '🍽️',
    Descuentos:   '🏷️',
    Merchandise:  '👕',
    Viajes:       '✈️',
    Tecnología:   '💻',
  }
  return cat ? (map[cat] ?? '🎁') : '🎁'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modal de voucher ─────────────────────────────────────────

function VoucherModal({ redemption, onClose }: { redemption: Redemption; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const sku = redemption.reward_skus

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function copyCode() {
    await navigator.clipboard.writeText(redemption.voucher_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const st = STATUS_CONFIG[redemption.status] ?? STATUS_CONFIG.active

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{categoryIcon(sku?.category ?? null)}</span>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{sku?.name ?? 'Premio'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Canjeado el {fmtDate(redemption.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${st.className}`}>
            {st.label}
          </span>
          {redemption.status === 'used' && (
            <span className="text-xs text-muted-foreground">Este voucher ya fue utilizado.</span>
          )}
          {redemption.status === 'expired' && (
            <span className="text-xs text-muted-foreground">Este voucher venció.</span>
          )}
        </div>

        {/* Código */}
        <div className="bg-muted/30 rounded-xl p-5 text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Código de voucher</p>
          <p className={`text-3xl font-mono font-bold tracking-widest ${
            redemption.status !== 'active' ? 'text-muted-foreground line-through' : 'text-foreground'
          }`}>
            {redemption.voucher_code}
          </p>
          {redemption.status === 'active' && (
            <button onClick={copyCode} className="text-xs text-primary hover:underline font-medium">
              {copied ? '✓ Copiado' : 'Copiar código'}
            </button>
          )}
        </div>

        {/* Instrucciones */}
        {redemption.status === 'active' && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">¿Cómo usar este código?</p>
            {sku?.is_digital
              ? <p>Ingresa el código al momento de tu siguiente compra en línea o compártelo con tu asesor de ventas Dismant.</p>
              : <p>Presenta este código en el establecimiento participante. El personal validará y marcará el voucher como usado.</p>
            }
          </div>
        )}

        {/* Resumen */}
        <div className="divide-y divide-border rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
            <span className="text-xs text-muted-foreground">Puntos canjeados</span>
            <span className="text-xs font-semibold text-foreground">
              -{redemption.points_spent.toLocaleString('es-MX')} pts
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

// ── Modal de calificación ─────────────────────────────────────

function ReviewModal({ redemption, onClose, onReviewed }: {
  redemption: Redemption
  onClose:    () => void
  onReviewed: () => void
}) {
  const [rating, setRating]     = useState(0)
  const [hover, setHover]       = useState(0)
  const [comment, setComment]   = useState('')
  const [submitting, setSubmit] = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState<{ bonus: boolean } | null>(null)

  const willGetBonus = comment.trim().length >= 20

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Selecciona una calificación'); return }
    setSubmit(true); setError('')
    const res = await fetch('/api/client/reviews', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ redemptionId: redemption.id, rating, comment }),
    })
    setSubmit(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    const { bonus_awarded } = await res.json()
    setDone({ bonus: bonus_awarded })
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-4xl mb-4">⭐</p>
          <h3 className="text-lg font-bold mb-2">¡Gracias por tu reseña!</h3>
          {done.bonus && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2 mb-4">
              +5 puntos acreditados por tu reseña.
            </p>
          )}
          <button onClick={() => { onReviewed(); onClose() }}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <form onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Calificar premio</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{redemption.reward_skus?.name}</p>

        {/* Stars */}
        <div className="flex gap-2 justify-center py-2">
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button"
              onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className={`text-3xl transition-transform hover:scale-110 ${
                (hover || rating) >= s ? 'text-amber-400' : 'text-gray-200'
              }`}
            >★</button>
          ))}
        </div>

        {/* Comentario */}
        <div>
          <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Cuéntanos tu experiencia (opcional)…"
            className="input-field w-full text-sm resize-none"
          />
          {!willGetBonus && comment.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{20 - comment.trim().length} caracteres más para recibir 5 puntos extra</p>
          )}
          {willGetBonus && (
            <p className="text-xs text-green-600 mt-1 font-medium">¡Recibirás 5 puntos extra por tu reseña!</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting || !rating}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Enviar calificación
        </button>
      </form>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function RedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading]         = useState(true)
  const [viewing, setViewing]         = useState<Redemption | null>(null)
  const [reviewing, setReviewing]     = useState<Redemption | null>(null)

  useEffect(() => {
    fetch('/api/client/redemptions')
      .then(r => r.ok ? r.json() : { redemptions: [] })
      .then(({ redemptions: data }) => { setRedemptions(data); setLoading(false) })
  }, [])

  return (
    <div className="space-y-8">

      {viewing && (
        <VoucherModal redemption={viewing} onClose={() => setViewing(null)} />
      )}
      {reviewing && (
        <ReviewModal
          redemption={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={() => {
            setRedemptions(prev => prev.map(r => r.id === reviewing.id ? { ...r, has_review: true } : r))
          }}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Canjes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Historial de premios canjeados y sus vouchers.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border p-5 flex gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : redemptions.length === 0 ? (
        <div className="bg-card rounded-xl border p-16 text-center">
          <div className="text-5xl mb-4">🎫</div>
          <p className="text-base font-semibold text-foreground mb-1">Aún no has canjeado ningún premio.</p>
          <p className="text-sm text-muted-foreground mb-4">
            Visita el catálogo y usa tus puntos para obtener premios exclusivos.
          </p>
          <a
            href="/catalog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver catálogo
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {redemptions.map(r => {
            const sku = r.reward_skus
            const st  = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.active

            return (
              <div
                key={r.id}
                className="bg-card rounded-xl border p-5 flex items-center gap-4"
              >
                {/* Ícono */}
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-2xl">
                  {sku?.image_url
                    ? <img src={sku.image_url} alt={sku.name} className="w-12 h-12 rounded-xl object-cover" />
                    : categoryIcon(sku?.category ?? null)
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {sku?.name ?? 'Premio'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDate(r.created_at)} · {r.points_spent.toLocaleString('es-MX')} pts
                  </p>
                </div>

                {/* Status + acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}>
                    {st.label}
                  </span>

                  {r.status === 'active' && (
                    <button
                      onClick={() => setViewing(r)}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Ver voucher
                    </button>
                  )}

                  {r.status !== 'active' && (
                    <button
                      onClick={() => setViewing(r)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      Ver detalle
                    </button>
                  )}

                  {!r.has_review && (
                    <button
                      onClick={() => setReviewing(r)}
                      className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                    >
                      Calificar
                    </button>
                  )}
                  {r.has_review && (
                    <span className="text-xs text-muted-foreground">⭐ Calificado</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
