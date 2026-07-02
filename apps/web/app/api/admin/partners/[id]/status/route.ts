import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const { status } = await req.json()

  if (!['active', 'suspended'].includes(status)) {
    return NextResponse.json({ error: 'Estatus no válido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partners')
    .update({ status })
    .eq('id', id)
    .select('id, name, status')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Error al actualizar estatus' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      `partner.${status === 'suspended' ? 'suspended' : 'reactivated'}`,
    target_type: 'partner',
    target_id:   id,
    metadata:    { name: data.name },
  })

  return NextResponse.json({ partner: data })
}
