'use client'

import { useEffect, useState, useCallback } from 'react'

interface AuditActor { id: string; full_name: string; email: string }
interface AuditEntry {
  id:          string
  action:      string
  target_type: string | null
  target_id:   string | null
  metadata:    Record<string, unknown> | null
  created_at:  string
  members:     AuditActor | null
}

const ACTION_COLORS: Record<string, string> = {
  'invoice.approved':      'bg-green-100 text-green-700',
  'invoice.rejected':      'bg-red-100 text-red-600',
  'member.suspended':      'bg-amber-100 text-amber-700',
  'member.reactivated':    'bg-blue-100 text-blue-700',
  'points.manual_adjust':  'bg-purple-100 text-purple-700',
  'catalog.sku_created':   'bg-cyan-100 text-cyan-700',
  'catalog.stock_updated': 'bg-cyan-100 text-cyan-700',
  'member.role_changed':   'bg-orange-100 text-orange-700',
  'member.arco_request':   'bg-gray-100 text-gray-600',
}

function actionColor(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls
  }
  return 'bg-gray-100 text-gray-500'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function AuditPage() {
  const [entries, setEntries]   = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [totalPages, setPages]  = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [filters, setFilters] = useState({ action: '', from: '', to: '' })

  const load = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (filters.action) params.set('action', filters.action)
    if (filters.from)   params.set('from', filters.from)
    if (filters.to)     params.set('to', filters.to)

    const res = await fetch(`/api/admin/audit?${params}`)
    if (res.ok) {
      const json = await res.json()
      setEntries(json.entries)
      setTotal(json.total)
      setPages(json.totalPages)
    }
    setLoading(false)
  }, [page, filters])

  useEffect(() => { load(1); setPage(1) }, [filters])
  useEffect(() => { load(page) }, [page])

  function handleFilter(k: keyof typeof filters, v: string) {
    setFilters(f => ({ ...f, [k]: v }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro inmutable de todas las operaciones sensibles del sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Filtrar por acción…"
          value={filters.action} onChange={e => handleFilter('action', e.target.value)}
          className="input-field text-sm py-2 w-56"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Desde</label>
          <input type="date" value={filters.from}
            onChange={e => handleFilter('from', e.target.value)}
            className="input-field text-sm py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Hasta</label>
          <input type="date" value={filters.to}
            onChange={e => handleFilter('to', e.target.value)}
            className="input-field text-sm py-2"
          />
        </div>
        {(filters.action || filters.from || filters.to) && (
          <button
            onClick={() => setFilters({ action: '', from: '', to: '' })}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Fecha y hora</th>
              <th className="px-5 py-3 font-medium">Actor</th>
              <th className="px-5 py-3 font-medium">Acción</th>
              <th className="px-5 py-3 font-medium">Recurso</th>
              <th className="px-5 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                ))}</tr>
              ))
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  Sin registros en este rango.
                </td>
              </tr>
            ) : entries.map(entry => {
              const actor = entry.members as AuditActor | null
              const isExpanded = expanded === entry.id
              return (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(entry.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {actor ? (
                        <div>
                          <p className="font-medium text-foreground text-xs">{actor.full_name}</p>
                          <p className="text-xs text-muted-foreground">{actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sistema</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {entry.target_type && (
                        <span>{entry.target_type} {entry.target_id ? `· ${entry.target_id.slice(0, 8)}…` : ''}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {entry.metadata ? (
                        <span className="text-primary">{isExpanded ? '▲ Ocultar' : '▼ Ver datos'}</span>
                      ) : '—'}
                    </td>
                  </tr>
                  {isExpanded && entry.metadata && (
                    <tr key={`${entry.id}-meta`} className="bg-muted/10">
                      <td colSpan={5} className="px-5 py-3">
                        <pre className="text-xs text-foreground bg-muted rounded-lg p-3 overflow-auto max-h-48 font-mono">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación + total */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{total.toLocaleString('es-MX')} registros en total</p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted/30 transition-colors"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted/30 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
