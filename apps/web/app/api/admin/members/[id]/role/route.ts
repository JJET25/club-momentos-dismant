import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { isValidRFC } from '@/lib/utils'
import { isAffiliate } from '@/lib/scope'

const CHANGEABLE_ROLES = ['admin', 'team_admin', 'employee', 'member'] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede cambiar roles' }, { status: 403 })
  }

  const { id: targetId } = await params

  if (targetId === session.sub) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
  }

  const body = await req.json()
  const newRole = body.role

  if (!CHANGEABLE_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'Rol inválido. Solo se puede asignar admin, employee o member.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: targetMember } = await supabase
    .from('members')
    .select('id, full_name, role_id, roles!role_id(name)')
    .eq('id', targetId)
    .single()

  if (!targetMember) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const currentRoleName = (targetMember.roles as unknown as { name: string } | null)?.name

  if (currentRoleName === 'owner') {
    return NextResponse.json({ error: 'No se puede cambiar el rol de otro Propietario' }, { status: 400 })
  }
  if (currentRoleName === newRole) {
    return NextResponse.json({ error: 'El miembro ya tiene ese rol' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  // Al convertir a cliente (member) a alguien del equipo, se requieren datos
  // fiscales reales: las cuentas de staff se crean con RFC sintético
  // (STFF...) y ubicación placeholder, que romperían la validación CFDI y el
  // filtro geográfico del catálogo si se dejan tal cual.
  if (newRole === 'member' && currentRoleName !== 'member') {
    const rfc          = String(body.rfc ?? '').toUpperCase().trim()
    const companyName  = String(body.companyName ?? '').trim()
    const locationState = String(body.locationState ?? '').trim()
    const locationCity  = String(body.locationCity ?? '').trim()

    if (!rfc || !companyName || !locationState || !locationCity) {
      return NextResponse.json(
        { error: 'Para convertir a cliente se requieren RFC, empresa, estado y ciudad reales' },
        { status: 400 }
      )
    }
    if (!isValidRFC(rfc)) {
      return NextResponse.json({ error: 'Formato de RFC inválido' }, { status: 400 })
    }

    updates.rfc = rfc
    updates.company_name = companyName
    updates.location_state = locationState
    updates.location_city = locationCity
  }

  // team_admin administra una sola empresa — siempre hay que indicar cuál,
  // sin importar de qué rol venía (cliente, employee, admin, etc.).
  if (newRole === 'team_admin') {
    if (!isAffiliate(body.affiliate)) {
      return NextResponse.json({ error: 'Debes elegir la empresa (Dismant o Lauti) que administrará' }, { status: 400 })
    }
    updates.affiliate = body.affiliate
  }

  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single()

  if (!roleRow) {
    return NextResponse.json({ error: 'Rol no encontrado en la base de datos' }, { status: 500 })
  }

  updates.role_id = roleRow.id

  const { error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', targetId)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ese correo ya está en uso.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al actualizar el rol' }, { status: 500 })
  }

  // Audit log
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'member.role_changed',
    target_type: 'member',
    target_id:   targetId,
    metadata:    {
      member_name:   targetMember.full_name,
      previous_role: currentRoleName,
      new_role:      newRole,
    },
  })

  return NextResponse.json({ ok: true, new_role: newRole })
}
