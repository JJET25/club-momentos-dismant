import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, type JWTPayload } from 'jose'
import { canAccessAdminRoute, STAFF_ROLES } from './lib/permissions'
import {
  resolveTenant, tenantToHeader, TENANT_HEADER, isHostRoutingEnabled,
  getAffiliateBaseUrl, getAdminBaseUrl, getHomeBaseUrl, getHubBaseUrl, type Tenant,
} from './lib/tenant'

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/verify', '/api/auth', '/api/banner', '/api/dev']

// Lo único que sirve el dominio de entrada (página de inicio con login)
const HUB_API = ['/api/auth/login', '/api/auth/send-otp', '/api/auth/reset-password', '/api/auth/pass']

// Rutas solo para miembros del club (portal cliente)
const CLIENT_ROUTES = ['/dashboard', '/catalog', '/redemptions', '/statement', '/promotions', '/invoices', '/profile', '/arco']

const matches = (pathname: string, routes: string[]) =>
  routes.some(route => pathname === route || pathname.startsWith(route + '/'))

/** Redirige a otro dominio conservando ruta y query string. */
function redirectToBase(request: NextRequest, base: string, pathname?: string, status = 307) {
  const target = new URL((pathname ?? request.nextUrl.pathname) + (pathname ? '' : request.nextUrl.search), base)
  return NextResponse.redirect(target, status)
}

function loginRedirect(request: NextRequest, clearSession = false) {
  const loginUrl = new URL('/login', request.url)
  const { pathname } = request.nextUrl
  if (pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/register') && !pathname.startsWith('/api')) {
    loginUrl.searchParams.set('redirect', pathname)
  }
  const res = NextResponse.redirect(loginUrl)
  if (clearSession) res.cookies.delete('session')
  return res
}

async function readSession(request: NextRequest, secret: Uint8Array): Promise<JWTPayload | null> {
  const token = request.cookies.get('session')?.value
  if (!token) return null
  try {
    return (await jwtVerify(token, secret)).payload
  } catch {
    return null
  }
}

/**
 * Fase de transición: el dominio anterior manda a cada quien a su nuevo
 * dominio. Solo se activa con LEGACY_REDIRECTS=true y cuando los tres
 * dominios nuevos están configurados.
 *  - Con sesión: 301 al dominio de su empresa (miembro) o al panel (staff).
 *  - /register?token=…: se deja pasar; la página valida la invitación y
 *    redirige al portal de la empresa correcta (el middleware no consulta BD).
 *  - /api/*: se deja pasar (magic links ya enviados, crons, clientes en vuelo).
 *  - Resto sin sesión: a la página de inicio del proyecto.
 */
function legacyRedirect(request: NextRequest, session: JWTPayload | null): NextResponse | null {
  if (process.env.LEGACY_REDIRECTS !== 'true' || !isHostRoutingEnabled()) return null
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api') || pathname.startsWith('/register')) return null

  if (session) {
    const base = getHomeBaseUrl(String(session.role), session.affiliate)
    // La cookie no viaja al nuevo dominio: el usuario inicia sesión una vez ahí
    const isStaffPath = pathname.startsWith('/admin')
    const keepPath = (session.role === 'member') !== isStaffPath && pathname !== '/login' && pathname !== '/'
    return redirectToBase(request, base, keepPath ? undefined : '/login', 301)
  }

  const hub = getHubBaseUrl()
  return hub ? redirectToBase(request, hub, '/', 301) : null
}

/**
 * Reglas por dominio. Devuelve una respuesta si hay que redirigir, o null
 * para continuar con la lógica normal de autenticación/RBAC.
 */
function tenantGuard(request: NextRequest, tenant: Tenant, session: JWTPayload | null): NextResponse | null {
  const { pathname } = request.nextUrl
  const role = session ? String(session.role) : null

  if (tenant.kind === 'brand') {
    // El panel admin no existe en los portales de miembros
    if (pathname.startsWith('/admin')) return redirectToBase(request, getAdminBaseUrl())
    // Una sesión de staff o de la otra empresa no es válida en este portal
    if (session && (role !== 'member' || session.affiliate !== tenant.affiliate)) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Sesión no válida para este portal' }, { status: 401 })
      }
      return loginRedirect(request, true)
    }
    return null
  }

  if (tenant.kind === 'hub') {
    // La entrada del proyecto no tiene portal ni sesiones: solo la página de
    // inicio y el login que manda a cada quien directo a la aplicación
    if (pathname === '/' || matches(pathname, HUB_API)) return null
    if (pathname.startsWith('/api')) return NextResponse.json({ error: 'No disponible en este dominio' }, { status: 404 })
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (tenant.kind === 'admin') {
    // El portal de miembros no existe en el panel central
    if (matches(pathname, CLIENT_ROUTES) || pathname.startsWith('/api/client')) {
      if (pathname.startsWith('/api')) return NextResponse.json({ error: 'No disponible en este dominio' }, { status: 404 })
      return session && role !== 'member'
        ? NextResponse.redirect(new URL('/admin/dashboard', request.url))
        : loginRedirect(request, !!session)
    }
    // Una sesión de miembro no es válida en el panel central
    if (session && role === 'member') {
      if (pathname.startsWith('/api')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      return loginRedirect(request, true)
    }
    return null
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const tenant = resolveTenant(request.headers.get('host'))
  const session = await readSession(request, secret)

  const early = tenant.kind === 'legacy'
    ? legacyRedirect(request, session)
    : tenantGuard(request, tenant, session)
  if (early) return early

  // La raíz es la página de inicio solo en el dominio de entrada; en los
  // portales y el panel lleva al login (o a su área si ya hay sesión)
  if (pathname === '/') {
    if (tenant.kind === 'hub') return withTenantHeader(request, tenant)
    const dest = !session ? '/login' : String(session.role) === 'member' ? '/dashboard' : '/admin/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Si ya tiene sesión activa y visita login o registro, redirigir a su área
  if (pathname === '/login' || pathname.startsWith('/register')) {
    if (session) {
      const dest = String(session.role) === 'member' ? '/dashboard' : '/admin/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return withTenantHeader(request, tenant)
  }

  // Permitir el resto de rutas públicas sin verificación
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return withTenantHeader(request, tenant)
  }

  if (!request.cookies.get('session')?.value) {
    return loginRedirect(request)
  }

  // Token inválido o expirado
  if (!session) {
    return loginRedirect(request, true)
  }

  const role = String(session.role)
  const isAdminRoute  = pathname.startsWith('/admin')
  const isClientRoute = matches(pathname, CLIENT_ROUTES)

  // ── Protección de rutas de admin ──────────────────────────

  if (isAdminRoute) {
    // No es staff → al portal del cliente (de su empresa)
    if (!STAFF_ROLES.includes(role as never)) {
      return tenant.kind === 'legacy'
        ? NextResponse.redirect(new URL('/dashboard', request.url))
        : redirectToBase(request, getAffiliateBaseUrl(session.affiliate), '/dashboard')
    }

    // Es staff pero no tiene acceso a esta ruta específica (ej. employee en /admin/catalog)
    if (!canAccessAdminRoute(role, pathname)) {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url))
    }
  }

  // ── Protección de rutas del portal cliente ────────────────

  if (isClientRoute && role !== 'member') {
    return tenant.kind === 'legacy'
      ? NextResponse.redirect(new URL('/admin/dashboard', request.url))
      : redirectToBase(request, getAdminBaseUrl(), '/admin/dashboard')
  }

  // Inyectar user ID, rol y tenant en headers para Server Components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id',   String(session.sub))
  requestHeaders.set('x-user-role', role)
  requestHeaders.set(TENANT_HEADER, tenantToHeader(tenant))

  return NextResponse.next({ request: { headers: requestHeaders } })
}

function withTenantHeader(request: NextRequest, tenant: Tenant) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(TENANT_HEADER, tenantToHeader(tenant))
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
