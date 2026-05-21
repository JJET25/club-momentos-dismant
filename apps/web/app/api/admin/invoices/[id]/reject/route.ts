import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const ADMIN_ROLES = ['owner', 'admin', 'employee']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !ADMIN_ROLES.includes(session.role)) {
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
    .select('id, status, member_id, uuid_cfdi')
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }
  if (invoice.status !== 'pending') {
    return NextResponse.json({ error: 'Solo se pueden rechazar facturas pendientes' }, { status: 409 })
  }

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

  return NextResponse.json({ ok: true })
}
