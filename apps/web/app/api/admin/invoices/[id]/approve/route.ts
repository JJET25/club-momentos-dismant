import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const ADMIN_ROLES = ['owner', 'admin', 'employee']

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: invoiceId } = await params
  const supabase = createAdminClient()

  // Obtener factura
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, member_id, points_generated, status, uuid_cfdi, total_mxn')
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
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
  const newBalance = currentBalance + points

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

  // Actualizar factura
  await supabase
    .from('invoices')
    .update({
      status:      'approved',
      approved_by: session.sub,
      approved_at: new Date().toISOString(),
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

  return NextResponse.json({ ok: true, points_credited: points, balance_after: newBalance })
}
