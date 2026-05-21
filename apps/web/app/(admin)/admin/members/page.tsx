'use client'

import { useEffect, useState, useCallback } from 'react'

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
  active:    { label: 'Activo',    className: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspendido', className: 'bg-red-100 text-red-600' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtPts(n: number) {
  return (n > 0 ? '+' : '') + n.toLocaleString('es-MX') + ' pts'
}

// ── Modal de detalle ──────────────────────────────────────────

function MemberDetailModal({ detail, onClose, onUpdated }: {
  detail: MemberDetail
  onClose: () => void
  onUpdated: () => void
}) {
  const [tab, setTab]         = useState<'ledger' | 'invoices' | 'canjes'>('ledger')
  const [adjustPts, setAdjustPts] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting]       = useState(false)
  const [adjustError, setAdjustError]   = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspending, setSuspending]       = useState(false)

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
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

        {/* Footer — suspender/reactivar */}
        <div className="px-6 py-4 border-t shrink-0 bg-muted/20">
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
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
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
        </div>
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
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Miembros</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestión de cuentas del programa.</p>
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
          <div className="bg-white rounded-xl p-6 text-sm text-muted-foreground">
            Cargando detalle…
          </div>
        </div>
      )}
    </div>
  )
}
