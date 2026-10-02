'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'

export interface RailItem {
  href:  string
  label: string
  icon:  LucideIcon
}

export interface RailGroup {
  label: string
  icon:  LucideIcon
  items: RailItem[]
}

interface Props {
  groups:      RailGroup[]
  /** Fondo del riel (color de la empresa activa) */
  railBg:      string
  /** Logo de la marca, arriba del riel */
  logo:        ReactNode
  /** Encabezado del panel: marca, selector de empresa, accesos rápidos */
  panelTop?:   ReactNode
  /** Abajo del riel: notificaciones y menú de perfil */
  railBottom?: ReactNode
}

/**
 * Navegación en dos columnas: un riel con una sección por ícono y un panel
 * con las páginas de la sección elegida. Así nunca hay que desplazar la
 * barra, sin importar cuántas páginas tenga el panel.
 *
 * El panel está cerrado por defecto y se abre encima del contenido al picar
 * una sección o el botón de panel del riel. Se cierra al elegir una página, al
 * picar fuera o con Escape.
 */
export function RailNav({ groups, railBg, logo, panelTop, railBottom }: Props) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const current  = Math.max(0, groups.findIndex(g => g.items.some(i => isActive(i.href))))

  const [shown, setShown] = useState(current)
  const [open, setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Al cambiar de página: panel cerrado y en la sección de la página actual
  useEffect(() => { setShown(current); setOpen(false) }, [pathname, current])

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

  function pickGroup(i: number) {
    // Picar la sección que ya está abierta cierra el panel
    if (open && i === shown) { setOpen(false); return }
    setShown(i)
    setOpen(true)
  }

  const group = groups[shown] ?? groups[0]

  return (
    <div ref={ref} className="relative flex h-full">
      <nav
        aria-label="Secciones"
        className="w-[84px] shrink-0 flex flex-col items-center gap-1.5 py-4"
        style={{ background: railBg }}
      >
        <div className="mb-3">{logo}</div>
        {groups.map((g, i) => {
          const Icon = g.icon
          const on   = i === shown
          return (
            <button
              key={g.label}
              type="button"
              aria-pressed={on && open}
              aria-expanded={on && open}
              onClick={() => pickGroup(i)}
              className={`relative w-[68px] min-h-[60px] rounded-xl flex flex-col items-center justify-center gap-1 transition-colors
                ${on ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold leading-none">{g.label}</span>
              {/* Marca la sección de la página actual cuando se ve otra */}
              {i === current && !on && (
                <span className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full bg-brand-400" aria-hidden />
              )}
            </button>
          )
        })}
        <div className="mt-auto flex flex-col items-center gap-2">
          {/* Abre/cierra el panel en la sección de la página actual */}
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : pickGroup(current))}
            aria-expanded={open}
            aria-label={open ? 'Cerrar panel de secciones' : 'Abrir panel de secciones'}
            title={open ? 'Cerrar panel' : 'Abrir panel'}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            {open ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          {railBottom}
        </div>
      </nav>

      {open && (
      <div className="absolute left-[84px] inset-y-0 w-60 flex flex-col gap-1 px-3 py-4 bg-card border-r border-border shadow-xl overflow-y-auto">
        {panelTop}
        {group && (
          <>
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
              {group.label}
            </p>
            {group.items.map(item => {
              const active = isActive(item.href)
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </div>
      )}
    </div>
  )
}
