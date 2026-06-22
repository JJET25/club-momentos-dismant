import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const CHANGEABLE_ROLES = ['admin', 'employee'] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede cambiar roles' }, { status: 403 })
  }

  const { id: targetId } = await params

  if (targetId === session.sub) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
  }

  const { role: newRole } = await req.json()

  if (!CHANGEABLE_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'Solo se puede asignar el rol admin o employee' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Obtener el rol actual del miembro y verificar que no sea owner
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
  if (currentRoleName === 'member') {
    return NextResponse.json({ error: 'No se puede cambiar el rol de un miembro del club' }, { status: 400 })
  }

  // Obtener ID del nuevo rol
  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('name', newRole)
    .single()

  if (!roleRow) {
    return NextResponse.json({ error: 'Rol no encontrado en la base de datos' }, { status: 500 })
  }

  // Actualizar el rol
  const { error } = await supabase
    .from('members')
    .update({ role_id: roleRow.id })
    .eq('id', targetId)

  if (error) {
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
      member_name:  targetMember.full_name,
      previous_role: currentRoleName,
      new_role:      newRole,
    },
  })

  return NextResponse.json({ ok: true, new_role: newRole })
}
