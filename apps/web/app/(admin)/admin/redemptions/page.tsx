'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search, CheckCircle2, Gift, Ticket, Building2, Clock, X,
  MapPin, Package, Smartphone, Truck, Send, KeyRound, AlertCircle,
  Paperclip, XCircle, Fuel, UtensilsCrossed, Tag, ShoppingBag, Plane, Monitor,
  type LucideIcon,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

interface SkuInfo {
  id: string; name: string; image_url: string | null
  category: string | null; is_digital: boolean
}
interface MemberInfo {
  id: string; full_name: string; email: string; company_name: string | null
}
interface DeliveryAddress {
  full_name: string; phone: string; street: string
  colony: string; city: string; state: string; zip: string; notes?: string
}
interface ShippingInfo {
  carrier: string; tracking_number: string; tracking_url?: string
  estimated_date?: string; shipped_at?: string
}
interface Redemption {
  id: string; points_spent: number; voucher_code: string
  status: 'active' | 'shipped' | 'used' | 'confirmed' | 'disputed' | 'expired'; created_at: string
  reward_skus: SkuInfo | null; members: MemberInfo | null
  delivery_address: DeliveryAddress | null
  prize_content: string | null
  prize_file_key: string | null
  shipping_info: ShippingInfo | null
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtPts(n: number) { return n.toLocaleString('es-MX') }

const CAT_LUCIDE: Record<string, LucideIcon> = {
  Combustible: Fuel, Experiencias: UtensilsCrossed, Descuentos: Tag,
  Merchandise: ShoppingBag, Viajes: Plane, Tecnología: Monitor,
}

function CategoryIcon({ category, className }: { category: string | null | undefined; className?: string }) {
  const Icon = (category && CAT_LUCIDE[category]) ? CAT_LUCIDE[category] : Gift
  return <Icon className={className ?? 'w-5 h-5 text-muted-foreground/50'} />
}

// ── Modal digital ─────────────────────────────────────────────

function DigitalFulfillModal({
  redemption, onClose, onDone,
}: {
  redemption: Redemption; onClose: () => void; onDone: () => void
}) {
  const [prizeContent, setPrizeContent] = useState('')
  const [step, setStep]       = useState<'form' | 'confirm' | 'done'>('form')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [uploading, setUploading]       = useState(false)
  const [uploadedKey, setUploadedKey]   = useState<string | null>(null)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError]   = useState('')

  const sku         = redemption.reward_skus
  const member      = redemption.members
  const canContinue = prizeContent.trim().length > 0 || !!uploadedKey

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError(''); setUploadedKey(null); setUploadedName(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/admin/redemptions/${redemption.id}/upload-prize`, {
      method: 'POST', body: form,
    })
    setUploading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setUploadError(d.error ?? 'Error al subir el archivo')
      return
    }
    const { key, filename } = await res.json()
    setUploadedKey(key); setUploadedName(filename)
  }

  async function handleDeliver() {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/redemptions/${redemption.id}/fulfill`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deliver',
        prize_content: prizeContent.trim() || undefined,
        prize_file_key: uploadedKey || undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    setStep('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              {step === 'done' ? 'Premio entregado' : 'Entregar premio digital'}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'done' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">¡Premio entregado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  El cliente recibió el contenido del premio por email y ya puede verlo en Mis Canjes.
                </p>
              </div>
              <button onClick={onDone}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Listo
              </button>
            </div>
          ) : (
            <>
              {/* Info del canje */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {sku?.image_url
                    ? <img src={sku.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    : <CategoryIcon category={sku?.category} className="w-6 h-6 text-muted-foreground/40" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{sku?.name ?? 'Premio'}</p>
                  <p className="text-xs text-muted-foreground">{member?.full_name} · {member?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtPts(redemption.points_spent)} pts · {redemption.voucher_code}</p>
                </div>
              </div>

              {step === 'form' && (
                <>
                  {/* Código / texto */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-500" />
                      Código o acceso
                    </label>
                    <textarea
                      rows={3}
                      value={prizeContent}
                      onChange={e => setPrizeContent(e.target.value)}
                      placeholder="Ej. PROMO-2024-ALFA, boleto #12345, https://acceso.ejemplo.com…"
                      className="input-field w-full text-sm font-mono resize-none"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Opcional si subes un archivo. Se mostrará al cliente en Mis Canjes.
                    </p>
                  </div>

                  {/* Archivo adjunto */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-blue-500" />
                      Archivo adjunto
                    </label>
                    <p className="text-xs text-muted-foreground">
                      PDF, imagen, ZIP o TXT (máx. 10 MB). Se adjuntará al email del cliente.
                    </p>
                    {uploadedKey ? (
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <Paperclip className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium flex-1 truncate">
                          {uploadedName}
                        </span>
                        <button type="button"
                          onClick={() => { setUploadedKey(null); setUploadedName(null) }}
                          className="text-muted-foreground hover:text-red-500 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        uploading
                          ? 'border-blue-300 bg-blue-500/5 opacity-70 pointer-events-none'
                          : 'border-border hover:border-blue-400 hover:bg-blue-500/5'
                      }`}>
                        {uploading
                          ? <><span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /><span className="text-xs text-muted-foreground">Subiendo…</span></>
                          : <><Paperclip className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Seleccionar archivo</span></>
                        }
                        <input type="file" className="sr-only" disabled={uploading}
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.zip,.txt"
                          onChange={handleFileChange} />
                      </label>
                    )}
                    {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => setStep('confirm')} disabled={!canContinue || uploading}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Continuar
                    </button>
                  </div>
                </>
              )}

              {step === 'confirm' && (
                <>
                  {prizeContent.trim() && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center space-y-2">
                      <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest">
                        Código que recibirá el cliente
                      </p>
                      <p className="font-mono font-bold text-lg text-foreground break-all">{prizeContent}</p>
                    </div>
                  )}
                  {uploadedKey && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <Paperclip className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Archivo adjunto al email</p>
                        <p className="text-xs text-muted-foreground truncate">{uploadedName}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                    Este contenido se enviará a <strong>{member?.email}</strong> y se registrará como entregado. No se puede modificar después.
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep('form')} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors">
                      Volver
                    </button>
                    <button onClick={handleDeliver} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2 transition-colors">
                      {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {saving ? 'Enviando…' : 'Confirmar entrega'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal físico ──────────────────────────────────────────────

function PhysicalFulfillModal({
  redemption, onClose, onDone,
}: {
  redemption: Redemption; onClose: () => void; onDone: () => void
}) {
  const isShipped  = redemption.status === 'shipped'
  const [step, setStep]     = useState<'form' | 'confirm' | 'done'>(isShipped ? 'confirm' : 'form')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [carrier, setCarrier]           = useState(redemption.shipping_info?.carrier ?? '')
  const [trackingNumber, setTracking]   = useState(redemption.shipping_info?.tracking_number ?? '')
  const [trackingUrl, setTrackingUrl]   = useState(redemption.shipping_info?.tracking_url ?? '')
  const [estimatedDate, setEstimated]   = useState(redemption.shipping_info?.estimated_date ?? '')
  const sku    = redemption.reward_skus
  const member = redemption.members

  async function handleShip() {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/redemptions/${redemption.id}/fulfill`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ship',
        shipping_info: { carrier, tracking_number: trackingNumber, tracking_url: trackingUrl || undefined, estimated_date: estimatedDate || undefined },
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    setStep('confirm')
  }

  async function handleDeliver() {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/redemptions/${redemption.id}/fulfill`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deliver' }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    setStep('done')
  }

  const canShip = carrier.trim() && trackingNumber.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              step === 'done' ? 'bg-emerald-500/10' : isShipped || step === 'confirm' ? 'bg-blue-500/10' : 'bg-orange-500/10'
            }`}>
              {step === 'done'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : (isShipped || step === 'confirm')
                  ? <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  : <Truck className="w-4 h-4 text-orange-500" />
              }
            </div>
            <h3 className="font-bold text-base text-foreground">
              {step === 'done'
                ? 'Premio entregado'
                : step === 'confirm' || isShipped
                  ? 'Confirmar entrega final'
                  : 'Registrar envío'}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'done' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">¡Entrega confirmada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  El cliente fue notificado por email y el canje está cerrado.
                </p>
              </div>
              <button onClick={onDone}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Listo
              </button>
            </div>
          ) : (
            <>
              {/* Info del canje */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {sku?.image_url
                    ? <img src={sku.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    : <CategoryIcon category={sku?.category} className="w-6 h-6 text-muted-foreground/40" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{sku?.name ?? 'Premio'}</p>
                  <p className="text-xs text-muted-foreground">{member?.full_name} · {member?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtPts(redemption.points_spent)} pts · {redemption.voucher_code}</p>
                </div>
              </div>

              {/* Dirección */}
              {redemption.delivery_address && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Enviar a
                  </p>
                  <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-sm space-y-0.5">
                    <p className="font-semibold text-foreground">{redemption.delivery_address.full_name}</p>
                    <p className="text-muted-foreground text-xs">{redemption.delivery_address.phone}</p>
                    <p className="text-muted-foreground text-xs">{redemption.delivery_address.street}</p>
                    <p className="text-muted-foreground text-xs">Col. {redemption.delivery_address.colony}</p>
                    <p className="text-muted-foreground text-xs">{redemption.delivery_address.city}, {redemption.delivery_address.state} {redemption.delivery_address.zip}</p>
                    {redemption.delivery_address.notes && (
                      <p className="text-muted-foreground text-xs italic">Ref: {redemption.delivery_address.notes}</p>
                    )}
                  </div>
                </div>
              )}
              {!redemption.delivery_address && step === 'form' && (
                <div className="flex items-center gap-2.5 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">Sin dirección capturada — el cliente aún no la agregó</p>
                </div>
              )}

              {/* Step 1: formulario de envío */}
              {step === 'form' && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" /> Datos del envío
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Paquetería *</label>
                        <input value={carrier} onChange={e => setCarrier(e.target.value)}
                          className="input-field mt-1 w-full text-sm" placeholder="Ej. FedEx, DHL, Estafeta…" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Número de guía *</label>
                        <input value={trackingNumber} onChange={e => setTracking(e.target.value)}
                          className="input-field mt-1 w-full text-sm font-mono" placeholder="123456789012" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">URL de rastreo</label>
                        <input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)}
                          className="input-field mt-1 w-full text-sm" placeholder="https://rastreo.fedex.com/…" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Entrega estimada</label>
                        <input type="date" value={estimatedDate} onChange={e => setEstimated(e.target.value)}
                          className="input-field mt-1 w-full text-sm" />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleShip} disabled={saving || !canShip}
                      className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      <Truck className="w-4 h-4" />
                      {saving ? 'Registrando…' : 'Marcar enviado'}
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 / ya enviado: confirmar entrega final */}
              {(step === 'confirm') && (
                <>
                  {(redemption.shipping_info || (carrier && trackingNumber)) && (
                    <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">Envío registrado</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Paquetería</p>
                          <p className="font-semibold text-foreground">{carrier || redemption.shipping_info?.carrier}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Guía</p>
                          <p className="font-mono font-semibold text-foreground">{trackingNumber || redemption.shipping_info?.tracking_number}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                    ¿El cliente <strong>{member?.full_name}</strong> ya recibió físicamente el premio? Esta acción cerrará el canje.
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!isShipped && (
                      <button onClick={() => setStep('form')} disabled={saving}
                        className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors">
                        Volver
                      </button>
                    )}
                    {isShipped && (
                      <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                        Cerrar
                      </button>
                    )}
                    <button onClick={handleDeliver} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2 transition-colors">
                      {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      <CheckCircle2 className="w-4 h-4" />
                      {saving ? 'Procesando…' : 'Confirmar entrega'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatus]     = useState<'active' | 'used' | 'all'>('active')
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<Redemption | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: statusFilter })
    if (search) params.set('q', search)
    const res = await fetch(`/api/admin/redemptions?${params}`)
    if (res.ok) {
      const { redemptions: data } = await res.json()
      setRedemptions(data)
    }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [load])

  function handleDone() { setSelected(null); load() }

  const pending   = redemptions.filter(r => r.status === 'active').length
  const inTransit = redemptions.filter(r => r.status === 'shipped').length
  const delivered = redemptions.filter(r => r.status === 'used').length

  const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
    active:    { label: 'Pendiente',    classes: 'bg-amber-500/10 text-amber-600' },
    shipped:   { label: 'En tránsito',  classes: 'bg-sky-500/10 text-sky-600' },
    used:      { label: 'Entregado',    classes: 'bg-emerald-500/10 text-emerald-600' },
    confirmed: { label: 'Confirmado',    classes: 'bg-emerald-500/15 text-emerald-700' },
    disputed:  { label: 'En disputa',   classes: 'bg-red-500/10 text-red-500' },
    expired:   { label: 'Expirado',     classes: 'bg-red-500/10 text-red-500' },
  }

  return (
    <div className="space-y-6">

      {/* Modal apropiado según tipo */}
      {selected && (selected.reward_skus?.is_digital
        ? <DigitalFulfillModal  redemption={selected} onClose={() => setSelected(null)} onDone={handleDone} />
        : <PhysicalFulfillModal redemption={selected} onClose={() => setSelected(null)} onDone={handleDone} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Canjes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona las solicitudes de canje. Para premios digitales ingresa el código al entregar; para físicos registra la guía.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-xl font-bold text-foreground">{pending}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">En tránsito</p>
            <p className="text-xl font-bold text-foreground">{inTransit}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entregados</p>
            <p className="text-xl font-bold text-foreground">{delivered}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total en vista</p>
            <p className="text-xl font-bold text-foreground">{redemptions.length}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm py-2 w-full"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['active', 'used', 'all'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-2 font-medium transition-colors ${statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50'}`}>
              {s === 'active' ? 'Pendientes' : s === 'used' ? 'Entregados' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            {statusFilter === 'active' ? 'Canjes pendientes (incluye en tránsito)' :
             statusFilter === 'used'   ? 'Canjes entregados' : 'Todos los canjes'}
          </h2>
          {!loading && (
            <span className="text-xs text-muted-foreground">{redemptions.length} resultado{redemptions.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando…</div>
        ) : redemptions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-foreground">No hay canjes {statusFilter === 'active' ? 'pendientes' : ''}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter === 'active' ? 'Todo está al día.' : 'Ajusta los filtros.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {redemptions.map(r => {
              const sku       = r.reward_skus
              const member    = r.members
              const isPending = r.status === 'active'
              const isShipped = r.status === 'shipped'
              const st        = STATUS_LABELS[r.status] ?? STATUS_LABELS.active

              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  {/* Ícono */}
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    {sku?.image_url
                      ? <img src={sku.image_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      : <CategoryIcon category={sku?.category} className="w-5 h-5 text-muted-foreground/40" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{sku?.name ?? 'Premio'}</p>
                      {sku?.is_digital
                        ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 shrink-0 flex items-center gap-1"><Smartphone className="w-2.5 h-2.5" />Digital</span>
                        : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 shrink-0 flex items-center gap-1"><Package className="w-2.5 h-2.5" />Físico</span>
                      }
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {member?.full_name ?? '—'}
                        {member?.company_name ? ` · ${member.company_name}` : ''}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{r.voucher_code}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(r.created_at)}</p>
                    {isShipped && r.shipping_info && (
                      <p className="text-[11px] text-sky-600 mt-0.5 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> {r.shipping_info.carrier} · {r.shipping_info.tracking_number}
                      </p>
                    )}
                  </div>

                  {/* Puntos */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-bold text-foreground">{fmtPts(r.points_spent)}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>

                  {/* Estado + acción */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:inline-flex ${st.classes}`}>
                      {st.label}
                    </span>

                    <button
                      onClick={() => setSelected(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isPending
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : isShipped
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'border border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {isPending ? 'Entregar' : isShipped ? 'Confirmar' : 'Ver detalle'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Mostrando hasta 200 canjes · Usa el buscador para filtrar por código de voucher
      </p>
    </div>
  )
}
