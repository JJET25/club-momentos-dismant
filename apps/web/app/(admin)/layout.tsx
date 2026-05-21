// Layout del panel de administración — con sidebar izquierdo

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-brand-950 flex flex-col fixed h-full">
        {/* Logo */}
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

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
            { href: '/admin/members', label: 'Miembros', icon: '👥' },
            { href: '/admin/invitations', label: 'Invitaciones', icon: '✉️' },
            { href: '/admin/invoices', label: 'Facturas', icon: '📄' },
            { href: '/admin/catalog', label: 'Catálogo', icon: '🎁' },
            { href: '/admin/promotions', label: 'Promociones', icon: '📢' },
            { href: '/admin/reports', label: 'Reportes', icon: '📈' },
            { href: '/admin/audit', label: 'Auditoría', icon: '🔍' },
            { href: '/admin/settings', label: 'Configuración', icon: '⚙️' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-brand-800">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-400 hover:text-white hover:bg-white/10 transition-colors w-full">
            <span>🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
