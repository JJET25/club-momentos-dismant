// Layout del portal del cliente — con sidebar izquierdo

export default function ClientLayout({ children }: { children: React.ReactNode }) {
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

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: '/dashboard', label: 'Inicio', icon: '🏠' },
            { href: '/catalog', label: 'Catálogo', icon: '🎁' },
            { href: '/invoices', label: 'Mis Facturas', icon: '📄' },
            { href: '/redemptions', label: 'Mis Canjes', icon: '🎫' },
            { href: '/statement', label: 'Estado de Cuenta', icon: '📊' },
            { href: '/promotions', label: 'Promociones', icon: '📢' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t">
          <a
            href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <span>👤</span>
            Mi Perfil
          </a>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full mt-1">
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
