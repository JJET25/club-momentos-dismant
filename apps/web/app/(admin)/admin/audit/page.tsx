'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, UserMinus, UserCheck,
  Zap, Package, Shield, FileText, Gift, Search, X, ChevronDown, User,
  FilePlus2, RotateCcw, BadgeCheck, Megaphone, ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────

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

// ── Mapa de eventos ────────────────────────────────────────────

type ActionConfig = {
  label:       string
  description: string
  Icon:        LucideIcon
  iconBg:      string
  iconColor:   string
  badgeBg:     string
  badgeText:   string
}

const ACTION_MAP: Record<string, ActionConfig> = {
  'invoice.approved': {
    label:       'Factura aprobada',
    description: 'Se aprobó una factura y se acreditaron puntos al miembro',
    Icon: CheckCircle2,
    iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-600 dark:text-emerald-400',
  },
  'invoice.verified': {
    label:       'Factura verificada',
    description: 'Se verificó una factura con el SAT y se acreditaron los puntos',
    Icon: CheckCircle2,
    iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-600 dark:text-emerald-400',
  },
  'invoice.rejected': {
    label:       'Factura rechazada',
    description: 'Se rechazó una factura — no se acreditaron puntos',
    Icon: XCircle,
    iconBg: 'bg-red-500/10', iconColor: 'text-red-600',
    badgeBg: 'bg-red-500/10', badgeText: 'text-red-600 dark:text-red-400',
  },
  'invoice.manual': {
    label:       'Factura registrada manualmente',
    description: 'Un empleado registró una operación fuera del portal',
    Icon: FilePlus2,
    iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-500/10', badgeText: 'text-purple-600 dark:text-purple-400',
  },
  'member.suspended': {
    label:       'Cuenta suspendida',
    description: 'Se suspendió el acceso de un miembro',
    Icon: UserMinus,
    iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-600 dark:text-amber-400',
  },
  'member.reactivated': {
    label:       'Cuenta reactivada',
    description: 'Se restableció el acceso de un miembro suspendido',
    Icon: UserCheck,
    iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-600 dark:text-blue-400',
  },
  'member.role_changed': {
    label:       'Rol de usuario modificado',
    description: 'Se cambió el nivel de acceso de un miembro del equipo interno',
    Icon: Shield,
    iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600',
    badgeBg: 'bg-orange-500/10', badgeText: 'text-orange-600 dark:text-orange-400',
  },
  'member.arco_request': {
    label:       'Solicitud de privacidad (ARCO)',
    description: 'Un miembro ejerció sus derechos de privacidad sobre sus datos',
    Icon: FileText,
    iconBg: 'bg-slate-500/10', iconColor: 'text-slate-500',
    badgeBg: 'bg-muted', badgeText: 'text-muted-foreground',
  },
  'points.manual_adjust': {
    label:       'Ajuste manual de puntos',
    description: 'Un administrador modificó directamente el saldo de puntos de un miembro',
    Icon: Zap,
    iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-600 dark:text-blue-400',
  },
  'catalog.sku_created': {
    label:       'Premio agregado al catálogo',
    description: 'Se creó un nuevo premio disponible para canjear',
    Icon: Gift,
    iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-500/10', badgeText: 'text-cyan-600 dark:text-cyan-400',
  },
  'catalog.stock_updated': {
    label:       'Stock de premio actualizado',
    description: 'Se modificó la cantidad disponible de un premio',
    Icon: Package,
    iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-500/10', badgeText: 'text-cyan-600 dark:text-cyan-400',
  },
  'redemption.fulfilled': {
    label:       'Premio entregado',
    description: 'Un administrador marcó el canje como entregado al miembro',
    Icon: ShoppingBag,
    iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-600 dark:text-emerald-400',
  },
  'promotion.approved': {
    label:       'Promoción aprobada',
    description: 'Se aprobó una promoción de un aliado para mostrar en el portal',
    Icon: BadgeCheck,
    iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-600 dark:text-emerald-400',
  },
  'promotion.rejected': {
    label:       'Promoción rechazada',
    description: 'Se rechazó una promoción de un aliado',
    Icon: Megaphone,
    iconBg: 'bg-red-500/10', iconColor: 'text-red-600',
    badgeBg: 'bg-red-500/10', badgeText: 'text-red-600 dark:text-red-400',
  },
}

const ALL_ACTIONS = Object.entries(ACTION_MAP).map(([code, cfg]) => ({
  code,
  label:       cfg.label,
  description: cfg.description,
}))

// ── Helpers ────────────────────────────────────────────────────

function getActionCfg(action: string): ActionConfig {
  for (const [key, cfg] of Object.entries(ACTION_MAP)) {
    if (action === key || action.startsWith(key)) return cfg
  }
  return {
    label:       action,
    description: 'Operación del sistema',
    Icon: RotateCcw,
    iconBg: 'bg-muted', iconColor: 'text-muted-foreground',
    badgeBg: 'bg-muted', badgeText: 'text-muted-foreground',
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario', admin: 'Administrador',
  employee: 'Empleado', member: 'Miembro',
}

const TARGET_LABELS: Record<string, string> = {
  invoice: 'Factura', member: 'Miembro', reward_sku: 'Premio',
  promotion: 'Promoción', redemption: 'Canje', ledger_entry: 'Movimiento', sku: 'Premio',
}

function humanMetadata(action: string, metadata: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!metadata) return []
  const g = (k: string) => metadata[k] as string | number | undefined
  const fields: { label: string; value: string }[] = []

  if (action.includes('invoice.approved') || action.includes('invoice.verified')) {
    if (g('points'))      fields.push({ label: 'Puntos acreditados', value: `+${g('points')} pts` })
    if (g('total_mxn'))   fields.push({ label: 'Monto de factura', value: `$${Number(g('total_mxn')).toLocaleString('es-MX')}` })
    if (g('folio'))       fields.push({ label: 'Folio', value: String(g('folio')) })
  }
  if (action.includes('invoice.rejected')) {
    if (g('reason'))      fields.push({ label: 'Motivo del rechazo', value: String(g('reason')) })
  }
  if (action.includes('invoice.manual')) {
    if (g('points'))      fields.push({ label: 'Puntos asignados', value: `+${g('points')} pts` })
    if (g('folio'))       fields.push({ label: 'Folio de referencia', value: String(g('folio')) })
    if (g('total_mxn'))   fields.push({ label: 'Monto', value: `$${Number(g('total_mxn')).toLocaleString('es-MX')}` })
  }
  if (action.includes('member.suspended')) {
    if (g('reason'))      fields.push({ label: 'Motivo de suspensión', value: String(g('reason')) })
  }
  if (action.includes('points.manual_adjust')) {
    const pts = g('points')
    if (pts != null) {
      const n = Number(pts)
      fields.push({ label: n > 0 ? 'Puntos agregados' : 'Puntos descontados', value: `${n > 0 ? '+' : ''}${n} pts` })
    }
    if (g('reason'))        fields.push({ label: 'Razón', value: String(g('reason')) })
    if (g('balance_after')) fields.push({ label: 'Saldo resultante', value: `${g('balance_after')} pts` })
  }
  if (action.includes('member.role_changed')) {
    const from = g('from_role') ?? g('from') ?? g('old_role')
    const to   = g('to_role')   ?? g('to')   ?? g('new_role')
    if (from && to) fields.push({ label: 'Cambio de rol', value: `${ROLE_LABELS[String(from)] ?? from} → ${ROLE_LABELS[String(to)] ?? to}` })
  }
  if (action.includes('catalog.sku_created')) {
    if (g('name'))  fields.push({ label: 'Premio', value: String(g('name')) })
    if (g('stock')) fields.push({ label: 'Stock inicial', value: String(g('stock')) })
  }
  if (action.includes('catalog.stock_updated')) {
    if (g('name'))  fields.push({ label: 'Premio', value: String(g('name')) })
    if (g('stock')) fields.push({ label: 'Nuevo stock', value: String(g('stock')) })
  }
  if (action.includes('member.arco_request')) {
    if (g('type'))  fields.push({ label: 'Tipo de solicitud', value: String(g('type')) })
    if (g('folio')) fields.push({ label: 'Folio ARCO', value: String(g('folio')) })
  }
  if (action.includes('redemption.fulfilled')) {
    if (g('voucher_code')) fields.push({ label: 'Voucher', value: String(g('voucher_code')) })
  }
  if (action.includes('promotion.approved') || action.includes('promotion.rejected')) {
    if (g('title'))  fields.push({ label: 'Promoción', value: String(g('title')) })
    if (g('reason')) fields.push({ label: 'Motivo', value: String(g('reason')) })
  }

  return fields
}

// ── Combobox de acciones ───────────────────────────────────────

function ActionCombobox({ value, onChange }: {
  value:    string
  onChange: (code: string) => void
}) {
  const [query,       setQuery]       = useState('')
  const [open,        setOpen]        = useState(false)
  const [displayText, setDisplayText] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!value) setDisplayText('')
    else {
      const found = ALL_ACTIONS.find(a => a.code === value)
      if (found) setDisplayText(found.label)
    }
  }, [value])

  const filtered = query.trim()
    ? ALL_ACTIONS.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_ACTIONS

  function select(code: string) {
    onChange(code)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange('')
    setDisplayText('')
    setQuery('')
    setOpen(false)
  }

  const inputValue = open ? query : (displayText || query)

  return (
    <div ref={ref} className="relative w-72">
      <div
        className="flex items-center gap-2 input-field py-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={inputValue}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Filtrar por tipo de evento…"
          className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-muted-foreground"
        />
        {(value || query) ? (
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); clear() }}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-muted-foreground">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map(a => {
              const cfg  = getActionCfg(a.code)
              const Icon = cfg.Icon
              const selected = value === a.code
              return (
                <button
                  key={a.code}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => select(a.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border last:border-0 ${
                    selected ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-none ${selected ? 'text-primary' : 'text-foreground'}`}>
                      {a.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{a.description}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Combobox de miembros ───────────────────────────────────────

interface MemberOption { id: string; full_name: string; email: string; company_name: string }

function MemberSearchCombobox({ value, label, onChange }: {
  value: string; label: string; onChange: (id: string, name: string) => void
}) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [results, setResults] = useState<MemberOption[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timeout = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/members?q=${encodeURIComponent(query)}&page=1`)
      if (res.ok) { const d = await res.json(); setResults(d.members?.slice(0, 6) ?? []) }
      setLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function select(m: MemberOption) { onChange(m.id, m.full_name); setOpen(false); setQuery('') }
  function clear() { onChange('', ''); setQuery('') }

  const inputValue = open ? query : (label || query)

  return (
    <div ref={ref} className="relative w-72">
      <div className="flex items-center gap-2 input-field py-2 cursor-text" onClick={() => setOpen(true)}>
        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input type="text" value={inputValue}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Filtrar por persona…"
          className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-muted-foreground" />
        {(value || query) ? (
          <button onMouseDown={e => e.preventDefault()} onClick={e => { e.stopPropagation(); clear() }}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Buscando…</div>
          ) : results.length === 0 && query.trim() ? (
            <div className="px-4 py-4 text-center text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Escribe para buscar…</div>
          ) : results.map(m => (
            <button key={m.id} onMouseDown={e => e.preventDefault()} onClick={() => select(m)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${value === m.id ? 'bg-primary/5' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">
                  {m.full_name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{m.company_name} · {m.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TARGET_TYPE_OPTIONS = [
  { value: 'invoice',      label: 'Factura'    },
  { value: 'member',       label: 'Miembro'    },
  { value: 'reward_sku',   label: 'Premio'     },
  { value: 'redemption',   label: 'Canje'      },
  { value: 'promotion',    label: 'Promoción'  },
  { value: 'ledger_entry', label: 'Movimiento' },
]

// ── Página ─────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries, setEntries]   = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [totalPages, setPages]  = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    action: '', actorId: '', actorName: '', targetType: '', from: '', to: '',
  })

  const load = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (filters.action)     params.set('action',      filters.action)
    if (filters.actorId)    params.set('actor_id',    filters.actorId)
    if (filters.targetType) params.set('target_type', filters.targetType)
    if (filters.from)       params.set('from',        filters.from)
    if (filters.to)         params.set('to',          filters.to)
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

  const hasFilters = !!(filters.action || filters.actorId || filters.targetType || filters.from || filters.to)

  const activeChips = [
    filters.actorName    && { key: 'actorId',    label: `Persona: ${filters.actorName}` },
    filters.action       && { key: 'action',     label: `Evento: ${ACTION_MAP[filters.action]?.label ?? filters.action}` },
    filters.targetType   && { key: 'targetType', label: `Registro: ${TARGET_LABELS[filters.targetType] ?? filters.targetType}` },
    filters.from         && { key: 'from',       label: `Desde: ${filters.from}` },
    filters.to           && { key: 'to',         label: `Hasta: ${filters.to}` },
  ].filter(Boolean) as { key: string; label: string }[]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registro de actividad</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Historial completo de todas las acciones importantes realizadas en el sistema. No se puede modificar.
        </p>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Persona */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Persona</label>
            <MemberSearchCombobox
              value={filters.actorId}
              label={filters.actorName}
              onChange={(id, name) => setFilters(f => ({ ...f, actorId: id, actorName: name }))}
            />
          </div>

          {/* Tipo de evento */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Tipo de evento</label>
            <ActionCombobox
              value={filters.action}
              onChange={code => setFilters(f => ({ ...f, action: code }))}
            />
          </div>

          {/* Tipo de registro */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Registro afectado</label>
            <select
              value={filters.targetType}
              onChange={e => setFilters(f => ({ ...f, targetType: e.target.value }))}
              className="input-field text-sm py-2 w-40"
            >
              <option value="">Todos</option>
              {TARGET_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Desde</label>
              <input type="date" value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                className="input-field text-sm py-2 w-36" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
              <input type="date" value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                className="input-field text-sm py-2 w-36" />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => setFilters({ action: '', actorId: '', actorName: '', targetType: '', from: '', to: '' })}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border hover:bg-muted/30 transition-colors self-end"
            >
              <X className="w-3.5 h-3.5" /> Limpiar todo
            </button>
          )}
        </div>

        {/* Chips de filtros activos */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map(chip => (
              <span key={chip.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {chip.label}
                <button onClick={() => {
                  if (chip.key === 'actorId') setFilters(f => ({ ...f, actorId: '', actorName: '' }))
                  else setFilters(f => ({ ...f, [chip.key]: '' }))
                }}>
                  <X className="w-3 h-3 hover:text-primary/70" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Fecha y hora</th>
              <th className="px-5 py-3 font-medium">Qué ocurrió</th>
              <th className="px-5 py-3 font-medium">Realizado por</th>
              <th className="px-5 py-3 font-medium">Registro afectado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(4)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <RotateCcw className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-muted-foreground text-sm">
                      {hasFilters ? 'Sin registros con los filtros seleccionados.' : 'Sin registros de actividad.'}
                    </p>
                    {hasFilters && (
                      <button
                        onClick={() => setFilters({ action: '', actorId: '', actorName: '', targetType: '', from: '', to: '' })}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        Quitar filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : entries.map(entry => {
              const cfg        = getActionCfg(entry.action)
              const Icon       = cfg.Icon
              const actor      = entry.members as AuditActor | null
              const isExpanded = expanded === entry.id
              const metaFields = humanMetadata(entry.action, entry.metadata)
              const actorInitials = actor
                ? actor.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                : 'S'
              const targetLabel = entry.target_type
                ? (TARGET_LABELS[entry.target_type] ?? entry.target_type)
                : null

              return (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => metaFields.length > 0 ? setExpanded(isExpanded ? null : entry.id) : undefined}
                    className={`transition-colors ${metaFields.length > 0 ? 'cursor-pointer hover:bg-muted/20' : ''}`}
                  >
                    {/* Fecha */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-xs font-medium text-foreground">
                        {new Date(entry.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    {/* Evento */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.iconBg}`}>
                          <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.description}</p>
                          {/* Primer campo de metadata inline */}
                          {metaFields.length > 0 && !isExpanded && (
                            <p className="text-xs text-primary mt-1">
                              {metaFields[0].label}: <span className="font-medium">{metaFields[0].value}</span>
                              {metaFields.length > 1 && (
                                <span className="text-muted-foreground ml-1">+{metaFields.length - 1} más</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="px-5 py-4">
                      {actor ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{actorInitials}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{actor.full_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{actor.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground">S</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Sistema automático</span>
                        </div>
                      )}
                    </td>

                    {/* Recurso */}
                    <td className="px-5 py-4">
                      {targetLabel ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                          {targetLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Detalle expandido — campos legibles */}
                  {isExpanded && metaFields.length > 0 && (
                    <tr key={`${entry.id}-detail`} className="bg-muted/10">
                      <td colSpan={4} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Información detallada
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {metaFields.map(field => (
                            <div key={field.label} className="bg-card border border-border rounded-lg px-3 py-2.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{field.label}</p>
                              <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{field.value}</p>
                            </div>
                          ))}
                        </div>
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
        <p className="text-xs text-muted-foreground">
          {total.toLocaleString('es-MX')} registro{total !== 1 ? 's' : ''} en total
          {hasFilters && ' (filtrados)'}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted/30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted/30 transition-colors"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
