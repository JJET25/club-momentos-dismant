import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import { getBrand, GENERIC_BRAND, getBrandCssVars } from '@/lib/brand'
import { getAllowedAffiliates, resolvePerspective, PERSPECTIVE_COOKIE } from '@/lib/scope'
import { AdminSidebarNav } from '@/components/admin/admin-sidebar-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const name = session?.name ?? 'Admin'
  const role = session?.role ?? 'admin'

  // Empresa activa: la elegida en "Ver como" si la sesión tiene acceso a
  // ella; null = vista combinada (solo owner/admin). El sidebar toma los
  // colores de la empresa activa para que nunca se confunda dónde se opera.
  const allowed = session ? getAllowedAffiliates(session) : []
  const perspective = session ? resolvePerspective(session, (await cookies()).get(PERSPECTIVE_COOKIE)?.value) : null
  const brand = perspective ? getBrand(perspective) : GENERIC_BRAND

  return (
    <div className="min-h-screen bg-background flex" style={getBrandCssVars(brand) as React.CSSProperties}>

      {/* Sidebar */}
      <aside className="w-60 flex flex-col fixed h-full" style={{ background: brand.sidebarBg }}>

        {/* Logo / Brand */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt={brand.name} className="w-8 h-8 rounded-lg object-contain bg-white shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">{brand.initial}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white leading-none">{brand.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium uppercase tracking-wide">Panel Admin</p>
            </div>
          </div>
        </div>

        <AdminSidebarNav name={name} role={role} allowed={allowed} perspective={perspective ?? ''} />
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="max-w-6xl mx-auto w-full px-8 py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
