'use client'

import { useEffect, useState } from 'react'
import { Shield, Users, Coins, Clock, Star, FileText, Settings2, Check } from 'lucide-react'

interface StaffMember {
  id:           string
  full_name:    string
  email:        string
  company_name: string
  role:         string
  status:       string
}

const ROLE_OPTIONS = [
  { value: 'owner',    label: 'Propietario' },
  { value: 'admin',   label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
]

const ROLE_BADGE: Record<string, string> = {
  owner:    'bg-purple-100 text-purple-700',
  admin:    'bg-blue-100 text-blue-700',
  employee: 'bg-slate-100 text-slate-700',
}

const BUSINESS_RULES = [
  { icon: Coins,    label: 'Puntos por $100 MXN de factura',     env: 'POINTS_PER_AMOUNT',        unit: 'pts' },
  { icon: Clock,    label: 'Días para que expiren los puntos',   env: 'POINTS_EXPIRY_DAYS',       unit: 'días' },
  { icon: Star,     label: 'Puntos de bienvenida al registrarse', env: 'WELCOME_BONUS_POINTS',     unit: 'pts' },
  { icon: Star,     label: 'Puntos por dejar reseña con texto',  env: 'REVIEW_BONUS_POINTS',      unit: 'pts' },
  { icon: FileText, label: 'Antigüedad máxima de facturas',      env: 'INVOICE_MAX_AGE_DAYS',     unit: 'días' },
  { icon: FileText, label: 'Caracteres mínimos para bono de reseña', env: 'REVIEW_MIN_COMMENT_LENGTH', unit: 'chars' },
]

export default function SettingsPage() {
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [session, setSession]   = useState<{ role: string; id: string } | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      const [meRes, staffRes] = await Promise.all([
        fetch('/api/admin/me'),
        fetch('/api/admin/members/staff'),
      ])
      if (meRes.ok)   setSession(await meRes.json())
      if (staffRes.ok) setStaff(await staffRes.json())
      setLoading(false)
    }
    load()
  }, [])

  async function changeRole(memberId: string, newRole: string) {
    setSaving(memberId)
    const res = await fetch(`/api/admin/members/${memberId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    setSaving(null)
    if (res.ok) {
      setStaff(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      showToast('Rol actualizado correctamente.')
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.error ?? 'Error al actualizar el rol.')
    }
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestión de roles del equipo y parámetros del sistema</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Gestión de roles */}
      <section className="bg-card rounded-xl border">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Equipo interno</h2>
            <p className="text-xs text-muted-foreground">Solo el Propietario puede cambiar roles.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded w-40" />
                  <div className="h-3 bg-muted rounded w-28" />
                </div>
                <div className="h-8 bg-muted rounded w-36" />
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No hay miembros del equipo registrados.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {staff.map(m => {
              const isMe      = session?.id === m.id
              const isOwner   = m.role === 'owner'
              const canChange = !isMe && !isOwner && session?.role === 'owner'
              const initials  = m.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

              return (
                <li key={m.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-600">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.full_name}
                      {isMe && <span className="ml-2 text-[10px] font-semibold text-brand-500 uppercase tracking-wide">tú</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  {canChange ? (
                    <select
                      value={m.role}
                      disabled={saving === m.id}
                      onChange={e => changeRole(m.id, e.target.value)}
                      className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_OPTIONS.find(o => o.value === m.role)?.label ?? m.role}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Parámetros del sistema (sólo lectura) */}
      <section className="bg-card rounded-xl border">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Parámetros de negocio</h2>
            <p className="text-xs text-muted-foreground">Se configuran en las variables de entorno del servidor.</p>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {BUSINESS_RULES.map(rule => {
            const Icon = rule.icon
            return (
              <li key={rule.env} className="flex items-center gap-4 px-6 py-3.5">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground flex-1">{rule.label}</span>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {rule.env}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Sección RBAC informativa */}
      <section className="bg-card rounded-xl border">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Matriz de permisos</h2>
            <p className="text-xs text-muted-foreground">Qué puede hacer cada rol en el sistema.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Acción</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Empleado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Admin</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Propietario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Ver miembros y facturas',      true,  true,  true],
                ['Aprobar / rechazar facturas',  true,  true,  true],
                ['Gestionar catálogo',           false, true,  true],
                ['Crear invitaciones',           false, true,  true],
                ['Ver reportes y auditoría',     false, true,  true],
                ['Ajustar puntos manualmente',   false, true,  true],
                ['Cambiar roles del equipo',     false, false, true],
                ['Acceso a Configuración',       false, false, true],
              ].map(([label, emp, adm, own]) => (
                <tr key={String(label)}>
                  <td className="px-6 py-3 text-foreground">{String(label)}</td>
                  {[emp, adm, own].map((v, i) => (
                    <td key={i} className="text-center px-4 py-3">
                      {v
                        ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                        : <span className="text-muted-foreground/40">—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
