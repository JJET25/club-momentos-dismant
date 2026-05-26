import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const supabase = createAdminClient()

  // ── Acciones de aprobación / rechazo ───────────────────────
  if (body.action === 'approve') {
    const { data: promo } = await supabase
      .from('partner_promotions')
      .select('valid_from')
      .eq('id', id)
      .single()

    const newStatus = promo && new Date() >= new Date(promo.valid_from) ? 'active' : 'approved'

    const { data, error } = await supabase
      .from('partner_promotions')
      .update({ status: newStatus, approved_by: session.sub })
      .eq('id', id)
      .select('id, title, status')
      .single()

    if (error) return NextResponse.json({ error: 'Error al aprobar promoción' }, { status: 500 })

    await supabase.from('audit_log').insert({
      actor_id:    session.sub,
      action:      'promotion.approved',
      target_type: 'partner_promotion',
      target_id:   id,
      metadata:    { new_status: newStatus },
    })

    return NextResponse.json({ promotion: data })
  }

  if (body.action === 'reject') {
    const reason = body.rejection_reason?.trim() || 'Sin razón especificada'

    const { data, error } = await supabase
      .from('partner_promotions')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select('id, title, status')
      .single()

    if (error) return NextResponse.json({ error: 'Error al rechazar promoción' }, { status: 500 })

    await supabase.from('audit_log').insert({
      actor_id:    session.sub,
      action:      'promotion.rejected',
      target_type: 'partner_promotion',
      target_id:   id,
      metadata:    { rejection_reason: reason },
    })

    return NextResponse.json({ promotion: data })
  }

  // ── Actualización de campos ────────────────────────────────
  const {
    title, description, image_url, destination_url,
    geo_type, geo_states, geo_cities, valid_from, valid_until, featured,
  } = body

  const updates: Record<string, unknown> = {}
  if (title !== undefined)           updates.title           = title.trim()
  if (description !== undefined)     updates.description     = description?.trim() || null
  if (image_url !== undefined)       updates.image_url       = image_url || null
  if (destination_url !== undefined) updates.destination_url = destination_url?.trim() || null
  if (geo_type !== undefined)        updates.geo_type        = geo_type
  if (geo_states !== undefined)      updates.geo_states      = geo_states
  if (geo_cities !== undefined)      updates.geo_cities      = geo_cities
  if (valid_from !== undefined)      updates.valid_from      = valid_from
  if (valid_until !== undefined)     updates.valid_until     = valid_until
  if (featured !== undefined)        updates.featured        = featured

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('partner_promotions')
    .update(updates)
    .eq('id', id)
    .select('id, title, status')
    .single()

  if (error) return NextResponse.json({ error: 'Error al actualizar promoción' }, { status: 500 })

  await supabase.from('audit_log').insert({
    actor_id:    session.sub,
    action:      'promotion.updated',
    target_type: 'partner_promotion',
    target_id:   id,
    metadata:    updates,
  })

  return NextResponse.json({ promotion: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el owner puede eliminar promociones' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from('partner_promotions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Error al eliminar promoción' }, { status: 500 })

  await supabase.from('audit_log').insert({
    actor_id:    session.sub,
    action:      'promotion.deleted',
    target_type: 'partner_promotion',
    target_id:   id,
    metadata:    {},
  })

  return NextResponse.json({ ok: true })
}
