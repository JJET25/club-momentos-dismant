import { AFFILIATES, getAffiliateBaseUrl } from '@/lib/tenant'
import { getBrand, GENERIC_BRAND } from '@/lib/brand'

export const metadata = { title: 'Elige tu club' }

/**
 * Página neutral del dominio anterior: quien llega sin sesión (marcador
 * guardado, enlace viejo) elige el portal de su empresa.
 */
export default function ChooseClubPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: GENERIC_BRAND.sidebarBg }}>
      <div className="w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold text-white">¿A qué club perteneces?</h1>
        <p className="text-slate-400 mt-2 mb-8">Nos cambiamos de dirección. Elige tu programa para continuar.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {AFFILIATES.map(affiliate => {
            const brand = getBrand(affiliate)
            return (
              <a
                key={affiliate}
                href={`${getAffiliateBaseUrl(affiliate)}/login`}
                className="rounded-2xl bg-white p-6 flex flex-col items-center gap-4 shadow-xl hover:-translate-y-0.5 transition-transform"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logo} alt={brand.short} className="h-16 w-auto object-contain" />
                <span className="font-semibold" style={{ color: brand.primaryDark }}>{brand.name}</span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
