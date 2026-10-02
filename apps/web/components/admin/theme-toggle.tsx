'use client'

import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

/** `sidebar`: sobre el fondo oscuro de la barra; `menu`: dentro del menú de perfil */
export function ThemeToggle({ variant = 'sidebar' }: { variant?: 'sidebar' | 'menu' }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('admin-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('admin-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={variant === 'menu'
        ? 'flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm font-medium hover:bg-muted'
        : 'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-brand-400 hover:text-white hover:bg-white/5 transition-all'}
    >
      {dark
        ? <Sun className="w-4 h-4 shrink-0" />
        : <Moon className="w-4 h-4 shrink-0" />
      }
      {dark ? 'Modo claro' : 'Modo oscuro'}
    </button>
  )
}
