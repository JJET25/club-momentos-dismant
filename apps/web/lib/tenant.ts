/**
 * Resolución de "tenant" (empresa) a partir del Host del request.
 *
 * Dismant y Lauti son dos empresas independientes servidas por el MISMO
 * deploy: cada una tiene su propio dominio para miembros, y el panel
 * central de Club Momentos vive en un dominio de administración aparte.
 *
 *   club.dismant.com.mx  → { kind: 'brand', affiliate: 'dismant' }
 *   club.silauti.com.mx  → { kind: 'brand', affiliate: 'lauti' }
 *   admin.<dominio>      → { kind: 'admin' }
 *   <entrada del proyecto> → { kind: 'hub' }  (solo muestra "Elige tu club")
 *   cualquier otro host  → { kind: 'legacy' }  (dominio anterior / preview / localhost)
 *
 * Los hosts se configuran por env (DISMANT_APP_HOST, LAUTI_APP_HOST,
 * ADMIN_APP_HOST). Mientras no estén configurados todo cae en 'legacy',
 * que conserva el comportamiento de un solo dominio — así el código se puede
 * desplegar antes de dar de alta los dominios sin cambiar nada visible.
 *
 * En desarrollo también se reconocen `dismant.localhost`, `lauti.localhost`
 * y `admin.localhost` (los navegadores resuelven *.localhost a 127.0.0.1).
 *
 * Este módulo no importa nada de Node ni de next/headers: lo usa el
 * middleware (Edge runtime).
 */

export const AFFILIATES = ['dismant', 'lauti'] as const
export type Affiliate = typeof AFFILIATES[number]

export function isAffiliate(value: unknown): value is Affiliate {
  return typeof value === 'string' && (AFFILIATES as readonly string[]).includes(value)
}

export type Tenant =
  | { kind: 'brand'; affiliate: Affiliate }
  | { kind: 'admin' }
  | { kind: 'hub' }
  | { kind: 'legacy' }

/** Header que el middleware inyecta con el tenant resuelto (informativo). */
export const TENANT_HEADER = 'x-tenant'

function normalizeHost(host: string | null | undefined): string {
  return (host ?? '').trim().toLowerCase().replace(/:\d+$/, '')
}

// Las variables se leen con su nombre literal (process.env.X), nunca con
// process.env[nombre]: en el Edge runtime del middleware solo el acceso
// literal está garantizado.
function envHost(value: string | undefined): string | null {
  return normalizeHost(value) || null
}

/** Hosts configurados por empresa (sin puerto). */
export function getAffiliateHost(affiliate: Affiliate): string | null {
  return envHost(affiliate === 'dismant' ? process.env.DISMANT_APP_HOST : process.env.LAUTI_APP_HOST)
}

export function getAdminHost(): string | null {
  return envHost(process.env.ADMIN_APP_HOST)
}

/** Entrada neutral del proyecto (p. ej. clubmomentos.<dominio>): solo "Elige tu club". Opcional. */
export function getHubHost(): string | null {
  return envHost(process.env.HUB_APP_HOST)
}

/** true cuando ya hay dominios por empresa configurados (separación activa). */
export function isHostRoutingEnabled(): boolean {
  return !!(getAffiliateHost('dismant') && getAffiliateHost('lauti') && getAdminHost())
}

export function resolveTenant(rawHost: string | null | undefined): Tenant {
  const host = normalizeHost(rawHost)
  if (!host) return { kind: 'legacy' }

  for (const affiliate of AFFILIATES) {
    if (host === getAffiliateHost(affiliate) || host === `${affiliate}.localhost`) {
      return { kind: 'brand', affiliate }
    }
  }
  if (host === getAdminHost() || host === 'admin.localhost') return { kind: 'admin' }
  if (host === getHubHost() || host === 'clubmomentos.localhost') return { kind: 'hub' }

  return { kind: 'legacy' }
}

export function tenantToHeader(tenant: Tenant): string {
  return tenant.kind === 'brand' ? tenant.affiliate : tenant.kind
}

// ── Construcción de URLs absolutas (correos, redirects entre dominios) ──

/** Base del deploy actual (dominio anterior), p. ej. https://clubmomentos.app */
function legacyBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}

function baseUrlForHost(host: string): string {
  // *.localhost en dev: conservar protocolo y puerto de NEXT_PUBLIC_APP_URL
  if (host.endsWith('.localhost') || host === 'localhost') {
    const legacy = new URL(legacyBaseUrl())
    return `${legacy.protocol}//${host}${legacy.port ? `:${legacy.port}` : ''}`
  }
  return `https://${host}`
}

/**
 * URL base del portal de miembros de una empresa. Si la empresa todavía no
 * tiene dominio propio configurado, cae al dominio actual.
 */
export function getAffiliateBaseUrl(affiliate: unknown): string {
  const host = isAffiliate(affiliate) ? getAffiliateHost(affiliate) : null
  return host ? baseUrlForHost(host) : legacyBaseUrl()
}

/** URL base del panel central (o el dominio actual si no hay ADMIN_APP_HOST). */
export function getAdminBaseUrl(): string {
  const host = getAdminHost()
  return host ? baseUrlForHost(host) : legacyBaseUrl()
}

/** URL base de la página de inicio del proyecto, o null si no hay HUB_APP_HOST. */
export function getHubBaseUrl(): string | null {
  const host = getHubHost()
  return host ? baseUrlForHost(host) : null
}

/**
 * URL base donde debe operar una cuenta según su rol: el staff en el panel
 * central, los miembros en el portal de su empresa.
 */
export function getHomeBaseUrl(role: string, affiliate: unknown): string {
  return role === 'member' ? getAffiliateBaseUrl(affiliate) : getAdminBaseUrl()
}

/**
 * Origen (protocolo + dominio) con el que llegó la petición. En las rutas de
 * API `req.url` puede traer el host interno del servidor; para redirigir
 * dentro del MISMO dominio se usa el header Host.
 */
export function requestOrigin(req: { headers: Headers; nextUrl: { protocol: string; host: string } }): string {
  const host = req.headers.get('host') ?? req.nextUrl.host
  return `${req.nextUrl.protocol}//${host}`
}
