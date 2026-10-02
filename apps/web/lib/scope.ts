import type { NextRequest } from 'next/server'
import type { SessionPayload } from './auth'
import { AFFILIATES, isAffiliate, type Affiliate } from './tenant'

export { AFFILIATES, isAffiliate, type Affiliate }

export const PERSPECTIVE_COOKIE = 'admin_perspective'

/** Roles que ven ambas empresas y pueden elegir la vista combinada. */
export const GLOBAL_ROLES = ['owner', 'admin']

export function isGlobalRole(role: string): boolean {
  return GLOBAL_ROLES.includes(role)
}

/** RFC oficial de cada affiliate, usado para validar el emisor de una factura. */
const AFFILIATE_RFC: Record<Affiliate, string | undefined> = {
  dismant: process.env.DISMANT_RFC,
  lauti:   process.env.LAUTI_RFC,
}

/** RFC del emisor esperado para un affiliate dado; cae a Dismant si no se reconoce. */
export function getAffiliateRfc(affiliate: unknown): string | undefined {
  return isAffiliate(affiliate) ? AFFILIATE_RFC[affiliate] : process.env.DISMANT_RFC
}

/**
 * Empresas a las que tiene acceso una sesión de staff.
 * - owner/admin: todas.
 * - team_admin/employee: las de su asignación (`affiliates` en el JWT, que
 *   viene de la tabla staff_affiliates). Sesiones emitidas antes de que
 *   existiera ese claim caen a su `affiliate` principal.
 */
export function getAllowedAffiliates(session: Pick<SessionPayload, 'role' | 'affiliate' | 'affiliates'>): Affiliate[] {
  if (isGlobalRole(session.role)) return [...AFFILIATES]
  const assigned = (session.affiliates ?? []).filter(isAffiliate)
  if (assigned.length) return assigned
  return isAffiliate(session.affiliate) ? [session.affiliate] : ['dismant']
}

/**
 * Resuelve la empresa activa a partir del valor de la cookie de perspectiva.
 * `null` = sin filtro (vista combinada), solo posible para roles globales.
 * Un rol scoped nunca obtiene null: si la cookie no es una de sus empresas
 * se usa la primera de su asignación.
 */
export function resolvePerspective(
  session: Pick<SessionPayload, 'role' | 'affiliate' | 'affiliates'>,
  perspective: string | undefined,
): Affiliate | null {
  const allowed = getAllowedAffiliates(session)
  if (isAffiliate(perspective) && allowed.includes(perspective)) return perspective
  return isGlobalRole(session.role) ? null : allowed[0]
}

/**
 * Affiliate efectivo para filtrar queries del panel admin.
 * `null` = sin filtro (ver ambas empresas combinadas, solo roles globales).
 */
export function getEffectiveAffiliate(session: SessionPayload, req: NextRequest): Affiliate | null {
  return resolvePerspective(session, req.cookies.get(PERSPECTIVE_COOKIE)?.value)
}

/** true si la sesión puede operar sobre un registro de la empresa dada. */
export function canAccessAffiliate(session: Pick<SessionPayload, 'role' | 'affiliate' | 'affiliates'>, affiliate: unknown): boolean {
  return isAffiliate(affiliate) && getAllowedAffiliates(session).includes(affiliate)
}

/**
 * Empresa de una sesión de MIEMBRO. Todo lo que ve un miembro (catálogo,
 * promociones, banner, reseñas) se filtra por aquí: las dos empresas no
 * comparten contenido.
 */
export function getMemberAffiliate(session: Pick<SessionPayload, 'affiliate'>): Affiliate {
  return isAffiliate(session.affiliate) ? session.affiliate : 'dismant'
}
