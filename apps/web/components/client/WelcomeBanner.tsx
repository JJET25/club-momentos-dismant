'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles } from 'lucide-react'

const SHOW_AGAIN_AFTER_MS = 8 * 60 * 60 * 1000  // 8 horas
const AUTO_DISMISS_MS      = 5_000               // 5 segundos
const LS_KEY               = 'welcome_banner_last_shown'

export function WelcomeBanner({ name }: { name: string }) {
  const [visible, setVisible]   = useState(false)
  const [leaving, setLeaving]   = useState(false)

  const firstName = name.split(' ')[0]

  function dismiss() {
    setLeaving(true)
    setTimeout(() => setVisible(false), 300)
  }

  useEffect(() => {
    const lastShown = localStorage.getItem(LS_KEY)
    const shouldShow = !lastShown ||
      Date.now() - parseInt(lastShown) > SHOW_AGAIN_AFTER_MS

    if (!shouldShow) return

    localStorage.setItem(LS_KEY, String(Date.now()))
    setVisible(true)

    const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-card border border-border
        rounded-2xl shadow-lg px-4 py-3.5 max-w-xs w-full transition-all duration-300
        ${leaving ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
    >
      <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-brand-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          Bienvenido de nuevo, {firstName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revisa tus puntos y las últimas promociones.
        </p>
      </div>

      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
