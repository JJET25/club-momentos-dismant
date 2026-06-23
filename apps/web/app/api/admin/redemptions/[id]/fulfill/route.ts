import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { STAFF_ROLES } from '@/lib/permissions'
import { sendEmail, buildPrizeDeliveredEmail, buildShippingNotificationEmail, buildPhysicalDeliveredEmail } from '@/lib/resend'
import { downloadFileContent } from '@/lib/storage'
import path from 'path'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id }  = await params
  const body    = await req.json()
  const { action, prize_content, prize_file_key, shipping_info } = body as {
    action:          'ship' | 'deliver'
    prize_content?:  string
    prize_file_key?: string
    shipping_info?: {
      carrier:         string
      tracking_number: string
      tracking_url?:   string
      estimated_date?: string
    }
  }

  if (!action) return NextResponse.json({ error: 'Falta el campo action' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: redemption } = await supabase
    .from('redemptions')
    .select(`
      id, status, voucher_code, points_spent, member_id, delivery_address,
      prize_file_key,
      reward_skus!sku_id ( name, is_digital ),
      members!member_id ( full_name, email, affiliate )
    `)
    .eq('id', id)
    .single()

  if (!redemption) return NextResponse.json({ error: 'Canje no encontrado' }, { status: 404 })

  const sku    = redemption.reward_skus as unknown as { name: string; is_digital: boolean } | null
  const member = redemption.members   as unknown as { full_name: string; email: string; affiliate?: string } | null

  // ── Marcar enviado (físico) ──────────────────────────────────
  if (action === 'ship') {
    if (sku?.is_digital) {
      return NextResponse.json({ error: 'Los premios digitales no se envían físicamente' }, { status: 400 })
    }
    if (redemption.status !== 'active') {
      return NextResponse.json({ error: 'Solo se pueden marcar como enviados canjes pendientes' }, { status: 409 })
    }
    if (!shipping_info?.carrier || !shipping_info?.tracking_number) {
      return NextResponse.json({ error: 'Se requiere paquetería y número de guía' }, { status: 400 })
    }

    const info = { ...shipping_info, shipped_at: new Date().toISOString() }
    const { error } = await supabase.from('redemptions')
      .update({ status: 'shipped', shipping_info: info })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Error al actualizar el canje' }, { status: 500 })

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(), actor_id: session.sub,
      action: 'redemption.shipped', target_type: 'redemption', target_id: id,
      metadata: { voucher_code: redemption.voucher_code, member_id: redemption.member_id, sku_name: sku?.name, carrier: shipping_info.carrier, tracking_number: shipping_info.tracking_number, fulfilled_by: session.name },
    })

    if (member?.email) {
      sendEmail({
        to:        member.email,
        subject:   `Tu premio está en camino: ${sku?.name}`,
        affiliate: member.affiliate,
        html:      buildShippingNotificationEmail({
          userName: member.full_name, skuName: sku?.name ?? 'Premio',
          carrier: shipping_info.carrier, trackingNumber: shipping_info.tracking_number,
          trackingUrl: shipping_info.tracking_url, estimatedDate: shipping_info.estimated_date,
          affiliate: member.affiliate,
        }),
      }).catch(err => console.error('[fulfill] shipping email error:', err))
    }

    return NextResponse.json({ ok: true, status: 'shipped' })
  }

  // ── Confirmar entrega ────────────────────────────────────────
  if (action === 'deliver') {
    if (!['active', 'shipped'].includes(redemption.status)) {
      return NextResponse.json({ error: 'Este canje ya fue procesado' }, { status: 409 })
    }
    if (sku?.is_digital && !prize_content?.trim() && !prize_file_key?.trim()) {
      return NextResponse.json({ error: 'Para premios digitales ingresa un código o sube un archivo' }, { status: 400 })
    }

    // Combinar file_key: usar el nuevo si se pasó, si no, el que ya tenía
    const finalFileKey = prize_file_key?.trim() || (redemption.prize_file_key as string | null) || null

    const update: Record<string, unknown> = { status: 'used' }
    if (prize_content?.trim()) update.prize_content = prize_content.trim()
    if (finalFileKey) update.prize_file_key = finalFileKey

    const { error } = await supabase.from('redemptions').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: 'Error al actualizar el canje' }, { status: 500 })

    await supabase.from('audit_log').insert({
      id: crypto.randomUUID(), actor_id: session.sub,
      action: 'redemption.fulfilled', target_type: 'redemption', target_id: id,
      metadata: { voucher_code: redemption.voucher_code, member_id: redemption.member_id, sku_name: sku?.name, has_file: !!finalFileKey, fulfilled_by: session.name },
    })

    if (member?.email) {
      if (sku?.is_digital) {
        // Descarga el archivo de Storage para adjuntarlo si existe
        let attachments: Array<{ filename: string; content: string }> = []
        let fileName: string | undefined

        if (finalFileKey) {
          try {
            const fileBuffer = await downloadFileContent(finalFileKey)
            if (fileBuffer) {
              fileName = path.basename(finalFileKey)
              attachments = [{ filename: fileName, content: fileBuffer.toString('base64') }]
            }
          } catch (err) {
            console.error('[fulfill] Failed to download prize file for email attachment:', err)
          }
        }

        sendEmail({
          to:        member.email,
          subject:   `¡Tu premio fue entregado! ${sku?.name}`,
          affiliate: member.affiliate,
          html:      buildPrizeDeliveredEmail({
            userName: member.full_name, skuName: sku?.name ?? 'Premio',
            prizeContent: prize_content?.trim(), hasFile: attachments.length > 0,
            fileName, isDigital: true, voucherCode: redemption.voucher_code,
            affiliate: member.affiliate,
          }),
          attachments: attachments.length ? attachments : undefined,
        }).catch(err => console.error('[fulfill] delivery email error:', err))
      } else {
        // Físico: mensaje simple de entrega confirmada
        sendEmail({
          to:        member.email,
          subject:   `¡Tu premio fue entregado! ${sku?.name}`,
          affiliate: member.affiliate,
          html:      buildPhysicalDeliveredEmail({
            userName: member.full_name, skuName: sku?.name ?? 'Premio',
            voucherCode: redemption.voucher_code,
            affiliate: member.affiliate,
          }),
        }).catch(err => console.error('[fulfill] delivery email error:', err))
      }
    }

    return NextResponse.json({ ok: true, status: 'used' })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
