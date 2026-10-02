import { getSession } from '@/lib/auth'
import { getBrand, getBrandCssVars } from '@/lib/brand'
import { SidebarNav } from '@/components/client/sidebar-nav'
import { GlobalBanner } from '@/components/GlobalBanner'
import { WelcomeBanner } from '@/components/client/WelcomeBanner'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const name = session?.name ?? 'Usuario'
  const email = session?.email ?? ''
  const initials = getInitials(name)
  const brand = getBrand(session?.affiliate)

  return (
    <div className="min-h-screen bg-background flex" style={getBrandCssVars(brand) as React.CSSProperties}>

      {/* Navegación: riel de secciones + panel con las páginas de la sección */}
      <aside className="fixed inset-y-0 left-0 z-40 flex">
        <SidebarNav
          name={name}
          email={email}
          initials={initials}
          company={brand.short}
          brand={{ name: brand.name, logo: brand.logo, initial: brand.initial, sidebarBg: brand.sidebarBg }}
        />
      </aside>

      {/* Main content */}
      <main className="ml-[324px] flex-1 min-h-screen flex flex-col">
        <GlobalBanner />
        <WelcomeBanner name={name} />
        <div className="max-w-6xl mx-auto w-full px-8 py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
