'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Inicio',          icon: '🏠' },
  { href: '/catalog',     label: 'Catálogo',         icon: '🎁' },
  { href: '/invoices',    label: 'Mis Facturas',     icon: '📄' },
  { href: '/redemptions', label: 'Mis Canjes',       icon: '🎫' },
  { href: '/statement',   label: 'Estado de Cuenta', icon: '📊' },
  { href: '/promotions',  label: 'Promociones',      icon: '📢' },
]

interface Props {
  name: string
  email: string
  initials: string
}

export function SidebarNav({ name, email, initials }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Perfil + logout */}
      <div className="p-4 border-t space-y-1">
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
            ${pathname === '/profile'
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'}`}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
            <span className="text-xs font-bold text-primary-foreground">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
