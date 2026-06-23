'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Gift, CheckCircle2, Clock, XCircle, Star, Copy, Check,
  ChevronRight, Ticket, Zap, MapPin, Package, Smartphone,
  AlertCircle, Truck, ExternalLink, KeyRound, Download,
  ThumbsUp, Flag, X,
  Fuel, UtensilsCrossed, Tag, ShoppingBag, Plane, Monitor,
  type LucideIcon,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface SkuInfo {
  id: string; name: string; image_url: string | null
  category: string | null; is_digital: boolean
}
interface DeliveryAddress {
  full_name: string; phone: string; street: string
  colony: string; city: string; state: string; zip: string; notes?: string
}
interface DisputeInfo { reason: string; reported_at: string }
interface ShippingInfo {
  carrier: string; tracking_number: string; tracking_url?: string
  estimated_date?: string; shipped_at?: string
  dispute?: DisputeInfo
}
interface Redemption {
  id: string; points_spent: number; voucher_code: string
  status: 'active' | 'shipped' | 'used' | 'expired' | 'confirmed' | 'disputed'
  created_at: string
  reward_skus: SkuInfo | null; has_review: boolean
  delivery_address: DeliveryAddress | null
  prize_content: string | null
  prize_file_key: string | null
  shipping_info: ShippingInfo | null
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtPts(n: number) { return n.toLocaleString('es-MX') }

const CAT_LUCIDE: Record<string, LucideIcon> = {
  Combustible: Fuel, Experiencias: UtensilsCrossed, Descuentos: Tag,
  Merchandise: ShoppingBag, Viajes: Plane, Tecnología: Monitor,
}
function CategoryIcon({ cat, className }: { cat: string | null; className?: string }) {
  const Icon = (cat && CAT_LUCIDE[cat]) ? CAT_LUCIDE[cat] : Gift
  return <Icon className={className ?? 'w-6 h-6 text-muted-foreground/30'} />
}

const STATUS = {
  active:    { label: 'Pendiente',    bg: 'bg-amber-500/10',    text: 'text-amber-600',    dot: 'bg-amber-400 animate-pulse',   Icon: Clock },
  shipped:   { label: 'En tránsito',  bg: 'bg-sky-500/10',      text: 'text-sky-600',      dot: 'bg-sky-400 animate-pulse',     Icon: Truck },
  used:      { label: 'Entregado',    bg: 'bg-emerald-500/10',  text: 'text-emerald-600',  dot: 'bg-emerald-400',               Icon: CheckCircle2 },
  confirmed: { label: 'Recibido',     bg: 'bg-emerald-500/15',  text: 'text-emerald-700',  dot: 'bg-emerald-500',               Icon: ThumbsUp },
  disputed:  { label: 'En disputa',   bg: 'bg-red-500/10',      text: 'text-red-500',      dot: 'bg-red-400 animate-pulse',     Icon: Flag },
  expired:   { label: 'Expirado',     bg: 'bg-red-500/10',      text: 'text-red-500',      dot: 'bg-red-400',                   Icon: XCircle },
}

const EMPTY_ADDR: DeliveryAddress = {
  full_name: '', phone: '', street: '', colony: '', city: '', state: '', zip: '', notes: '',
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

// ── Modal: dirección de entrega ───────────────────────────────

function AddressModal({ redemptionId, initialAddr, onClose, onSaved }: {
  redemptionId: string; initialAddr: DeliveryAddress | null
  onClose: () => void; onSaved: (addr: DeliveryAddress) => void
}) {
  const [addr, setAddr]     = useState<DeliveryAddress>(initialAddr ?? EMPTY_ADDR)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k: keyof DeliveryAddress, v: string) => setAddr(prev => ({ ...prev, [k]: v }))
  const isValid = addr.full_name.trim() && addr.phone.trim() && addr.street.trim() &&
    addr.colony.trim() && addr.city.trim() && addr.state.trim() && addr.zip.trim()

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const res = await fetch(`/api/client/redemptions/${redemptionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_address: addr }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Error'); return }
    onSaved(addr)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <form onSubmit={handleSave}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {initialAddr ? 'Editar dirección' : 'Agregar dirección de entrega'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tu premio físico será enviado aquí</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nombre completo *</label>
              <input value={addr.full_name} onChange={e => set('full_name', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="Nombre de quien recibe" required />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Teléfono *</label>
              <input value={addr.phone} onChange={e => set('phone', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="10 dígitos" type="tel" required />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Calle y número *</label>
              <input value={addr.street} onChange={e => set('street', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="Av. Insurgentes Sur 1234" required />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Colonia *</label>
              <input value={addr.colony} onChange={e => set('colony', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="Del Valle" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ciudad *</label>
              <input value={addr.city} onChange={e => set('city', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="Monterrey" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Estado *</label>
              <input value={addr.state} onChange={e => set('state', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="Nuevo León" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">C.P. *</label>
              <input value={addr.zip} onChange={e => set('zip', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="64000" maxLength={5} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Referencias</label>
              <input value={addr.notes ?? ''} onChange={e => set('notes', e.target.value)}
                className="input-field mt-1 w-full text-sm" placeholder="Entre calles, color…" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !isValid}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar dirección'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Modal de detalle del canje ────────────────────────────────

function VoucherModal({ redemption, onClose, onEditAddress, onUpdate }: {
  redemption: Redemption; onClose: () => void
  onEditAddress: (r: Redemption) => void
  onUpdate: (id: string, patch: Partial<Redemption>) => void
}) {
  const { copied, copy } = useCopy()
  const [disputeOpen, setDisputeOpen]   = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [saving, setSaving]             = useState(false)
  const [actionError, setActionError]   = useState('')

  const sku          = redemption.reward_skus
  const st           = STATUS[redemption.status] ?? STATUS.active
  const StIcon       = st.Icon
  const isPending    = redemption.status === 'active'
  const isShipped    = redemption.status === 'shipped'
  const isDelivered  = redemption.status === 'used'
  const isConfirmed  = redemption.status === 'confirmed'
  const isDisputed   = redemption.status === 'disputed'
  const isPhysical   = !(sku?.is_digital ?? true)
  const hasAddr      = !!redemption.delivery_address
  const hasPrize     = !!redemption.prize_content
  const hasFile      = !!redemption.prize_file_key
  const showVoucher  = !isDelivered && !isConfirmed && !isDisputed
  const canConfirm   = isPhysical && (isDelivered || isShipped) && !isConfirmed && !isDisputed
  const dispute      = redemption.shipping_info?.dispute

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleConfirm() {
    setSaving(true); setActionError('')
    const res = await fetch(`/api/client/redemptions/${redemption.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_delivery' }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? 'Error'); return }
    onUpdate(redemption.id, { status: 'confirmed' })
    onClose()
  }

  async function handleDispute() {
    if (!disputeReason.trim()) { setActionError('Describe el motivo'); return }
    setSaving(true); setActionError('')
    const res = await fetch(`/api/client/redemptions/${redemption.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dispute_delivery', dispute_reason: disputeReason }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setActionError(d.error ?? 'Error'); return }
    const updatedInfo = { ...(redemption.shipping_info ?? {}), dispute: { reason: disputeReason, reported_at: new Date().toISOString() } }
    onUpdate(redemption.id, { status: 'disputed', shipping_info: updatedInfo as ShippingInfo })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Franja de estado */}
        <div className={`h-1.5 ${
          isPending ? 'bg-amber-400' : isShipped ? 'bg-sky-400' :
          isConfirmed ? 'bg-emerald-600' : isDisputed ? 'bg-red-500' :
          isDelivered ? 'bg-emerald-500' : 'bg-red-400'
        }`} />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {sku?.image_url
                  ? <img src={sku.image_url} alt="" className="w-full h-full object-cover" />
                  : <CategoryIcon cat={sku?.category ?? null} className="w-5 h-5 text-muted-foreground/40" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-snug">{sku?.name ?? 'Premio'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(redemption.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg} shrink-0`}>
                <StIcon className={`w-3 h-3 ${st.text}`} />
                <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tipo */}
          <div>
            {isPhysical
              ? <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 w-fit">
                  <Package className="w-3 h-3" /> Premio físico
                </span>
              : <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 w-fit">
                  <Smartphone className="w-3 h-3" /> Premio digital
                </span>
            }
          </div>

          {/* ── DIGITAL: CÓDIGO ── */}
          {!isPhysical && hasPrize && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <KeyRound className="w-4 h-4 text-blue-500" />
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">Tu premio</p>
              </div>
              <p className="font-mono font-bold text-xl text-foreground break-all leading-snug">{redemption.prize_content}</p>
              <button onClick={() => copy(redemption.prize_content!)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium mx-auto mt-1">
                {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
              </button>
            </div>
          )}

          {/* ── DIGITAL: ARCHIVO ── */}
          {!isPhysical && hasFile && (
            <a href={`/api/client/redemptions/${redemption.id}/prize-file`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/10 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Descargar archivo del premio</p>
                <p className="text-xs text-muted-foreground">Boleto, PDF o archivo adjunto</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors shrink-0" />
            </a>
          )}

          {/* ── DIGITAL: EN ESPERA ── */}
          {!isPhysical && !hasPrize && !hasFile && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Premio en preparación</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tu ejecutivo de cuenta está asignando el contenido. Recibirás un email cuando esté listo.</p>
              </div>
            </div>
          )}

          {/* ── FÍSICO: RASTREO ── */}
          {isPhysical && (isShipped || isDelivered || isConfirmed || isDisputed) && redemption.shipping_info && (
            <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-widest flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Información de envío
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Paquetería</p>
                  <p className="font-semibold text-foreground">{redemption.shipping_info.carrier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guía</p>
                  <p className="font-mono font-bold text-foreground text-xs">{redemption.shipping_info.tracking_number}</p>
                </div>
                {redemption.shipping_info.estimated_date && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Entrega estimada</p>
                    <p className="font-medium text-foreground">{redemption.shipping_info.estimated_date}</p>
                  </div>
                )}
              </div>
              {redemption.shipping_info.tracking_url && (
                <a href={redemption.shipping_info.tracking_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Rastrear envío
                </a>
              )}
            </div>
          )}

          {/* ── FÍSICO: DIRECCIÓN ── */}
          {isPhysical && hasAddr && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Dirección de entrega
                </p>
                {isPending && (
                  <button onClick={() => onEditAddress(redemption)}
                    className="text-xs text-primary hover:underline font-medium">Editar</button>
                )}
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-0.5">
                <p className="font-semibold text-foreground">{redemption.delivery_address!.full_name}</p>
                <p className="text-muted-foreground text-xs">{redemption.delivery_address!.phone}</p>
                <p className="text-muted-foreground text-xs">{redemption.delivery_address!.street}, Col. {redemption.delivery_address!.colony}</p>
                <p className="text-muted-foreground text-xs">{redemption.delivery_address!.city}, {redemption.delivery_address!.state} {redemption.delivery_address!.zip}</p>
              </div>
            </div>
          )}
          {isPhysical && !hasAddr && isPending && (
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Dirección pendiente</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Necesitamos tu dirección para enviarte el premio.</p>
                </div>
              </div>
              <button onClick={() => { onClose(); onEditAddress(redemption) }}
                className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" /> Agregar dirección
              </button>
            </div>
          )}

          {/* ── FÍSICO: CONFIRMACIÓN / DISPUTA ── */}
          {canConfirm && !disputeOpen && (
            <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">¿Ya recibiste tu premio?</p>
              <div className="flex gap-2">
                <button onClick={handleConfirm} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                  Sí, lo recibí
                </button>
                <button onClick={() => setDisputeOpen(true)} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-60 transition-colors">
                  <Flag className="w-3.5 h-3.5" /> No lo recibí
                </button>
              </div>
            </div>
          )}

          {/* ── DISPUTA: formulario ── */}
          {canConfirm && disputeOpen && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-600">Reportar problema</p>
                <button onClick={() => { setDisputeOpen(false); setActionError('') }}
                  className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <textarea rows={3} value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                placeholder="Ej. El paquete llegó dañado, no he recibido nada, la dirección es incorrecta…"
                className="input-field w-full text-sm resize-none" />
              {actionError && <p className="text-xs text-red-600">{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setDisputeOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleDispute} disabled={saving || !disputeReason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors">
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Enviar reporte
                </button>
              </div>
            </div>
          )}

          {/* Confirmado */}
          {isConfirmed && isPhysical && (
            <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <ThumbsUp className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Recepción confirmada</p>
                <p className="text-xs text-muted-foreground">Confirmaste que recibiste este premio.</p>
              </div>
            </div>
          )}

          {/* En disputa */}
          {isDisputed && dispute && (
            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <Flag className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-600">Reporte enviado</p>
                <p className="text-xs text-muted-foreground mt-0.5">&ldquo;{dispute.reason}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">Nuestro equipo se pondrá en contacto contigo.</p>
              </div>
            </div>
          )}

          {actionError && !disputeOpen && (
            <p className="text-xs text-red-600 text-center">{actionError}</p>
          )}

          {/* Puntos */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 rounded-xl">
            <span className="text-xs text-muted-foreground">Puntos canjeados</span>
            <span className="text-sm font-bold text-red-500">−{fmtPts(redemption.points_spent)} pts</span>
          </div>

          {/* Código de referencia — solo mientras no esté completado */}
          {showVoucher && (
            <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Código de referencia</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-center text-foreground">
                {redemption.voucher_code}
              </p>
            </div>
          )}

          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de calificación ─────────────────────────────────────

function ReviewModal({ redemption, onClose, onReviewed }: {
  redemption: Redemption; onClose: () => void; onReviewed: () => void
}) {
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState<{ bonus: boolean } | null>(null)
  const willGetBonus = comment.trim().length >= 20

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Selecciona una calificación'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/client/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redemptionId: redemption.id, rating, comment }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    const { bonus_awarded } = await res.json()
    setDone({ bonus: bonus_awarded })
  }

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">¡Gracias por tu reseña!</h3>
        {done.bonus && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-4">
            <p className="text-sm text-emerald-600 font-medium">+5 puntos acreditados en tu saldo</p>
          </div>
        )}
        <button onClick={() => { onReviewed(); onClose() }}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
          Cerrar
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <form onSubmit={handleSubmit}
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-foreground">Calificar premio</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{redemption.reward_skus?.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 justify-center py-2">
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button"
              onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="transition-all hover:scale-110 focus:outline-none">
              <svg viewBox="0 0 24 24"
                className={`w-9 h-9 transition-colors ${(hover || rating) >= s ? 'text-amber-400' : 'text-muted-foreground/20'}`}
                fill={(hover || rating) >= s ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
            </button>
          ))}
        </div>
        <div>
          <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Cuéntanos tu experiencia (opcional)…"
            className="input-field w-full text-sm resize-none" />
          <div className="mt-1.5 h-4">
            {!willGetBonus && comment.length > 0 && (
              <p className="text-xs text-muted-foreground">Agrega {20 - comment.trim().length} caracteres más para ganar +5 pts</p>
            )}
            {willGetBonus && <p className="text-xs text-emerald-600 font-medium">¡Recibirás +5 puntos!</p>}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || !rating}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Enviar calificación
        </button>
      </form>
    </div>
  )
}

// ── Tarjeta de canje ──────────────────────────────────────────

function RedemptionCard({ r, onView, onReview, onAddAddress }: {
  r: Redemption; onView: (r: Redemption) => void
  onReview: (r: Redemption) => void; onAddAddress: (r: Redemption) => void
}) {
  const sku          = r.reward_skus
  const st           = STATUS[r.status] ?? STATUS.active
  const StIcon       = st.Icon
  const isPending    = r.status === 'active'
  const isShipped    = r.status === 'shipped'
  const isDelivered  = r.status === 'used'
  const isConfirmed  = r.status === 'confirmed'
  const isDisputed   = r.status === 'disputed'
  const isDone       = isDelivered || isConfirmed || isDisputed
  const isPhysical   = !(sku?.is_digital ?? true)
  const needsAddr    = isPhysical && isPending && !r.delivery_address
  const hasPrize     = !!r.prize_content
  const hasFile      = !!r.prize_file_key
  const prizeReady   = !isPhysical && (hasPrize || hasFile)
  const canConfirm   = isPhysical && (isDelivered || isShipped) && !isConfirmed && !isDisputed

  return (
    <div className={`bg-card rounded-2xl overflow-hidden border transition-all hover:shadow-md ${
      isDisputed  ? 'border-red-500/30' :
      needsAddr   ? 'border-amber-500/40' :
      isShipped   ? 'border-sky-500/20' :
      isPending   ? 'border-amber-500/20' :
      isConfirmed ? 'border-emerald-500/30' : 'border-border'
    }`}>

      {/* ── Top image + status overlay ── */}
      <div className="relative">
        {/* Image strip */}
        <div className={`w-full h-28 flex items-center justify-center overflow-hidden ${
          isDone ? 'bg-muted/40' : 'bg-muted/20'
        }`}>
          {sku?.image_url
            ? <img src={sku.image_url} alt="" className={`w-full h-full object-cover ${isDone ? 'opacity-70' : ''}`} />
            : <CategoryIcon cat={sku?.category ?? null} className="w-12 h-12 text-muted-foreground/20" />
          }
        </div>

        {/* Status badge overlaid top-right */}
        <div className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm shadow ${st.bg} border border-white/10`}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
          <span className={`text-[10px] font-bold ${st.text}`}>{st.label}</span>
        </div>

        {/* Type badge overlaid top-left */}
        <div className="absolute top-2.5 left-2.5">
          {isPhysical
            ? <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/80 text-white backdrop-blur-sm">
                <Package className="w-2.5 h-2.5" /> Físico
              </span>
            : <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/80 text-white backdrop-blur-sm">
                <Smartphone className="w-2.5 h-2.5" /> Digital
              </span>
          }
        </div>
      </div>

      {/* ── Info ── */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm font-bold text-foreground leading-snug line-clamp-1">{sku?.name ?? 'Premio'}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
          <span className="text-xs font-semibold text-foreground">−{fmtPts(r.points_spent)} <span className="text-muted-foreground font-normal">pts</span></span>
        </div>
      </div>

      {/* ── Alertas contextuales ── */}
      {needsAddr && (
        <div className="mx-3 mb-2 mt-1 bg-amber-500/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">Falta dirección de envío</span>
          </div>
          <button onClick={() => onAddAddress(r)}
            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Agregar
          </button>
        </div>
      )}
      {isShipped && r.shipping_info && (
        <div className="mx-3 mb-2 mt-1 bg-sky-500/5 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-sky-600">
          <Truck className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium truncate">{r.shipping_info.carrier} · {r.shipping_info.tracking_number}</span>
        </div>
      )}
      {prizeReady && !isDone && (
        <div className="mx-3 mb-2 mt-1 bg-emerald-500/5 rounded-xl px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs text-emerald-600 font-medium">
            {hasPrize ? 'Código listo' : 'Archivo listo'} — toca para ver
          </span>
        </div>
      )}
      {canConfirm && (
        <div className="mx-3 mb-2 mt-1 bg-muted/30 rounded-xl px-3 py-2 flex items-center gap-2">
          <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">¿Ya lo recibiste? Confírmalo</span>
        </div>
      )}
      {isDisputed && (
        <div className="mx-3 mb-2 mt-1 bg-red-500/5 rounded-xl px-3 py-2 flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-xs text-red-500 font-medium">Reporte enviado — en revisión</span>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 mt-1">
        <button onClick={() => onView(r)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
          <StIcon className="w-3.5 h-3.5" />
          Ver detalle
          <ChevronRight className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-2">
          {(isDelivered || isConfirmed) && !r.has_review && (
            <button onClick={() => onReview(r)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold hover:bg-amber-500/20 transition-colors">
              <Star className="w-3 h-3" /> +5 pts
            </button>
          )}
          {r.has_review && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Calificado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-28 bg-muted" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="h-10 bg-muted/30 border-t border-border" />
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

type Tab = 'all' | 'active' | 'done'

export default function RedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState<Tab>('all')
  const [viewing, setViewing]         = useState<Redemption | null>(null)
  const [reviewing, setReviewing]     = useState<Redemption | null>(null)
  const [addingAddr, setAddingAddr]   = useState<Redemption | null>(null)

  useEffect(() => {
    fetch('/api/client/redemptions')
      .then(r => r.ok ? r.json() : { redemptions: [] })
      .then(({ redemptions: data }) => { setRedemptions(data); setLoading(false) })
  }, [])

  function updateRedemption(id: string, patch: Partial<Redemption>) {
    setRedemptions(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    setViewing(prev => prev?.id === id ? { ...prev, ...patch } : prev)
  }

  const active    = redemptions.filter(r => r.status === 'active')
  const inTransit = redemptions.filter(r => r.status === 'shipped')
  const done      = redemptions.filter(r => ['used','confirmed','disputed','expired'].includes(r.status))
  const totalPts  = redemptions.reduce((s, r) => s + r.points_spent, 0)
  const pendingRev = done.filter(r => !r.has_review && ['used','confirmed'].includes(r.status)).length
  const needsAddr  = active.filter(r => !(r.reward_skus?.is_digital ?? true) && !r.delivery_address).length
  const canConfirmCount = redemptions.filter(r =>
    !(r.reward_skus?.is_digital ?? true) && ['used','shipped'].includes(r.status)
  ).length

  const visible = tab === 'all'
    ? redemptions
    : tab === 'active' ? [...active, ...inTransit]
    : done

  return (
    <div className="space-y-6">
      {viewing && (
        <VoucherModal
          redemption={viewing}
          onClose={() => setViewing(null)}
          onEditAddress={r => { setViewing(null); setAddingAddr(r) }}
          onUpdate={updateRedemption}
        />
      )}
      {reviewing && (
        <ReviewModal
          redemption={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={() => updateRedemption(reviewing.id, { has_review: true })}
        />
      )}
      {addingAddr && (
        <AddressModal
          redemptionId={addingAddr.id}
          initialAddr={addingAddr.delivery_address}
          onClose={() => setAddingAddr(null)}
          onSaved={addr => { updateRedemption(addingAddr.id, { delivery_address: addr }); setAddingAddr(null) }}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Canjes</h1>
        <p className="text-sm text-muted-foreground mt-1">Historial de premios canjeados.</p>
      </div>

      {/* KPIs */}
      {!loading && redemptions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <Gift className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{redemptions.length}</p>
            <p className="text-[11px] text-muted-foreground">canjes</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{fmtPts(totalPts)}</p>
            <p className="text-[11px] text-muted-foreground">pts usados</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{done.length}</p>
            <p className="text-[11px] text-muted-foreground">entregados</p>
          </div>
        </div>
      )}

      {/* Banners de alerta */}
      {!loading && needsAddr > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{needsAddr} premio{needsAddr > 1 ? 's' : ''} sin dirección de envío</p>
              <p className="text-xs text-muted-foreground">Agrégala para que podamos enviártelo</p>
            </div>
          </div>
          <button onClick={() => setTab('active')} className="text-xs font-semibold text-amber-600 hover:underline shrink-0">Ver</button>
        </div>
      )}
      {!loading && canConfirmCount > 0 && needsAddr === 0 && (
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
              <ThumbsUp className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{canConfirmCount} entrega{canConfirmCount > 1 ? 's' : ''} por confirmar</p>
              <p className="text-xs text-muted-foreground">¿Ya recibiste tu premio? Confírmalo</p>
            </div>
          </div>
          <button onClick={() => setTab('done')} className="text-xs font-semibold text-sky-600 hover:underline shrink-0">Ver</button>
        </div>
      )}
      {!loading && pendingRev > 0 && needsAddr === 0 && canConfirmCount === 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{pendingRev} premio{pendingRev > 1 ? 's' : ''} sin calificar</p>
              <p className="text-xs text-muted-foreground">Gana +5 pts por cada reseña</p>
            </div>
          </div>
          <button onClick={() => setTab('done')} className="text-xs font-semibold text-amber-600 hover:underline shrink-0">Ver</button>
        </div>
      )}

      {loading ? <Skeleton /> : redemptions.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Aún no has canjeado ningún premio</p>
          <p className="text-sm text-muted-foreground mb-6">Usa tus puntos para obtener premios exclusivos.</p>
          <Link href="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Gift className="w-4 h-4" /> Ver catálogo
          </Link>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
            {([
              { key: 'all',    label: `Todos (${redemptions.length})` },
              { key: 'active', label: `Activos (${active.length + inTransit.length})` },
              { key: 'done',   label: `Historial (${done.length})` },
            ] as { key: Tab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {tab === 'active' ? 'No tienes canjes activos.' : 'Aún no tienes premios en el historial.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map(r => (
                <RedemptionCard
                  key={r.id} r={r}
                  onView={setViewing}
                  onReview={setReviewing}
                  onAddAddress={setAddingAddr}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
