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

      {/* Sidebar */}
      <aside className="w-60 flex flex-col fixed h-full z-40" style={{ background: brand.sidebarBg }}>

        {/* Logo / Brand */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo} alt={brand.name} className="w-8 h-8 rounded-lg object-contain bg-white shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white leading-none">{brand.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium uppercase tracking-wide">Mi Portal</p>
            </div>
          </div>
        </div>

        <SidebarNav name={name} email={email} initials={initials} />
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <GlobalBanner />
        <WelcomeBanner name={name} />
        <div className="max-w-6xl mx-auto w-full px-8 py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
