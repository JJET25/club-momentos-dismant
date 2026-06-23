import { STAFF_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildInvoiceRejectedEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/firebase-admin'
import { getBrand } from '@/lib/brand'


export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: invoiceId } = await params
  const { reason } = await req.json()

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'La razón de rechazo es obligatoria' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, status, member_id, uuid_cfdi,
      members!member_id ( id, full_name, email, fcm_token, affiliate )
    `)
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }
  if (invoice.status !== 'pending') {
    return NextResponse.json({ error: 'Solo se pueden rechazar facturas pendientes' }, { status: 409 })
  }

  const member = (invoice.members as unknown) as { id: string; full_name: string; email: string; fcm_token: string | null; affiliate?: string } | null

  await supabase
    .from('invoices')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', invoiceId)

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invoice.rejected',
    target_type: 'invoice',
    target_id:   invoiceId,
    metadata:    { reason: reason.trim(), uuid_cfdi: invoice.uuid_cfdi },
  })

  // ── Notificaciones ──

  const notifTitle = 'Factura no procesada'
  const notifBody  = `Tu factura no pudo ser aprobada. Razón: ${reason.trim()}`

  // 1. Notificación in-app
  supabase.from('notifications').insert({
    id:        crypto.randomUUID(),
    member_id: invoice.member_id,
    type:      'invoice.rejected',
    title:     notifTitle,
    body:      notifBody,
    metadata:  { invoice_id: invoiceId, uuid_cfdi: invoice.uuid_cfdi, reason: reason.trim() },
  }).then(() => {}, console.error)

  // 2. Push notification
  if (member?.fcm_token) {
    sendPushNotification({
      fcmToken: member.fcm_token,
      title:    notifTitle,
      body:     notifBody,
      data:     { type: 'invoice.rejected', invoice_id: invoiceId },
    }).catch(console.error)
  }

  // 3. Email
  if (member?.email) {
    const brandName = getBrand(member.affiliate).name
    sendEmail({
      to:      member.email,
      subject: `Tu factura no pudo ser procesada — ${brandName}`,
      html:    buildInvoiceRejectedEmail({
        userName:  member.full_name,
        uuidCfdi:  invoice.uuid_cfdi,
        reason:    reason.trim(),
        affiliate: member.affiliate,
      }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
