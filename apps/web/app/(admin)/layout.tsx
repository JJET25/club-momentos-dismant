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

      {/* Navegación: riel de secciones + panel con las páginas de la sección */}
      <aside className="fixed inset-y-0 left-0 z-40 flex">
        <AdminSidebarNav
          name={name}
          role={role}
          allowed={allowed}
          perspective={perspective ?? ''}
          brand={{ name: brand.name, initial: brand.initial, logo: brand.logo, sidebarBg: brand.sidebarBg }}
        />
      </aside>

      {/* Main content */}
      <main className="ml-[84px] flex-1 min-h-screen flex flex-col">
        <div className="max-w-6xl mx-auto w-full px-8 py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
