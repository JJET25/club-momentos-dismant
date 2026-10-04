'use client'

import { useState } from 'react'
import { KeyRound, Eye, EyeOff, X, MonitorSmartphone } from 'lucide-react'

function PasswordInput({ value, onChange, placeholder, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete} className="input-field w-full text-sm pr-10" />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

/**
 * Sección "Seguridad" de la configuración de cuenta. Si la cuenta aún no
 * tiene contraseña (entró solo con enlace mágico) permite establecerla;
 * si ya tiene, pide la actual para cambiarla.
 */
export function PasswordSection({ hasPassword, onSaved }: {
  hasPassword: boolean
  onSaved: (message: string) => void
}) {
  const [form, setForm]     = useState({ current: '', newPw: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.newPw !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.newPw.length < 8) { setError('Mínimo 8 caracteres'); return }
    setSaving(true)
    const res = hasPassword
      ? await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPw }),
        })
      : await fetch('/api/auth/set-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: form.newPw }),
        })
    setSaving(false)
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({}))
      setError(msg ?? 'Error al guardar la contraseña')
      return
    }
    setForm({ current: '', newPw: '', confirm: '' })
    onSaved(hasPassword ? 'Contraseña actualizada correctamente.' : 'Contraseña establecida. Ya puedes iniciar sesión con ella.')
  }

  const incomplete = (hasPassword && !form.current) || !form.newPw || !form.confirm

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Seguridad</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{hasPassword ? 'Cambiar contraseña' : 'Establecer contraseña'}</p>
            </div>
            {!hasPassword && (
              <p className="text-xs text-muted-foreground mt-1">
                Hoy entras con enlace o código por correo. Crea una contraseña para iniciar sesión más rápido.
              </p>
            )}
          </div>
          {hasPassword && (
            <div>
              <label className="text-xs text-muted-foreground">Contraseña actual</label>
              <PasswordInput value={form.current} onChange={v => setForm(f => ({ ...f, current: v }))}
                placeholder="Tu contraseña actual" autoComplete="current-password" />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Nueva contraseña</label>
            <PasswordInput value={form.newPw} onChange={v => setForm(f => ({ ...f, newPw: v }))}
              placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Confirmar nueva contraseña</label>
            <PasswordInput value={form.confirm} onChange={v => setForm(f => ({ ...f, confirm: v }))}
              placeholder="Repite la nueva contraseña" autoComplete="new-password" />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <button type="submit" disabled={saving || incomplete}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors mt-1">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Guardando…' : hasPassword ? 'Actualizar contraseña' : 'Crear contraseña'}
          </button>
        </div>
      </div>
    </form>
  )
}

/** "Cerrar sesión en los demás dispositivos": revoca todas menos la actual. */
export function SessionsSection({ onSaved }: { onSaved: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function revokeOthers() {
    setSaving(true); setError('')
    const res = await fetch('/api/auth/sessions', { method: 'DELETE' })
    setSaving(false); setConfirming(false)
    if (!res.ok) { setError('No se pudieron cerrar las sesiones. Intenta de nuevo.'); return }
    onSaved('Cerraste la sesión en todos los demás dispositivos.')
  }

  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Sesiones abiertas</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Cierra tu sesión en cualquier otro navegador o dispositivo. Cambiar tu contraseña también lo hace.
            </p>
          </div>
        </div>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0 mt-1">
            Cerrar otras
          </button>
        )}
      </div>
      {confirming && (
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={revokeOthers} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Sí, cerrar las demás sesiones
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={saving}
            className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50">
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
