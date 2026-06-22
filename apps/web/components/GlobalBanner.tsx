'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BannerData {
  id: string
  message: string
}

export function GlobalBanner() {
  const [banner, setBanner]   = useState<BannerData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch('/api/banner')
      .then(r => r.ok ? r.json() : null)
      .then((data: { banner: BannerData | null } | null) => {
        if (!data?.banner) return
        // No mostrar si el usuario ya cerró este banner en esta sesión
        if (sessionStorage.getItem(`banner_dismissed_${data.banner.id}`)) return
        setBanner(data.banner)
        setVisible(true)
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    if (banner) sessionStorage.setItem(`banner_dismissed_${banner.id}`, '1')
    setVisible(false)
  }

  if (!visible || !banner) return null

  return (
    <div className="w-full bg-brand-600 text-white px-4 py-2.5 flex items-center gap-4">
      <p className="text-sm font-medium text-center flex-1">{banner.message}</p>
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
