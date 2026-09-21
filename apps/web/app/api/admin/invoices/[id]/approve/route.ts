import { STAFF_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildInvoiceApprovedEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/firebase-admin'
import { getBrand } from '@/lib/brand'


export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: invoiceId } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  // Obtener factura + datos del miembro en una sola consulta
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, member_id, points_generated, status, uuid_cfdi, total_mxn,
      members!member_id ( id, full_name, email, fcm_token, affiliate )
    `)
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }

  const member = (invoice.members as unknown) as { id: string; full_name: string; email: string; fcm_token: string | null; affiliate?: string } | null

  if (affiliate && member?.affiliate !== affiliate) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }
  if (invoice.status !== 'pending') {
    return NextResponse.json({ error: 'Solo se pueden aprobar facturas pendientes' }, { status: 409 })
  }
  const points = invoice.points_generated ?? 0

  // Saldo actual del miembro
  const { data: latest } = await supabase
    .from('ledger_entries')
    .select('balance_after')
    .eq('member_id', invoice.member_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentBalance = latest?.balance_after ?? 0
  const newBalance     = currentBalance + points

  // Crear ledger entry
  await supabase.from('ledger_entries').insert({
    id:            crypto.randomUUID(),
    member_id:     invoice.member_id,
    type:          'invoice',
    points,
    balance_after: newBalance,
    description:   `Factura aprobada: ${invoice.uuid_cfdi.slice(0, 8)}...`,
    invoice_id:    invoiceId,
    operator_id:   session.sub,
  })

  // Actualizar factura — también marca como verificada porque los puntos ya se acreditaron
  await supabase
    .from('invoices')
    .update({
      status:              'approved',
      approved_by:         session.sub,
      approved_at:         new Date().toISOString(),
      verification_status: 'verified',
      verified_by:         session.sub,
      verified_at:         new Date().toISOString(),
    })
    .eq('id', invoiceId)

  // Audit log
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invoice.approved',
    target_type: 'invoice',
    target_id:   invoiceId,
    metadata:    { points, balance_after: newBalance, uuid_cfdi: invoice.uuid_cfdi },
  })

  // ── Notificaciones (fire-and-forget, no bloquean la respuesta) ──

  const notifTitle = '¡Factura validada!'
  const notifBody  = `+${points.toLocaleString('es-MX')} puntos acreditados a tu cuenta.`

  // 1. Notificación in-app
  supabase.from('notifications').insert({
    id:        crypto.randomUUID(),
    member_id: invoice.member_id,
    type:      'invoice.approved',
    title:     notifTitle,
    body:      notifBody,
    metadata:  {
      invoice_id:  invoiceId,
      uuid_cfdi:   invoice.uuid_cfdi,
      points,
      new_balance: newBalance,
      total_mxn:   invoice.total_mxn,
    },
  }).then(() => {}, console.error)

  // 2. Push notification (FCM)
  if (member?.fcm_token) {
    sendPushNotification({
      fcmToken: member.fcm_token,
      title:    notifTitle,
      body:     notifBody,
      data: {
        type:       'invoice.approved',
        invoice_id: invoiceId,
        url:        '/statement',
      },
    }).catch(console.error)
  }

  // 3. Email
  if (member?.email) {
    const brandName = getBrand(member.affiliate).name
    sendEmail({
      to:        member.email,
      subject:   `✅ Tu factura fue validada — ${brandName}`,
      affiliate: member.affiliate,
      html:    buildInvoiceApprovedEmail({
        userName:   member.full_name,
        uuidCfdi:   invoice.uuid_cfdi,
        totalMxn:   invoice.total_mxn,
        points,
        newBalance,
        affiliate:  member.affiliate,
      }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, points_credited: points, balance_after: newBalance })
}
