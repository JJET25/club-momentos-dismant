import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { MANAGER_ROLES } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildInvoiceApprovedEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/firebase-admin'

// Solo owners y admins pueden verificar — los empleados solo registran
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado: se requiere rol admin u owner' }, { status: 403 })
  }

  const { id: invoiceId } = await params
  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, member_id, points_generated, status, verification_status, uuid_cfdi, total_mxn,
      members!member_id ( id, full_name, email, fcm_token )
    `)
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }
  if (invoice.verification_status === 'verified') {
    return NextResponse.json({ error: 'Esta factura ya fue verificada' }, { status: 409 })
  }
  if (invoice.status === 'rejected' || invoice.status === 'cancelled') {
    return NextResponse.json({ error: 'No se puede verificar una factura rechazada o cancelada' }, { status: 409 })
  }

  const member = (invoice.members as unknown) as {
    id: string; full_name: string; email: string; fcm_token: string | null
  } | null
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
  const newBalance = currentBalance + points

  // Crear ledger entry — append-only
  await supabase.from('ledger_entries').insert({
    id:            crypto.randomUUID(),
    member_id:     invoice.member_id,
    type:          'invoice',
    points,
    balance_after: newBalance,
    description:   `Factura verificada: ${invoice.uuid_cfdi.slice(0, 8)}…`,
    invoice_id:    invoiceId,
    operator_id:   session.sub,
  })

  // Marcar como verificada y aprobada
  await supabase
    .from('invoices')
    .update({
      verification_status: 'verified',
      verified_by:         session.sub,
      verified_at:         new Date().toISOString(),
      status:              'approved',
      approved_by:         session.sub,
      approved_at:         new Date().toISOString(),
    })
    .eq('id', invoiceId)

  // Audit log
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invoice.verified',
    target_type: 'invoice',
    target_id:   invoiceId,
    metadata:    { points, balance_after: newBalance, uuid_cfdi: invoice.uuid_cfdi },
  })

  // Notificaciones (fire-and-forget)
  const notifTitle = '¡Factura verificada!'
  const notifBody  = `+${points.toLocaleString('es-MX')} puntos acreditados a tu cuenta.`

  supabase.from('notifications').insert({
    id:        crypto.randomUUID(),
    member_id: invoice.member_id,
    type:      'invoice.approved',
    title:     notifTitle,
    body:      notifBody,
    metadata:  { invoice_id: invoiceId, points, new_balance: newBalance },
  }).then(() => {}, console.error)

  if (member?.fcm_token) {
    sendPushNotification({
      fcmToken: member.fcm_token,
      title:    notifTitle,
      body:     notifBody,
      data:     { type: 'invoice.verified', invoice_id: invoiceId, url: '/statement' },
    }).catch(console.error)
  }

  if (member?.email) {
    sendEmail({
      to:      member.email,
      subject: '✅ Tu factura fue verificada — Club Momentos Dismant',
      html:    buildInvoiceApprovedEmail({
        userName:   member.full_name,
        uuidCfdi:   invoice.uuid_cfdi,
        totalMxn:   invoice.total_mxn,
        points,
        newBalance,
      }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, points_credited: points, balance_after: newBalance })
}
