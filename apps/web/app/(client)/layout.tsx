import { getSession } from '@/lib/auth'
import { SidebarNav } from '@/components/client/sidebar-nav'

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

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">D</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Club Momentos</p>
              <p className="text-xs text-muted-foreground">Dismant</p>
            </div>
          </div>
        </div>

        <SidebarNav name={name} email={email} initials={initials} />
      </aside>

      {/* Contenido principal */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
