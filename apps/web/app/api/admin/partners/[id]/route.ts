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
  const { name, logo_url, is_verified } = await req.json()

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'El nombre del aliado es obligatorio' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (name        !== undefined) update.name        = name.trim()
  if (logo_url    !== undefined) update.logo_url     = logo_url?.trim() || null
  if (is_verified !== undefined) update.is_verified  = is_verified

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partners')
    .update(update)
    .eq('id', id)
    .select('id, name, logo_url, is_verified, status')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Error al actualizar aliado' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'partner.updated',
    target_type: 'partner',
    target_id:   id,
    metadata:    { name: data.name },
  })

  return NextResponse.json({ partner: data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede eliminar aliados' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: partner } = await supabase
    .from('partners')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!partner) return NextResponse.json({ error: 'Aliado no encontrado' }, { status: 404 })

  const { count: promotionCount } = await supabase
    .from('partner_promotions')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', id)

  if ((promotionCount ?? 0) > 0) {
    return NextResponse.json({
      error: 'Este aliado tiene promociones registradas. Suspéndelo en lugar de eliminarlo para conservar la trazabilidad.',
      canSuspend: true,
    }, { status: 409 })
  }

  const { error } = await supabase.from('partners').delete().eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al eliminar el aliado' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'partner.deleted',
    target_type: 'partner',
    target_id:   id,
    metadata:    { name: partner.name },
  })

  return NextResponse.json({ ok: true })
}
