'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MEXICAN_STATES } from '@dismant/types'

interface Profile {
  id: string
  full_name: string
  email: string
  company_name: string
  rfc: string
  location_state: string
  location_city: string
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ fullName: '', locationState: '', locationCity: '' })

  useEffect(() => {
    fetch('/api/client/profile')
      .then(r => r.json())
      .then(({ profile: p }) => {
        setProfile(p)
        setForm({ fullName: p.full_name, locationState: p.location_state, locationCity: p.location_city })
      })
      .finally(() => setLoading(false))
  }, [])

  function startEdit() {
    setEditing(true)
    setSuccess(false)
    setError('')
  }

  function cancelEdit() {
    if (!profile) return
    setForm({ fullName: profile.full_name, locationState: profile.location_state, locationCity: profile.location_city })
    setEditing(false)
    setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/client/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Error al guardar')
      return
    }

    const { profile: updated } = await res.json()
    setProfile(updated)
    setEditing(false)
    setSuccess(true)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Miembro desde {formatDate(profile.created_at)}</p>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
          Perfil actualizado correctamente.
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-card rounded-xl border divide-y divide-border">

          {/* Nombre — editable */}
          <div className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Nombre completo</p>
              {editing ? (
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required
                  className="input-field"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
              )}
            </div>
          </div>

          {/* Email — no editable */}
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground mb-1">Correo electrónico</p>
            <p className="text-sm font-medium text-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">No editable — es tu llave de acceso</p>
          </div>

          {/* Empresa — no editable */}
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground mb-1">Empresa</p>
            <p className="text-sm font-medium text-foreground">{profile.company_name}</p>
          </div>

          {/* RFC — no editable */}
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground mb-1">RFC</p>
            <p className="text-sm font-medium text-foreground font-mono">{profile.rfc}</p>
            <p className="text-xs text-muted-foreground mt-0.5">No editable — es tu llave de identidad fiscal</p>
          </div>

          {/* Estado — editable */}
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground mb-1">Estado</p>
            {editing ? (
              <select
                value={form.locationState}
                onChange={e => setForm(f => ({ ...f, locationState: e.target.value }))}
                required
                className="input-field"
              >
                <option value="">Selecciona tu estado</option>
                {MEXICAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <p className="text-sm font-medium text-foreground">{profile.location_state}</p>
            )}
          </div>

          {/* Ciudad — editable */}
          <div className="px-6 py-4">
            <p className="text-xs text-muted-foreground mb-1">Ciudad</p>
            {editing ? (
              <input
                type="text"
                value={form.locationCity}
                onChange={e => setForm(f => ({ ...f, locationCity: e.target.value }))}
                placeholder="Ej. Monterrey"
                required
                className="input-field"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">{profile.location_city}</p>
            )}
          </div>

        </div>

        {error && (
          <p className="text-sm text-destructive mt-3">{error}</p>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3 mt-4">
          {editing ? (
            <>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" onClick={startEdit} className="btn-primary">
              Editar perfil
            </button>
          )}
        </div>
      </form>

      {/* Link ARCO */}
      <div className="bg-muted/50 rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Derechos ARCO</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición sobre tus datos personales conforme a la LFPDPPP.
        </p>
        <Link href="/arco" className="text-sm text-primary hover:underline font-medium">
          Enviar solicitud ARCO →
        </Link>
      </div>
    </div>
  )
}
