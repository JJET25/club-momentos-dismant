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

  const { id } = await params
  const { status } = await req.json()
  const affiliate = getEffectiveAffiliate(session, req)

  if (!['active', 'paused', 'discontinued'].includes(status)) {
    return NextResponse.json({ error: 'Estatus no válido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: current } = await supabase.from('reward_skus').select('affiliate').eq('id', id).maybeSingle()
  if (!current || (affiliate && current.affiliate !== affiliate)) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('reward_skus')
    .update({ status })
    .eq('id', id)
    .select('id, name, status')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Error al actualizar estatus' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      `catalog.sku_${status}`,
    target_type: 'reward_sku',
    target_id:   id,
    metadata:    { sku_name: data.name },
  })

  return NextResponse.json({ sku: data })
}
