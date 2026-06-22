import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import crypto from 'crypto'

/** GET — Lista todos los miembros del equipo interno (owner, admin, employee) */
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

  const roleIds  = roles.map(r => r.id)
  const roleById = Object.fromEntries(roles.map(r => [r.id, r.name]))

  const { data: members, error } = await supabase
    .from('members')
    .select('id, full_name, email, company_name, role_id, status, created_at, last_login_at')
    .in('role_id', roleIds)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error al obtener el equipo' }, { status: 500 })

  return NextResponse.json(
    (members ?? []).map(m => ({ ...m, role: roleById[m.role_id] ?? m.role_id }))
  )
}

/** POST — Crea un nuevo miembro del equipo interno sin invitación */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede crear miembros del equipo' }, { status: 403 })
  }

  const { full_name, email, role } = await req.json()

  if (!full_name?.trim() || !email?.trim() || !role) {
    return NextResponse.json({ error: 'Nombre, correo y rol son obligatorios' }, { status: 400 })
  }
  if (!['admin', 'employee'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido. Solo se puede crear admin o empleado.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: roleRow, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', role)
    .single()

  if (roleError || !roleRow) {
    console.error('[POST /staff] roles query error:', roleError)
    return NextResponse.json({ error: 'Rol no encontrado en la base de datos' }, { status: 400 })
  }

  // RFC único auto-generado para cuentas internas (no son clientes)
  const internalRfc = `STFF${crypto.randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase()}`

  const { data: member, error } = await supabase
    .from('members')
    .insert({
      id:             crypto.randomUUID(),
      email:          email.toLowerCase().trim(),
      full_name:      full_name.trim(),
      company_name:   'Dismant',
      rfc:            internalRfc,
      location_state: 'Ciudad de México',
      location_city:  'CDMX',
      role_id:        roleRow.id,
      status:         'active',
    })
    .select('id, full_name, email, role_id, status')
    .single()

  if (error) {
    console.error('[POST /staff] insert error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo.' }, { status: 409 })
    }
    return NextResponse.json({ error: `Error al crear el miembro: ${error.message}` }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'staff.created',
    target_type: 'member',
    target_id:   member.id,
    metadata:    { role, email: email.toLowerCase().trim() },
  })

  return NextResponse.json({ ...member, role })
}
