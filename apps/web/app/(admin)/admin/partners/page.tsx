'use client'

import { useEffect, useState } from 'react'
import { Handshake, Plus, Pencil, PowerOff, Power, Trash2, X, BadgeCheck } from 'lucide-react'

interface Partner {
  id:          string
  name:        string
  logo_url:    string | null
  is_verified: boolean
  status:      string
}

interface FormState {
  name:        string
  logo_url:    string
  is_verified: boolean
}

const EMPTY_FORM: FormState = { name: '', logo_url: '', is_verified: false }

// ── Modal genérico ────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md border border-border" onClick={e => e.stopPropagation()}>
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

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-foreground
          dark:bg-white/[.06] dark:border-white/[.12]
          placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
    </div>
  )
}

function PartnerForm({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Nombre" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Nombre del aliado/socio" />
      <Field label="Logo (URL)" value={form.logo_url} onChange={v => setForm({ ...form, logo_url: v })} placeholder="https://…" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_verified}
          onChange={e => setForm({ ...form, is_verified: e.target.checked })}
          className="w-4 h-4 accent-brand-600"
        />
        <span className="text-sm text-foreground">Aliado verificado</span>
      </label>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading]   = useState(true)
  const [me, setMe]             = useState<{ role: string } | null>(null)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const [showAdd, setShowAdd]             = useState(false)
  const [editTarget, setEditTarget]       = useState<Partner | null>(null)
  const [confirmStatus, setConfirmStatus] = useState<{ partner: Partner; action: 'suspend' | 'activate' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Partner | null>(null)

  const [addForm, setAddForm]   = useState<FormState>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    const [meRes, partnersRes] = await Promise.all([
      fetch('/api/admin/me'),
      fetch('/api/admin/partners'),
    ])
    if (meRes.ok) setMe(await meRes.json())
    if (partnersRes.ok) { const d = await partnersRes.json(); setPartners(d.partners ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!addForm.name.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/admin/partners', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addForm.name.trim(), logo_url: addForm.logo_url.trim() || null, is_verified: addForm.is_verified }),
    })
    setSubmitting(false)
    if (res.ok) {
      const { partner } = await res.json()
      setPartners(prev => [...prev, partner].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
      showToast(`Aliado "${partner.name}" creado.`)
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.error ?? 'Error al crear el aliado.', 'err')
    }
  }

  async function handleEdit() {
    if (!editTarget) return
    setSubmitting(true)
    const res = await fetch(`/api/admin/partners/${editTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name.trim(), logo_url: editForm.logo_url.trim() || null, is_verified: editForm.is_verified }),
    })
    setSubmitting(false)
    if (res.ok) {
      const { partner } = await res.json()
      setPartners(prev => prev.map(p => p.id === partner.id ? partner : p))
      setEditTarget(null)
      showToast('Aliado actualizado.')
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.error ?? 'Error al actualizar.', 'err')
    }
  }

  async function handleStatusChange() {
    if (!confirmStatus) return
    const { partner, action } = confirmStatus
    const status = action === 'suspend' ? 'suspended' : 'active'
    setSubmitting(true)
    const res = await fetch(`/api/admin/partners/${partner.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setSubmitting(false)
    if (res.ok) {
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status } : p))
      setConfirmStatus(null)
      showToast(action === 'suspend' ? `${partner.name} suspendido.` : `${partner.name} reactivado.`)
    } else {
      showToast('Error al cambiar el estado.', 'err')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setSubmitting(true)
    const res = await fetch(`/api/admin/partners/${confirmDelete.id}`, { method: 'DELETE' })
    setSubmitting(false)
    if (res.ok) {
      setPartners(prev => prev.filter(p => p.id !== confirmDelete.id))
      setConfirmDelete(null)
      showToast('Aliado eliminado.')
    } else {
      const err = await res.json().catch(() => ({}))
      if (err.canSuspend) {
        showToast(err.error, 'err')
        setConfirmDelete(null)
        setConfirmStatus({ partner: confirmDelete, action: 'suspend' })
      } else {
        showToast(err.error ?? 'Error al eliminar.', 'err')
      }
    }
  }

  const isOwner = me?.role === 'owner'

  return (
    <div className="space-y-6">

      {toast && (
        <div className={`fixed top-6 right-6 z-50 text-sm px-4 py-3 rounded-xl shadow-lg transition-all
          ${toast.type === 'ok' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aliados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los aliados/socios disponibles para promociones y catálogo.
          </p>
        </div>
        <button
          onClick={() => { setAddForm(EMPTY_FORM); setShowAdd(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo aliado
        </button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-36" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="py-16 text-center">
            <Handshake className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No hay aliados registrados.</p>
            <p className="text-xs text-muted-foreground">Crea el primero para poder asignarlo a una promoción.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Aliado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partners.map(p => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt="" className="w-9 h-9 rounded-full object-contain bg-muted shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.name[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none flex items-center gap-1.5">
                          {p.name}
                          {p.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full
                      ${p.status === 'active'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                      {p.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditTarget(p); setEditForm({ name: p.name, logo_url: p.logo_url ?? '', is_verified: p.is_verified }) }}
                        title="Editar"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setConfirmStatus({ partner: p, action: p.status === 'active' ? 'suspend' : 'activate' })}
                        title={p.status === 'active' ? 'Suspender' : 'Reactivar'}
                        className={`p-1.5 rounded-lg transition-colors
                          ${p.status === 'active'
                            ? 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            : 'text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                      >
                        {p.status === 'active' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      </button>

                      {isOwner && (
                        <button
                          onClick={() => setConfirmDelete(p)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <Modal title="Nuevo aliado" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <PartnerForm form={addForm} setForm={setAddForm} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !addForm.name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creando…' : 'Crear aliado'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal title="Editar aliado" onClose={() => setEditTarget(null)}>
          <div className="space-y-4">
            <PartnerForm form={editForm} setForm={setEditForm} />
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting || !editForm.name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmStatus && (
        <Modal
          title={confirmStatus.action === 'suspend' ? 'Suspender aliado' : 'Reactivar aliado'}
          onClose={() => setConfirmStatus(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {confirmStatus.action === 'suspend'
                ? `${confirmStatus.partner.name} dejará de estar disponible para nuevas promociones. Las promociones existentes no se ven afectadas.`
                : `${confirmStatus.partner.name} volverá a estar disponible para nuevas promociones.`}
            </p>
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
                {submitting ? 'Procesando…' : confirmStatus.action === 'suspend' ? 'Suspender' : 'Reactivar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Eliminar aliado" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
              Esta acción es irreversible. Si el aliado tiene promociones registradas, el sistema te pedirá suspenderlo en su lugar.
            </div>
            <p className="text-sm text-muted-foreground">
              ¿Eliminar a <strong>{confirmDelete.name}</strong>?
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
