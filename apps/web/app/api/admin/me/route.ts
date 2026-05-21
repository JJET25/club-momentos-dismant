import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  return NextResponse.json({ id: session.sub, role: session.role, name: session.name })
}
