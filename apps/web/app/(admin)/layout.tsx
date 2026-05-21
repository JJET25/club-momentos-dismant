import { getSession } from '@/lib/auth'
import { AdminSidebarNav } from '@/components/admin/admin-sidebar-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const name = session?.name ?? 'Admin'
  const role = session?.role ?? 'admin'

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="w-64 bg-brand-950 flex flex-col fixed h-full">
        <div className="p-6 border-b border-brand-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Club Momentos</p>
              <p className="text-xs text-brand-400">Panel Admin</p>
            </div>
          </div>
        </div>

        <AdminSidebarNav name={name} role={role} />
      </aside>

      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
