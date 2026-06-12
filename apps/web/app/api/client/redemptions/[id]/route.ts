import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body   = await req.json()
  const { delivery_address, action, dispute_reason } = body

  const supabase = createAdminClient()

  const { data: redemption } = await supabase
    .from('redemptions')
    .select('id, status, member_id, delivery_address, shipping_info, reward_skus!sku_id(is_digital)')
    .eq('id', id)
    .eq('member_id', session.sub)
    .single()

  if (!redemption) {
    return NextResponse.json({ error: 'Canje no encontrado' }, { status: 404 })
  }

  // ── Actualizar dirección ──────────────────────────────────────
  if (delivery_address) {
    if (redemption.status !== 'active') {
      return NextResponse.json({ error: 'Solo se puede actualizar la dirección de canjes pendientes' }, { status: 409 })
    }
    const { error } = await supabase.from('redemptions').update({ delivery_address }).eq('id', id)
    if (error) return NextResponse.json({ error: 'Error al guardar la dirección' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Confirmar recepción ───────────────────────────────────────
  if (action === 'confirm_delivery') {
    if (!['used', 'shipped'].includes(redemption.status)) {
      return NextResponse.json({ error: 'Solo puedes confirmar canjes entregados o en tránsito' }, { status: 409 })
    }
    const { error } = await supabase.from('redemptions')
      .update({ status: 'confirmed' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Error al confirmar' }, { status: 500 })

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(), actor_id: session.sub,
      action: 'redemption.confirmed_by_member', target_type: 'redemption', target_id: id,
      metadata: { member_id: session.sub },
    })
    return NextResponse.json({ ok: true, status: 'confirmed' })
  }

  // ── Reportar no recibido ──────────────────────────────────────
  if (action === 'dispute_delivery') {
    if (!['used', 'shipped', 'confirmed'].includes(redemption.status)) {
      return NextResponse.json({ error: 'No se puede disputar este canje' }, { status: 409 })
    }
    if (!dispute_reason?.trim()) {
      return NextResponse.json({ error: 'Describe el motivo del reporte' }, { status: 400 })
    }

    const existingInfo = (redemption.shipping_info as Record<string, unknown>) ?? {}
    const updatedInfo = {
      ...existingInfo,
      dispute: { reason: dispute_reason.trim(), reported_at: new Date().toISOString() },
    }

    const { error } = await supabase.from('redemptions')
      .update({ status: 'disputed', shipping_info: updatedInfo })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Error al reportar' }, { status: 500 })

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(), actor_id: session.sub,
      action: 'redemption.disputed_by_member', target_type: 'redemption', target_id: id,
      metadata: { member_id: session.sub, reason: dispute_reason.trim() },
    })
    return NextResponse.json({ ok: true, status: 'disputed' })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}
