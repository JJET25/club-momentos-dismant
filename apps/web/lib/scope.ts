import type { NextRequest } from 'next/server'
import type { SessionPayload } from './auth'

export const AFFILIATES = ['dismant', 'lauti'] as const
export type Affiliate = typeof AFFILIATES[number]

export const PERSPECTIVE_COOKIE = 'admin_perspective'

/** Roles que ven ambas empresas y pueden cambiar de perspectiva. */
export const GLOBAL_ROLES = ['owner', 'admin']

export function isAffiliate(value: unknown): value is Affiliate {
  return typeof value === 'string' && (AFFILIATES as readonly string[]).includes(value)
}

/**
 * Affiliate efectivo para filtrar queries del panel admin.
 * `null` = sin filtro (ver ambas empresas combinadas).
 * Los roles globales (owner/admin) lo sacan de la cookie de perspectiva;
 * el resto de los roles de staff siempre queda scoped a su propio affiliate.
 */
export function getEffectiveAffiliate(session: SessionPayload, req: NextRequest): Affiliate | null {
  if (GLOBAL_ROLES.includes(session.role)) {
    const perspective = req.cookies.get(PERSPECTIVE_COOKIE)?.value
    return isAffiliate(perspective) ? perspective : null
  }
  return isAffiliate(session.affiliate) ? session.affiliate : 'dismant'
}
