import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/permissions'
import { getAllowedAffiliates, getEffectiveAffiliate, isGlobalRole } from '@/lib/scope'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  // `affiliate`: para staff scoped, la empresa activa (la elegida en "Ver
  // como" entre las asignadas); para roles globales, su empresa principal.
  const perspective = getEffectiveAffiliate(session, req)
  return NextResponse.json({
    id:          session.sub,
    role:        session.role,
    name:        session.name,
    affiliate:   isGlobalRole(session.role) ? session.affiliate : perspective,
    affiliates:  getAllowedAffiliates(session),
    perspective,
  })
}
