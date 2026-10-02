'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, Loader2, UserRound } from 'lucide-react'

export interface ViewOption {
  value: string
  label: string
  hint?: string
}

interface LinkedAccount {
  id:        string
  label:     string
  roleLabel: string
  current:   boolean
}

interface Props {
  name:      string
  subtitle:  string
  initials:  string
  roleLabel: string
  /** Enlace a "Mi perfil" (solo el portal de miembros tiene página de perfil) */
  profileHref?: string
  /** Vistas del panel: Global (solo owner/admin) + empresas asignadas */
  views?:     ViewOption[]
  view?:      string
  onSelectView?: (value: string) => void
  /** Solo el avatar como botón (riel de navegación); el menú abre a la derecha */
  compact?: boolean
  /** Acciones al final del menú (tema, cerrar sesión) */
  footer?: ReactNode
}

/**
 * Menú de perfil (clic en el nombre, abajo en la barra lateral).
 * - Rol visible.
 * - Panel: elegir la vista (Global o una empresa) según los permisos.
 * - Cualquier cuenta: cambiar a otra cuenta del mismo correo (otra empresa,
 *   o del portal de miembro al panel). Solo aparece si existe otra cuenta.
 */
export function ProfileMenu({ name, subtitle, initials, roleLabel, profileHref, views, view, onSelectView, compact, footer }: Props) {
  const [open, setOpen]         = useState(false)
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [slow, setSlow]         = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Las cuentas se piden al montar (la barra lateral vive entre navegaciones),
  // así el menú abre ya con los datos y no parpadea un esqueleto.
  useEffect(() => {
    let alive = true
    fetch('/api/auth/accounts')
      .then(r => (r.ok ? r.json() : { accounts: [] }))
      .then(d => { if (alive) setAccounts(d.accounts ?? []) })
      .catch(() => { if (alive) setAccounts([]) })
    return () => { alive = false }
  }, [])

  // Si el menú se abre antes de que lleguen, el esqueleto solo aparece cuando
  // la carga de verdad tarda; una respuesta rápida no deja rastro.
  useEffect(() => {
    if (!open || accounts !== null) { setSlow(false); return }
    const t = setTimeout(() => setSlow(true), 300)
    return () => clearTimeout(t)
  }, [open, accounts])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function switchTo(id: string) {
    setSwitching(id)
    setError('')
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: id }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.redirectTo) {
      window.location.href = data.redirectTo
      return
    }
    setSwitching(null)
    setError(data.error ?? 'No se pudo cambiar de cuenta')
  }

  const others = (accounts ?? []).filter(a => !a.current)
  const showViews = !!views && views.length > 1

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          aria-label="Perfil"
          className={`absolute w-72 rounded-xl border border-border bg-background text-foreground shadow-xl p-1.5 z-50
            ${compact ? 'left-full bottom-0 ml-3' : 'bottom-full left-0 mb-2'}`}
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <span className="w-9 h-9 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate">{name}</span>
              <span className="block text-xs text-muted-foreground truncate">{roleLabel}</span>
            </span>
          </div>

          {profileHref && (
            <Link role="menuitem" href={profileHref} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium hover:bg-muted border-t border-border">
              <UserRound className="w-4 h-4" /> Mi perfil
            </Link>
          )}

          {showViews && (
            <div className="border-t border-border pt-1 mt-1">
              <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Vista</p>
              {views!.map(v => (
                <button
                  key={v.value || 'global'}
                  role="menuitemradio"
                  aria-checked={v.value === view}
                  onClick={() => onSelectView?.(v.value)}
                  className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-sm text-left transition-colors
                    ${v.value === view ? 'bg-muted font-semibold' : 'hover:bg-muted'}`}
                >
                  <span>
                    {v.label}
                    {v.hint && <span className="block text-xs font-normal text-muted-foreground">{v.hint}</span>}
                  </span>
                  {v.value === view && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {accounts === null ? slow && (
            <div className="border-t border-border mt-1 px-2.5 py-2 space-y-2" aria-busy="true">
              <div className="h-3 w-24 rounded bg-muted animate-pulse motion-reduce:animate-none" />
              <div className="h-8 rounded-lg bg-muted animate-pulse motion-reduce:animate-none" />
            </div>
          ) : others.length > 0 && (
            <div className="border-t border-border pt-1 mt-1">
              <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {views ? 'Mis otras cuentas' : 'Empresa'}
              </p>
              {!views && (accounts ?? []).filter(a => a.current).map(a => (
                <div key={a.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-muted text-sm font-semibold">
                  {a.label}
                  <Check className="w-4 h-4 text-brand-600" />
                </div>
              ))}
              {others.map(a => (
                <button
                  key={a.id}
                  role="menuitem"
                  disabled={!!switching}
                  onClick={() => switchTo(a.id)}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-sm text-left hover:bg-muted disabled:opacity-60"
                >
                  <span>
                    {a.label}
                    <span className="block text-xs text-muted-foreground">{a.roleLabel}</span>
                  </span>
                  {switching === a.id && <Loader2 className="w-4 h-4 animate-spin" />}
                </button>
              ))}
              {error && <p className="px-2.5 py-1.5 text-xs text-red-600">{error}</p>}
            </div>
          )}

          {footer && <div className="border-t border-border pt-1 mt-1">{footer}</div>}
        </div>
      )}

      {compact ? (
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Menú de perfil de ${name}`}
          title={`${name} · ${subtitle}`}
          className="w-10 h-10 rounded-full bg-brand-700 hover:ring-2 hover:ring-white/30 flex items-center justify-center transition-shadow"
        >
          <span className="text-[11px] font-bold text-white">{initials}</span>
        </button>
      ) : (
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-white">{initials}</span>
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-white leading-none truncate">{name}</span>
          <span className="block text-[11px] text-brand-400 mt-0.5 truncate">{subtitle}</span>
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-brand-500 shrink-0" />
      </button>
      )}
    </div>
  )
}
