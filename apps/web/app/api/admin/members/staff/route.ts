import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

/** Devuelve los miembros del equipo interno (owner, admin, employee) con su rol. */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede ver este recurso' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { data: roles } = await supabase
    .from('roles')
    .select('id, name')
    .in('name', ['owner', 'admin', 'employee'])

  if (!roles?.length) return NextResponse.json([])

  const roleIds = roles.map(r => r.id)
  const roleById = Object.fromEntries(roles.map(r => [r.id, r.name]))

  const { data: members, error } = await supabase
    .from('members')
    .select('id, full_name, email, company_name, role_id, status')
    .in('role_id', roleIds)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error al obtener el equipo' }, { status: 500 })

  return NextResponse.json(
    (members ?? []).map(m => ({ ...m, role: roleById[m.role_id] ?? m.role_id }))
  )
}
