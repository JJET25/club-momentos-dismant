import { headers } from 'next/headers'
import { resolveTenant, type Tenant } from './tenant'

/** Tenant (empresa / panel central / dominio anterior) del request actual. */
export async function getRequestTenant(): Promise<Tenant> {
  const h = await headers()
  return resolveTenant(h.get('host'))
}
