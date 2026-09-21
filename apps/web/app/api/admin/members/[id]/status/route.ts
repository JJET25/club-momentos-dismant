import { SCOPED_MANAGER_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: memberId } = await params
  const { status, reason } = await req.json()

  if (!['active', 'suspended'].includes(status)) {
    return NextResponse.json({ error: 'Estatus inválido' }, { status: 400 })
  }
  if (status === 'suspended' && !reason?.trim()) {
    return NextResponse.json({ error: 'La razón de suspensión es obligatoria' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Este endpoint sirve tanto para suspender clientes (Miembros, scoped por
  // affiliate/perspectiva) como cuentas de staff (Equipo, siempre global,
  // solo el Propietario).
  const { data: target } = await supabase
    .from('members')
    .select('id, affiliate, roles!role_id(name)')
    .eq('id', memberId)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const targetRole = (target.roles as unknown as { name: string } | null)?.name
  const isClient = targetRole === 'member'

  if (isClient) {
    const affiliate = getEffectiveAffiliate(session, req)
    if (affiliate && target.affiliate !== affiliate) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }
  } else if (session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede cambiar el estatus del equipo' }, { status: 403 })
  }

  const { error } = await supabase
    .from('members')
    .update({ status })
    .eq('id', memberId)

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar el estatus' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      status === 'suspended' ? 'member.suspended' : 'member.reactivated',
    target_type: 'member',
    target_id:   memberId,
    metadata:    { reason: reason?.trim() ?? null },
  })

  return NextResponse.json({ ok: true })
}
