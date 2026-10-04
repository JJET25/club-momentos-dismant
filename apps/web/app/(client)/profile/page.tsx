'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User, Mail, MapPin, Edit2, Check, X, Shield, ChevronRight,
  Building2, FileText, Phone, Info, Bell,
} from 'lucide-react'
import { MEXICAN_STATES } from '@dismant/types'
import { ProfileSkeleton } from '@/components/page-skeletons'
import { PasswordSection, SessionsSection } from '@/components/account/password-section'

interface Profile {
  id: string; full_name: string; email: string
  company_name: string; rfc: string
  location_state: string; location_city: string
  phone: string | null; created_at: string
  has_password: boolean
  push_enabled: boolean
}

type Form = { fullName: string; phone: string; locationState: string; locationCity: string }

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}
function formatPhone(phone: string | null) {
  if (!phone) return '—'
  return phone.length === 10 ? `${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}` : phone
}
function toForm(p: Profile): Form {
  return { fullName: p.full_name, phone: p.phone ?? '', locationState: p.location_state, locationCity: p.location_city }
}

const PUSH_MESSAGES: Record<string, string> = {
  unconfigured: 'Las notificaciones push no están disponibles en este ambiente; la preferencia quedó guardada.',
  unsupported:  'Este navegador no admite notificaciones push; la preferencia quedó guardada.',
  denied:       'El navegador bloqueó las notificaciones. Permítelas en la configuración del sitio.',
  error:        'No se pudo registrar este dispositivo. Intenta de nuevo más tarde.',
}

/** Interruptor de notificaciones push (las del ícono de campana siguen llegando). */
function PushSection({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean, message: string) => void }) {
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  async function toggle() {
    const next = !enabled
    setSaving(true); setNotice('')
    const res = await fetch('/api/client/push', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    })
    if (!res.ok) { setSaving(false); setNotice('No se pudo guardar la preferencia.'); return }
    let message = next ? 'Notificaciones push activadas.' : 'Notificaciones push desactivadas.'
    if (next) {
      const { requestAndSavePushToken } = await import('@/lib/firebase-client')
      const result = await requestAndSavePushToken()
      if (result !== 'ok') { setNotice(PUSH_MESSAGES[result]); message = '' }
    }
    setSaving(false)
    onChange(next, message)
  }

  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Notificaciones push</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Avisos en este dispositivo cuando se aprueben tus facturas o tus puntos estén por vencer.
              Los avisos dentro de la app siguen llegando.
            </p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={enabled} aria-label="Notificaciones push"
          onClick={toggle} disabled={saving}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 mt-1 ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {notice && <p className="text-[11px] text-amber-600 mt-2">{notice}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')
  const [form, setForm]         = useState<Form>({ fullName: '', phone: '', locationState: '', locationCity: '' })

  useEffect(() => {
    fetch('/api/client/profile')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(({ profile: p }) => { setProfile(p); setForm(toForm(p)) })
      .catch(() => setError('No se pudo cargar el perfil. Recarga la página.'))
      .finally(() => setLoading(false))
  }, [])

  function flash(message: string) {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3000)
  }

  function startEdit() { setEditing(true); setSuccess(''); setError('') }
  function cancelEdit() {
    if (profile) setForm(toForm(profile))
    setEditing(false); setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/client/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { const { error: msg } = await res.json().catch(() => ({})); setError(msg ?? 'Error al guardar'); return }
    const { profile: updated } = await res.json()
    const nameChanged = updated.full_name !== profile?.full_name
    setProfile(updated); setForm(toForm(updated)); setEditing(false)
    flash('Perfil actualizado correctamente.')
    // El layout lee el nombre de la sesión (renovada por la API)
    if (nameChanged) router.refresh()
  }

  if (loading) return <ProfileSkeleton />
  if (!profile) {
    return (
      <div className="max-w-xl flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
        <X className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm text-red-600">{error || 'No se pudo cargar el perfil.'}</p>
      </div>
    )
  }

  const initials = getInitials(profile.full_name)
  const locationChanged = editing && (form.locationState !== profile.location_state || form.locationCity.trim() !== profile.location_city)

  return (
    <div className="max-w-xl space-y-5">

      <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 rounded-2xl p-6 text-white">
        <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 right-24 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-white leading-tight truncate">{profile.full_name}</p>
            <p className="text-blue-200 text-sm mt-0.5 truncate">{profile.company_name}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs text-blue-200">Miembro desde {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>
        {profile.location_city && (
          <div className="relative mt-4 flex items-center gap-1.5 text-blue-200">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">{profile.location_city}, {profile.location_state}</span>
          </div>
        )}
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-600">{success}</p>
        </div>
      )}

      {/* Cuenta y datos fiscales (solo lectura) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cuenta y datos fiscales</p>
        </div>
        {[
          { icon: Mail,      label: 'Correo electrónico', value: profile.email,        mono: false },
          { icon: Building2, label: 'Razón social',       value: profile.company_name, mono: false },
          { icon: FileText,  label: 'RFC',                value: profile.rfc,          mono: true },
        ].map(row => (
          <div key={row.label} className="flex items-center gap-4 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <row.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className={`text-sm font-medium text-foreground truncate mt-0.5 ${row.mono ? 'font-mono' : ''}`}>{row.value}</p>
            </div>
          </div>
        ))}
        <div className="flex items-start justify-between gap-4 px-5 py-3 bg-muted/30">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Tus facturas se validan contra este RFC, por eso estos datos no se editan aquí.
          </p>
          <Link href="/arco?derecho=rectificacion"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0">
            Solicitar corrección <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Datos editables */}
      <form onSubmit={handleSave}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Datos personales</p>
            {!editing && (
              <button type="button" onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>

          {/* Nombre */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Nombre completo</p>
              {editing ? (
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required minLength={3} maxLength={120} autoComplete="name" placeholder="Tu nombre completo"
                  className="input-field w-full text-sm" />
              ) : (
                <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
              )}
            </div>
          </div>

          {/* Celular */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Celular</p>
              {editing ? (
                <>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    type="tel" inputMode="tel" maxLength={16} autoComplete="tel" placeholder="55 1234 5678"
                    className="input-field w-full text-sm" />
                  <p className="text-[11px] text-muted-foreground mt-0.5">10 dígitos. Déjalo vacío para quitarlo.</p>
                </>
              ) : (
                <p className="text-sm font-medium text-foreground">{formatPhone(profile.phone)}</p>
              )}
            </div>
          </div>

          {/* Estado / Ciudad */}
          <div className="flex items-start gap-4 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  {editing ? (
                    <select value={form.locationState} onChange={e => setForm(f => ({ ...f, locationState: e.target.value }))}
                      required className="input-field w-full text-sm">
                      <option value="">Selecciona</option>
                      {MEXICAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{profile.location_state}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ciudad</p>
                  {editing ? (
                    <input value={form.locationCity} onChange={e => setForm(f => ({ ...f, locationCity: e.target.value }))}
                      required minLength={2} maxLength={80} placeholder="Ej. Monterrey" className="input-field w-full text-sm" />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{profile.location_city}</p>
                  )}
                </div>
              </div>
              {locationChanged && (
                <p className="flex items-start gap-1.5 text-[11px] text-amber-600 mt-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                  Tu ubicación define los premios y promociones locales que ves en el catálogo.
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mt-3">
            <X className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {editing && (
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
          </div>
        )}
      </form>

      <PasswordSection
        hasPassword={profile.has_password}
        onSaved={message => { setProfile(p => p && { ...p, has_password: true }); flash(message) }}
      />

      <SessionsSection onSaved={flash} />

      <PushSection
        enabled={profile.push_enabled}
        onChange={(enabled, message) => { setProfile(p => p && { ...p, push_enabled: enabled }); if (message) flash(message) }}
      />

      {/* ARCO */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Derechos ARCO</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Acceso, Rectificación, Cancelación u Oposición sobre tus datos personales conforme a la LFPDPPP.
              </p>
            </div>
          </div>
          <Link href="/arco"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0 mt-1">
            Solicitar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  )
}
