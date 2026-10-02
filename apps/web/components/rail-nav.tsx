'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

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
 * Elegir una sección en el riel solo cambia el panel (no navega); al cambiar
 * de página el panel vuelve a la sección de la página actual.
 */
export function RailNav({ groups, railBg, logo, panelTop, railBottom }: Props) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const current  = Math.max(0, groups.findIndex(g => g.items.some(i => isActive(i.href))))

  const [shown, setShown] = useState(current)
  useEffect(() => { setShown(current) }, [current])

  const group = groups[shown] ?? groups[0]

  return (
    <>
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
              aria-pressed={on}
              onClick={() => setShown(i)}
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
        <div className="mt-auto flex flex-col items-center gap-2">{railBottom}</div>
      </nav>

      <div className="w-60 shrink-0 flex flex-col gap-1 px-3 py-4 bg-card border-r border-border overflow-y-auto">
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
    </>
  )
}
