'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  User, Mail, MapPin, Edit2, Check, X, Shield, ChevronRight,
  Building2, FileText, Phone, KeyRound, Eye, EyeOff,
} from 'lucide-react'
import { MEXICAN_STATES } from '@dismant/types'

interface Profile {
  id: string; full_name: string; email: string
  company_name: string; rfc: string
  location_state: string; location_city: string
  phone: string | null; created_at: string
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="input-field w-full text-sm pr-10" />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    fullName: '', locationState: '', locationCity: '',
    phone: '', companyName: '', rfc: '',
  })

  // Cambiar contraseña
  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError]   = useState('')

  useEffect(() => {
    fetch('/api/client/profile')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(({ profile: p }) => {
        setProfile(p)
        setForm({
          fullName:      p.full_name,
          locationState: p.location_state,
          locationCity:  p.location_city,
          phone:         p.phone ?? '',
          companyName:   p.company_name,
          rfc:           p.rfc,
        })
      })
      .catch(() => setError('No se pudo cargar el perfil. Recarga la página.'))
      .finally(() => setLoading(false))
  }, [])

  function startEdit() { setEditing(true); setSuccess(''); setError('') }
  function cancelEdit() {
    if (!profile) return
    setForm({
      fullName: profile.full_name, locationState: profile.location_state,
      locationCity: profile.location_city, phone: profile.phone ?? '',
      companyName: profile.company_name, rfc: profile.rfc,
    })
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
    if (!res.ok) { const { error: msg } = await res.json(); setError(msg ?? 'Error al guardar'); return }
    const { profile: updated } = await res.json()
    setProfile(updated); setEditing(false); setSuccess('Perfil actualizado correctamente.')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return }
    if (pwForm.newPw.length < 8) { setPwError('Mínimo 8 caracteres'); return }
    setPwSaving(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
    })
    setPwSaving(false)
    if (!res.ok) { const { error: msg } = await res.json(); setPwError(msg ?? 'Error al cambiar contraseña'); return }
    setPwForm({ current: '', newPw: '', confirm: '' })
    setSuccess('Contraseña actualizada correctamente.')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <div className="max-w-xl space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-32 mb-2" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-36 bg-muted rounded-xl" />
      </div>
    )
  }
  if (!profile) return null

  const initials = getInitials(profile.full_name)

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

      {/* Correo (solo lectura) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cuenta</p>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Correo electrónico</p>
            <p className="text-sm font-medium text-foreground truncate mt-0.5">{profile.email}</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">No se puede cambiar</p>
          </div>
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

          {[
            {
              icon: User, label: 'Nombre completo', key: 'fullName' as const,
              value: profile.full_name, type: 'text', placeholder: 'Tu nombre completo', note: null,
            },
            {
              icon: Building2, label: 'Empresa', key: 'companyName' as const,
              value: profile.company_name, type: 'text', placeholder: 'Empresa S.A. de C.V.', note: null,
            },
            {
              icon: FileText, label: 'RFC', key: 'rfc' as const,
              value: profile.rfc, type: 'text', placeholder: 'RFC fiscal', note: 'Afecta la validación de facturas',
            },
            {
              icon: Phone, label: 'Celular', key: 'phone' as const,
              value: profile.phone ?? '—', type: 'tel', placeholder: '55 1234 5678', note: null,
            },
          ].map((row, i, arr) => (
            <div key={row.key} className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <row.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">{row.label}</p>
                {editing ? (
                  <input value={form[row.key]} onChange={e => setForm(f => ({ ...f, [row.key]: row.key === 'rfc' ? e.target.value.toUpperCase() : e.target.value }))}
                    type={row.type} placeholder={row.placeholder}
                    className={`input-field w-full text-sm ${row.key === 'rfc' ? 'font-mono' : ''}`} />
                ) : (
                  <p className={`text-sm font-medium text-foreground ${row.key === 'rfc' ? 'font-mono' : ''}`}>{row.value}</p>
                )}
                {editing && row.note && (
                  <p className="text-[11px] text-amber-600 mt-0.5">⚠ {row.note}</p>
                )}
              </div>
            </div>
          ))}

          {/* Estado / Ciudad */}
          <div className="flex items-center gap-4 px-5 py-4 border-t border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
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
                    required placeholder="Ej. Monterrey" className="input-field w-full text-sm" />
                ) : (
                  <p className="text-sm font-medium text-foreground">{profile.location_city}</p>
                )}
              </div>
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

      {/* Cambiar contraseña */}
      <form onSubmit={handleChangePassword}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Seguridad</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Cambiar contraseña</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Contraseña actual</label>
              <PasswordInput value={pwForm.current} onChange={v => setPwForm(f => ({ ...f, current: v }))} placeholder="Tu contraseña actual" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nueva contraseña</label>
              <PasswordInput value={pwForm.newPw} onChange={v => setPwForm(f => ({ ...f, newPw: v }))} placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Confirmar nueva contraseña</label>
              <PasswordInput value={pwForm.confirm} onChange={v => setPwForm(f => ({ ...f, confirm: v }))} placeholder="Repite la nueva contraseña" />
            </div>
            {pwError && (
              <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{pwError}</p>
              </div>
            )}
            <button type="submit" disabled={pwSaving || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors mt-1">
              {pwSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {pwSaving ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
      </form>

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
