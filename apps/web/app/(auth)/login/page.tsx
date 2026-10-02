import { Suspense } from 'react'
import { getBrand, getBrandCssVars, GENERIC_BRAND } from '@/lib/brand'
import { getRequestTenant } from '@/lib/tenant-server'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  // Cada portal muestra solo su marca; el panel central y el dominio
  // anterior usan la marca genérica de Club Momentos.
  const tenant = await getRequestTenant()
  const brand = tenant.kind === 'brand' ? getBrand(tenant.affiliate) : GENERIC_BRAND
  const subtitle = tenant.kind === 'admin' ? 'Panel de administración' : 'Ingresa a tu cuenta de lealtad'

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4"
      style={getBrandCssVars(brand) as React.CSSProperties}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {brand.logo ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <span className="text-2xl font-bold text-white">CM</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{brand.name}</h1>
          <p className="text-brand-300 mt-1">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-50 rounded-lg" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
