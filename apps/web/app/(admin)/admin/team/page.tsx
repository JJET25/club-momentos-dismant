'use client'

import { useEffect, useState, useRef } from 'react'
import { UserPlus, Pencil, Send, PowerOff, Power, Trash2, X } from 'lucide-react'

interface StaffMember {
  id:            string
  full_name:     string
  email:         string
  role:          string
  status:        string
  created_at:    string
  last_login_at: string | null
}

interface FormState {
  full_name: string
  email:     string
  role:      string
}

const ROLE_LABEL: Record<string, string> = {
  owner:    'Propietario',
  admin:    'Administrador',
  employee: 'Empleado',
}

const ROLE_BADGE: Record<string, string> = {
  owner:    'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-800',
  admin:    'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800',
  employee: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800',
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function relativeDate(iso: string | null) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modales ──────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, disabled }: {
  label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground
          dark:bg-white/[.06] dark:border-white/[.12]
          placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────

export default function TeamPage() {
  const [staff, setStaff]     = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe]           = useState<{ id: string; role: string } | null>(null)
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Modales
  const [showAdd, setShowAdd]   = useState(false)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<StaffMember | null>(null)
  const [confirmStatus, setConfirmStatus] = useState<{ member: StaffMember; action: 'suspend' | 'activate' } | null>(null)
  const [reasonInput, setReasonInput] = useState('')

  // Formularios
  const emptyForm: FormState = { full_name: '', email: '', role: 'employee' }
  const [addForm, setAddForm]   = useState<FormState>(emptyForm)
  const [editForm, setEditForm] = useState<Partial<FormState>>({})
  const [submitting, setSubmitting] = useState(false)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    const [meRes, staffRes] = await Promise.all([
      fetch('/api/admin/me'),
      fetch('/api/admin/members/staff'),
    ])
    if (meRes.ok)   setMe(await meRes.json())
    if (staffRes.ok) setStaff(await staffRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Crear ────────────────────────────────────────────────
  async function handleCreate() {
    if (!addForm.full_name.trim() || !addForm.email.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/admin/members/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    setSubmitting(false)
    if (res.ok) {
      const newMember = await res.json()
      setStaff(prev => [...prev, newMember])
      setShowAdd(false)
      setAddForm(emptyForm)
      showToast(`Cuenta de ${newMember.full_name} creada.`)
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.error ?? 'Error al crear la cuenta.', 'err')
    }
  }

  // ── Editar ───────────────────────────────────────────────
  async function handleEdit() {
    if (!editTarget) return
    setSubmitting(true)

    const calls: Promise<Response>[] = []

    const nameOrEmailChanged = editForm.full_name !== editTarget.full_name || editForm.email !== editTarget.email
    if (nameOrEmailChanged) {
      calls.push(fetch(`/api/admin/members/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: editForm.full_name, email: editForm.email }),
      }))
    }

    const roleChanged = editForm.role && editForm.role !== editTarget.role
    if (roleChanged) {
      calls.push(fetch(`/api/admin/members/${editTarget.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editForm.role }),
      }))
    }

    const results = await Promise.all(calls)
    setSubmitting(false)

    const failed = results.find(r => !r.ok)
    if (failed) {
      const err = await failed.json().catch(() => ({}))
      showToast(err.error ?? 'Error al actualizar.', 'err')
    } else {
      setStaff(prev => prev.map(m => m.id === editTarget.id ? { ...m, ...editForm } : m))
      setEditTarget(null)
      showToast('Información actualizada.')
    }
  }

  // ── Enviar enlace de acceso ──────────────────────────────
  async function handleSendLink(email: string, name: string) {
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) showToast(`Enlace de acceso enviado a ${name}.`)
    else        showToast('Error al enviar el enlace.', 'err')
  }

  // ── Activar / Desactivar ─────────────────────────────────
  async function handleStatusChange() {
    if (!confirmStatus) return
    const { member, action } = confirmStatus
    setSubmitting(true)
    const res = await fetch(`/api/admin/members/${member.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: action === 'suspend' ? 'suspended' : 'active',
        reason: reasonInput.trim() || 'Cambio de estado desde panel de equipo',
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      const newStatus = action === 'suspend' ? 'suspended' : 'active'
      setStaff(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus } : m))
      setConfirmStatus(null)
      setReasonInput('')
      showToast(action === 'suspend' ? `${member.full_name} desactivado.` : `${member.full_name} reactivado.`)
    } else {
      showToast('Error al cambiar el estado.', 'err')
    }
  }

  // ── Eliminar ─────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) return
    setSubmitting(true)
    const res = await fetch(`/api/admin/members/${confirmDelete.id}`, { method: 'DELETE' })
    setSubmitting(false)
    if (res.ok) {
      setStaff(prev => prev.filter(m => m.id !== confirmDelete.id))
      setConfirmDelete(null)
      showToast('Cuenta eliminada.')
    } else {
      const err = await res.json().catch(() => ({}))
      if (err.canDeactivate) {
        showToast(err.error, 'err')
        setConfirmDelete(null)
        // Ofrecer desactivar en lugar de eliminar
        setConfirmStatus({ member: confirmDelete, action: 'suspend' })
      } else {
        showToast(err.error ?? 'Error al eliminar.', 'err')
      }
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg transition-all
          ${toast.type === 'ok' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona las cuentas del equipo interno</p>
        </div>
        {me?.role === 'owner' && (
          <button
            onClick={() => { setAddForm(emptyForm); setShowAdd(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Agregar miembro
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-36" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
                <div className="h-6 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No hay miembros del equipo registrados.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Miembro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Último acceso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.map(m => {
                const isMe      = m.id === me?.id
                const isOwner   = m.role === 'owner'
                const canEdit   = !isMe && !isOwner && me?.role === 'owner'

                return (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    {/* Nombre + email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{initials(m.full_name)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground leading-none">
                            {m.full_name}
                            {isMe && <span className="ml-2 text-[10px] font-semibold text-brand-500 uppercase tracking-wide">tú</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">{m.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                        {ROLE_LABEL[m.role] ?? m.role}
                      </span>
                    </td>

                    {/* Último acceso */}
                    <td className="px-4 py-4">
                      <span className="text-xs text-muted-foreground">{relativeDate(m.last_login_at)}</span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full
                        ${m.status === 'active'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                        {m.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Enviar enlace */}
                        <button
                          onClick={() => handleSendLink(m.email, m.full_name)}
                          title="Enviar enlace de acceso"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {/* Editar */}
                        {canEdit && (
                          <button
                            onClick={() => { setEditTarget(m); setEditForm({ full_name: m.full_name, email: m.email, role: m.role }) }}
                            title="Editar"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Activar / Desactivar */}
                        {canEdit && (
                          <button
                            onClick={() => { setReasonInput(''); setConfirmStatus({ member: m, action: m.status === 'active' ? 'suspend' : 'activate' }) }}
                            title={m.status === 'active' ? 'Desactivar' : 'Reactivar'}
                            className={`p-1.5 rounded-lg transition-colors
                              ${m.status === 'active'
                                ? 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                          >
                            {m.status === 'active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Eliminar */}
                        {canEdit && (
                          <button
                            onClick={() => setConfirmDelete(m)}
                            title="Eliminar cuenta"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Agregar ────────────────────────── */}
      {showAdd && (
        <Modal title="Agregar miembro del equipo" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <Field label="Nombre completo" value={addForm.full_name} onChange={v => setAddForm(p => ({ ...p, full_name: v }))} placeholder="Ej. María González" />
            <Field label="Correo electrónico" type="email" value={addForm.email} onChange={v => setAddForm(p => ({ ...p, email: v }))} placeholder="correo@dismant.com" />
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rol</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}
                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground dark:bg-white/[.06] dark:border-white/[.12] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="employee">Empleado — puede ver miembros y aprobar facturas</option>
                <option value="admin">Administrador — acceso completo excepto roles</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5">
              Se creará la cuenta inmediatamente. Usa el botón <strong>Enviar enlace</strong> para que el miembro pueda ingresar por primera vez.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !addForm.full_name.trim() || !addForm.email.trim()}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Editar ─────────────────────────── */}
      {editTarget && (
        <Modal title="Editar miembro" onClose={() => setEditTarget(null)}>
          <div className="space-y-4">
            <Field label="Nombre completo" value={editForm.full_name ?? ''} onChange={v => setEditForm(p => ({ ...p, full_name: v }))} />
            <Field label="Correo electrónico" type="email" value={editForm.email ?? ''} onChange={v => setEditForm(p => ({ ...p, email: v }))} />
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rol</label>
              <select
                value={editForm.role ?? 'employee'}
                onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground dark:bg-white/[.06] dark:border-white/[.12] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar desactivar/activar ───── */}
      {confirmStatus && (
        <Modal
          title={confirmStatus.action === 'suspend' ? 'Desactivar cuenta' : 'Reactivar cuenta'}
          onClose={() => setConfirmStatus(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {confirmStatus.action === 'suspend'
                ? `${confirmStatus.member.full_name} no podrá iniciar sesión hasta que se reactive la cuenta.`
                : `${confirmStatus.member.full_name} recuperará el acceso al panel.`}
            </p>
            {confirmStatus.action === 'suspend' && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Razón (opcional)</label>
                <input
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder="Ej. Fin de contrato, baja temporal…"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground dark:bg-white/[.06] dark:border-white/[.12] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmStatus(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={submitting}
                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50
                  ${confirmStatus.action === 'suspend' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {submitting ? 'Procesando…' : confirmStatus.action === 'suspend' ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirmar eliminar ──────────────── */}
      {confirmDelete && (
        <Modal title="Eliminar cuenta" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
              Esta acción es irreversible. Si la cuenta tiene actividad registrada, el sistema te pedirá desactivarla en su lugar.
            </div>
            <p className="text-sm text-muted-foreground">
              ¿Eliminar la cuenta de <strong>{confirmDelete.full_name}</strong>?
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
