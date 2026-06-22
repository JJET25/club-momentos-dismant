import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { canAccessAdminRoute, STAFF_ROLES } from './lib/permissions'

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/verify', '/api/auth', '/api/banner', '/api/dev']

// Rutas solo para miembros del club (portal cliente)
const CLIENT_ROUTES = ['/dashboard', '/catalog', '/redemptions', '/statement', '/promotions', '/invoices', '/profile', '/arco']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

  // Si ya tiene sesión activa y visita login o registro, redirigir a su área
  if (pathname === '/login' || pathname.startsWith('/register')) {
    const existing = request.cookies.get('session')?.value
    if (existing) {
      try {
        const { payload } = await jwtVerify(existing, secret)
        const dest = (payload.role as string) === 'member' ? '/dashboard' : '/admin/dashboard'
        return NextResponse.redirect(new URL(dest, request.url))
      } catch {
        // Sesión inválida o expirada — dejar pasar al login normalmente
      }
    }
    return NextResponse.next()
  }

  // Permitir el resto de rutas públicas sin verificación
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Obtener token de la cookie de sesión
  const sessionToken = request.cookies.get('session')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const { payload } = await jwtVerify(sessionToken, secret)
    const role = payload.role as string

    const isAdminRoute  = pathname.startsWith('/admin')
    const isClientRoute = CLIENT_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))

    // ── Protección de rutas de admin ──────────────────────────

    if (isAdminRoute) {
      // No es staff → al portal del cliente
      if (!STAFF_ROLES.includes(role as never)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Es staff pero no tiene acceso a esta ruta específica (ej. employee en /admin/catalog)
      if (!canAccessAdminRoute(role, pathname)) {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
      }
    }

    // ── Protección de rutas del portal cliente ────────────────

    if (isClientRoute && role !== 'member') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    // Inyectar user ID y rol en headers para Server Components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id',   payload.sub as string)
    requestHeaders.set('x-user-role', role)

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    // Token inválido o expirado
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
