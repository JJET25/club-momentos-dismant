'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, Edit2, Mail, Phone, ShieldCheck, User, X } from 'lucide-react'
import { getBrand } from '@/lib/brand'
import { ProfileSkeleton } from '@/components/page-skeletons'
import { PasswordSection, SessionsSection } from '@/components/account/password-section'

interface Account {
  id: string; full_name: string; email: string; phone: string | null
  created_at: string; last_login_at: string | null
  has_password: boolean; role: string; affiliates: string[]
}

const ROLE_LABEL: Record<string, string> = {
  owner:      'Propietario',
  admin:      'Administrador',
  team_admin: 'Admin. de equipo',
  employee:   'Empleado',
}

function formatPhone(phone: string | null) {
  if (!phone) return '—'
  return phone.length === 10 ? `${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}` : phone
}

export default function AccountPage() {
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm]       = useState({ fullName: '', phone: '' })

  useEffect(() => {
    fetch('/api/admin/me/profile')
      .then(async r => { if (!r.ok) throw new Error(); return r.json() })
      .then(({ account: a }) => { setAccount(a); setForm({ fullName: a.full_name, phone: a.phone ?? '' }) })
      .catch(() => setError('No se pudo cargar tu cuenta. Recarga la página.'))
      .finally(() => setLoading(false))
  }, [])

  function flash(message: string) {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3000)
  }

  function cancelEdit() {
    if (account) setForm({ fullName: account.full_name, phone: account.phone ?? '' })
    setEditing(false); setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { const { error: msg } = await res.json().catch(() => ({})); setError(msg ?? 'Error al guardar'); return }
    const { account: updated } = await res.json()
    const nameChanged = updated.full_name !== account?.full_name
    setAccount(a => a && { ...a, ...updated })
    setForm({ fullName: updated.full_name, phone: updated.phone ?? '' })
    setEditing(false)
    flash('Datos actualizados correctamente.')
    if (nameChanged) router.refresh() // el sidebar lee el nombre de la sesión
  }

  if (loading) return <ProfileSkeleton />
  if (!account) {
    return (
      <div className="max-w-xl flex items-center gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
        <X className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm text-red-600">{error || 'No se pudo cargar tu cuenta.'}</p>
      </div>
    )
  }

  const isGlobal = account.role === 'owner' || account.role === 'admin'

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">Tus datos personales y la contraseña con la que entras al panel.</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-600">{success}</p>
        </div>
      )}

      {/* Acceso (solo lectura) */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acceso</p>
        </div>
        {[
          { icon: Mail,        label: 'Correo electrónico', value: account.email },
          { icon: ShieldCheck, label: 'Rol',                value: ROLE_LABEL[account.role] ?? account.role },
          {
            icon: Building2, label: 'Empresas',
            value: isGlobal ? 'Todas (vista Global)' : account.affiliates.map(a => getBrand(a).name).join(' y ') || '—',
          },
        ].map(row => (
          <div key={row.label} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <row.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">{row.value}</p>
            </div>
          </div>
        ))}
        <p className="px-5 py-3 bg-muted/30 text-[11px] text-muted-foreground">
          El correo, el rol y las empresas los administra el Propietario desde Equipo.
        </p>
      </div>

      {/* Datos personales */}
      <form onSubmit={handleSave}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Datos personales</p>
            {!editing && (
              <button type="button" onClick={() => { setEditing(true); setError(''); setSuccess('') }}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Nombre completo</p>
              {editing ? (
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required minLength={3} maxLength={120} autoComplete="name" className="input-field w-full text-sm" />
              ) : (
                <p className="text-sm font-medium text-foreground">{account.full_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
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
                <p className="text-sm font-medium text-foreground">{formatPhone(account.phone)}</p>
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
        hasPassword={account.has_password}
        onSaved={message => { setAccount(a => a && { ...a, has_password: true }); flash(message) }}
      />

      <SessionsSection onSaved={flash} />
    </div>
  )
}
