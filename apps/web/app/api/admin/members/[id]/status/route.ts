import { MANAGER_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
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
