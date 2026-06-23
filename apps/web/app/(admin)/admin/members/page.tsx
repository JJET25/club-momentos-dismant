'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Check, X } from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────

interface Member {
  id:             string
  full_name:      string
  company_name:   string | null
  rfc:            string
  location_city:  string | null
  location_state: string | null
  status:         string
  created_at:     string
  balance:        number
  invoiceCount:   number
}

interface MemberDetail {
  member:      Member & { email: string; company_name: string | null }
  balance:     number
  ledger:      { id: string; type: string; points: number; balance_after: number; description: string | null; created_at: string }[]
  redemptions: { id: string; points_spent: number; status: string; created_at: string; reward_skus: { name: string } | null }[]
  invoices:    { id: string; uuid_cfdi: string; total_mxn: number; status: string; created_at: string }[]
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  active:    { label: 'Activo',    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  suspended: { label: 'Suspendido', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtPts(n: number) {
  return (n > 0 ? '+' : '') + n.toLocaleString('es-MX') + ' pts'
}

// ── Modal de detalle ──────────────────────────────────────────

function MemberDetailModal({ detail, onClose, onUpdated, currentUserRole }: {
  detail: MemberDetail
  onClose: () => void
  onUpdated: () => void
  currentUserRole: string
}) {
  const [tab, setTab]         = useState<'ledger' | 'invoices' | 'canjes'>('ledger')
  const [adjustPts, setAdjustPts] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting]       = useState(false)
  const [adjustError, setAdjustError]   = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspending, setSuspending]       = useState(false)
  const [roleChanging, setRoleChanging]   = useState(false)
  const [roleTarget, setRoleTarget]       = useState('')
  const [roleError, setRoleError]         = useState('')

  const { member, balance } = detail
  const st = STATUS_CFG[member.status] ?? STATUS_CFG.active

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleAdjust() {
    const pts = parseInt(adjustPts)
    if (!pts || !adjustReason.trim()) return
    setAdjusting(true); setAdjustError('')
    const res = await fetch(`/api/admin/members/${member.id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: pts, reason: adjustReason.trim() }),
    })
    setAdjusting(false)
    if (!res.ok) {
      const d = await res.json()
      setAdjustError(d.error ?? 'Error al ajustar puntos')
      return
    }
    setAdjustPts(''); setAdjustReason('')
    onUpdated()
    onClose()
  }

  async function handleStatus(newStatus: string) {
    if (newStatus === 'suspended' && !suspendReason.trim()) return
    setSuspending(true)
    await fetch(`/api/admin/members/${member.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, reason: suspendReason.trim() }),
    })
    setSuspending(false)
    onUpdated()
    onClose()
  }

  async function handleRoleChange() {
    if (!roleTarget) return
    setRoleChanging(true); setRoleError('')
    const res = await fetch(`/api/admin/members/${member.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRole: roleTarget }),
    })
    setRoleChanging(false)
    if (!res.ok) { const d = await res.json(); setRoleError(d.error ?? 'Error'); return }
    onUpdated(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">{member.full_name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>{st.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{member.email} · RFC: {member.rfc} · {member.company_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{balance.toLocaleString('es-MX')} pts</p>
              <p className="text-xs text-muted-foreground">saldo actual</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b shrink-0">
          {(['ledger', 'invoices', 'canjes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'ledger' ? 'Movimientos' : t === 'invoices' ? 'Facturas' : 'Canjes'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {tab === 'ledger' && (
            <>
              {detail.ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin movimientos.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground uppercase border-b">
                      <th className="pb-2">Fecha</th><th className="pb-2">Tipo</th>
                      <th className="pb-2">Descripción</th>
                      <th className="pb-2 text-right">Puntos</th>
                      <th className="pb-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.ledger.map(e => (
                      <tr key={e.id} className="py-2">
                        <td className="py-2 text-muted-foreground">{fmtDate(e.created_at)}</td>
                        <td className="py-2 capitalize">{e.type.replace('_', ' ')}</td>
                        <td className="py-2 text-muted-foreground truncate max-w-[140px]">{e.description ?? '—'}</td>
                        <td className={`py-2 text-right font-semibold ${e.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {fmtPts(e.points)}
                        </td>
                        <td className="py-2 text-right font-medium">{e.balance_after.toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Ajuste manual de puntos */}
              <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                <p className="text-xs font-semibold text-foreground">Ajuste manual de puntos</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Ej: 100 o -50"
                    value={adjustPts}
                    onChange={e => setAdjustPts(e.target.value)}
                    className="input-field text-sm py-2 w-36"
                  />
                  <input
                    type="text"
                    placeholder="Razón del ajuste (obligatorio)"
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    className="input-field text-sm py-2 flex-1"
                  />
                  <button
                    onClick={handleAdjust}
                    disabled={adjusting || !adjustPts || !adjustReason.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  >
                    {adjusting ? '…' : 'Aplicar'}
                  </button>
                </div>
                {adjustError && <p className="text-xs text-red-600">{adjustError}</p>}
              </div>
            </>
          )}

          {tab === 'invoices' && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground uppercase border-b">
                  <th className="pb-2">UUID</th><th className="pb-2">Total</th>
                  <th className="pb-2">Fecha</th><th className="pb-2">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.invoices.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Sin facturas.</td></tr>
                ) : detail.invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2 font-mono">{inv.uuid_cfdi.slice(0, 8)}…</td>
                    <td className="py-2">${Number(inv.total_mxn).toLocaleString('es-MX')}</td>
                    <td className="py-2 text-muted-foreground">{fmtDate(inv.created_at)}</td>
                    <td className="py-2 capitalize">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'canjes' && (
            <div className="space-y-2">
              {detail.redemptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin canjes.</p>
              ) : detail.redemptions.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm border rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium">{r.reward_skus?.name ?? 'Premio'}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)} · {r.points_spent} pts</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — suspender/reactivar + cambiar rol */}
        <div className="px-6 py-4 border-t shrink-0 bg-muted/20 space-y-3">
          {member.status === 'active' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Razón de suspensión"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                className="input-field text-sm py-2 flex-1"
              />
              <button
                onClick={() => handleStatus('suspended')}
                disabled={suspending || !suspendReason.trim()}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Suspender cuenta
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleStatus('active')}
              disabled={suspending}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Reactivar cuenta
            </button>
          )}

          {/* Cambiar rol — solo owner, solo para admin/employee */}
          {currentUserRole === 'owner' && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Cambiar rol del usuario interno</p>
              <div className="flex items-center gap-2">
                <select
                  value={roleTarget}
                  onChange={e => setRoleTarget(e.target.value)}
                  className="input-field text-sm py-2 flex-1"
                >
                  <option value="">Seleccionar nuevo rol…</option>
                  <option value="admin">Administrador</option>
                  <option value="employee">Empleado</option>
                </select>
                <button
                  onClick={handleRoleChange}
                  disabled={roleChanging || !roleTarget}
                  className="px-4 py-2 rounded-lg border border-orange-200 text-orange-700 text-sm font-medium hover:bg-orange-50 disabled:opacity-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
                >
                  {roleChanging ? '…' : 'Cambiar rol'}
                </button>
              </div>
              {roleError && <p className="text-xs text-red-600 mt-1">{roleError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal de carga masiva de puntos (US-029) ──────────────────

type BulkRow = { line: number; rfc: string; puntos: number; razon: string; name: string | null; error: string | null }

function BulkPointsModal({ onClose }: { onClose: () => void }) {
  const [file, setFile]       = useState<File | null>(null)
  const [preview, setPreview] = useState<BulkRow[] | null>(null)
  const [result, setResult]   = useState<{ processed: number; skipped: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function downloadTemplate() {
    const csv  = 'rfc,puntos,razon\nDIMXXXXXX001,500,Liquidación Q1\nDIMXXXXXX002,-100,Ajuste por error\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'plantilla-puntos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handlePreview() {
    if (!file) return
    setLoading(true); setError('')
    const form = new FormData(); form.append('csv', file)
    const res  = await fetch('/api/admin/members/bulk-points', { method: 'POST', body: form })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    const { preview: rows, parseErrors } = await res.json()
    if (parseErrors?.length) { setError(parseErrors[0]); return }
    setPreview(rows)
  }

  async function handleConfirm() {
    if (!file) return
    setLoading(true); setError('')
    const form = new FormData(); form.append('csv', file); form.append('confirm', 'true')
    const res  = await fetch('/api/admin/members/bulk-points', { method: 'POST', body: form })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    const { processed, skipped } = await res.json()
    setResult({ processed, skipped })
  }

  const validRows = preview?.filter(r => !r.error) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Carga masiva de puntos</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="font-semibold text-lg">{result.processed} registros procesados</p>
            {result.skipped > 0 && <p className="text-sm text-muted-foreground mt-1">{result.skipped} omitidos por errores</p>}
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Cerrar</button>
          </div>
        ) : preview ? (
          <>
            <p className="text-sm text-muted-foreground">
              {validRows.length} de {preview.length} filas válidas. Revisa antes de confirmar.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/30">{['RFC','Pts','Razón','Nombre','Estado'].map(h=><th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {preview.map(r => (
                    <tr key={r.line} className={`border-t ${r.error ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                      <td className="px-3 py-2 font-mono">{r.rfc}</td>
                      <td className={`px-3 py-2 font-semibold ${r.puntos > 0 ? 'text-green-700' : 'text-red-600'}`}>{r.puntos > 0 ? '+':''}{r.puntos}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.razon}</td>
                      <td className="px-3 py-2">{r.name ?? '—'}</td>
                      <td className="px-3 py-2">{r.error ? <X className="w-3.5 h-3.5 text-red-500" /> : <Check className="w-3.5 h-3.5 text-green-600" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted/50">Cambiar archivo</button>
              <button onClick={handleConfirm} disabled={loading || validRows.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
                {loading ? 'Procesando…' : `Confirmar (${validRows.length} filas)`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Columnas requeridas: <code className="font-mono bg-muted px-1 rounded">rfc, puntos, razon</code></p>
              <button onClick={downloadTemplate} className="text-xs text-primary hover:underline">Descargar plantilla</button>
            </div>
            <input type="file" accept=".csv,.txt" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-muted file:text-foreground file:text-xs file:font-medium hover:file:bg-muted/80 cursor-pointer" />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button onClick={handlePreview} disabled={!file || loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
              {loading ? 'Cargando…' : 'Previsualizar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function MembersPage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [detail, setDetail]     = useState<MemberDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => setCurrentUserRole(d.role ?? ''))
  }, [])

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    const res = await fetch(`/api/admin/members${params}`)
    if (res.ok) {
      const { members: data } = await res.json()
      setMembers(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search, load])

  async function openDetail(id: string) {
    setLoadingDetail(true)
    const res = await fetch(`/api/admin/members/${id}`)
    if (res.ok) setDetail(await res.json())
    setLoadingDetail(false)
  }

  return (
    <div className="space-y-6">
      {detail && (
        <MemberDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          onUpdated={() => load(search)}
          currentUserRole={currentUserRole}
        />
      )}
      {bulkOpen && <BulkPointsModal onClose={() => setBulkOpen(false)} />}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Miembros</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestión de cuentas del programa.</p>
        </div>
        <button
          onClick={() => setBulkOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          Carga masiva de puntos
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, RFC o empresa…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm py-2 w-full"
          />
        </div>
        {loading && <span className="text-sm text-muted-foreground">Buscando…</span>}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Empresa / RFC</th>
              <th className="px-5 py-3 font-medium">Ciudad</th>
              <th className="px-5 py-3 font-medium text-right">Saldo</th>
              <th className="px-5 py-3 font-medium text-right">Facturas</th>
              <th className="px-5 py-3 font-medium">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && members.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  {search ? 'Sin resultados para tu búsqueda.' : 'No hay miembros registrados.'}
                </td>
              </tr>
            ) : members.map(m => {
              const st = STATUS_CFG[m.status] ?? STATUS_CFG.active
              return (
                <tr
                  key={m.id}
                  onClick={() => openDetail(m.id)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-foreground">{m.full_name}</td>
                  <td className="px-5 py-4">
                    <p className="text-foreground">{m.company_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{m.rfc}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{m.location_city ?? '—'}</td>
                  <td className="px-5 py-4 text-right font-semibold text-primary">
                    {m.balance.toLocaleString('es-MX')}
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground">{m.invoiceCount}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-card rounded-xl p-6 text-sm text-muted-foreground">
            Cargando detalle…
          </div>
        </div>
      )}
    </div>
  )
}
