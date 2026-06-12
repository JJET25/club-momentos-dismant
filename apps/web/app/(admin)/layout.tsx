import { getSession } from '@/lib/auth'
import { AdminSidebarNav } from '@/components/admin/admin-sidebar-nav'
import { GlobalBanner } from '@/components/GlobalBanner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const name = session?.name ?? 'Admin'
  const role = session?.role ?? 'admin'

  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar */}
      <aside className="w-60 bg-[#0f172a] flex flex-col fixed h-full">

        {/* Logo / Brand */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white leading-none">Club Momentos</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium uppercase tracking-wide">Panel Admin</p>
            </div>
          </div>
        </div>

        <AdminSidebarNav name={name} role={role} />
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <GlobalBanner />
        <div className="max-w-6xl mx-auto w-full px-8 py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
