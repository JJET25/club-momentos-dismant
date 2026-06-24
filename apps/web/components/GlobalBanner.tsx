'use client'

import { useEffect, useState } from 'react'
import { X, Megaphone } from 'lucide-react'

interface BannerData {
  id: string
  message: string
}

const SHOW_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000  // 7 días
const AUTO_DISMISS_MS      = 6_000                     // 6 segundos

export function GlobalBanner() {
  const [banner, setBanner]   = useState<BannerData | null>(null)
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  function dismiss() {
    setLeaving(true)
    setTimeout(() => setVisible(false), 300)
  }

  useEffect(() => {
    fetch('/api/banner')
      .then(r => r.ok ? r.json() : null)
      .then((data: { banner: BannerData | null } | null) => {
        if (!data?.banner) return

        const key       = `banner_shown_${data.banner.id}`
        const lastShown = localStorage.getItem(key)
        const shouldShow = !lastShown ||
          Date.now() - parseInt(lastShown) > SHOW_AGAIN_AFTER_MS

        if (!shouldShow) return

        localStorage.setItem(key, String(Date.now()))
        setBanner(data.banner)
        setVisible(true)

        const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
        return () => clearTimeout(timer)
      })
      .catch(() => {})
  }, [])

  if (!visible || !banner) return null

  return (
    <div
      className={`w-full bg-brand-600 text-white px-4 py-2.5 flex items-center gap-3
        transition-all duration-300 ${leaving ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'}`}
    >
      <Megaphone className="w-4 h-4 shrink-0 text-white/80" />
      <p className="text-sm font-medium flex-1 text-center">{banner.message}</p>
      <button
        onClick={dismiss}
        aria-label="Cerrar anuncio"
        className="shrink-0 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
