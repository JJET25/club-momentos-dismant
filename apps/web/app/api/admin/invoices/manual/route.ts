import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { createAdminClient } from '@/lib/supabase'

// Registro manual de factura por staff — los puntos NO se acreditan aquí,
// sino cuando un manager ejecute el endpoint /verify.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json() as {
    memberId:         string
    points:           number
    totalMxn?:        number
    folioReferencia?: string
    description?:     string
    issuedAt?:        string
  }

  const { memberId, points, totalMxn, folioReferencia, description, issuedAt } = body

  if (!memberId) {
    return NextResponse.json({ error: 'Se requiere memberId' }, { status: 400 })
  }
  if (typeof points !== 'number' || points <= 0 || !Number.isInteger(points)) {
    return NextResponse.json({ error: 'Los puntos deben ser un entero positivo' }, { status: 400 })
  }

  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  const { data: member } = await supabase
    .from('members')
    .select('id, rfc, affiliate')
    .eq('id', memberId)
    .maybeSingle()

  if (!member || (affiliate && member.affiliate !== affiliate)) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const invoiceId = crypto.randomUUID()
  // UUID sintético para facturas manuales — identifica que no es un CFDI real
  const syntheticUuid = `MANUAL-${invoiceId.slice(0, 18).toUpperCase()}`

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      id:                  invoiceId,
      member_id:           memberId,
      uuid_cfdi:           syntheticUuid,
      rfc_emisor:          process.env.DISMANT_RFC ?? 'XAXX010101000',
      rfc_receptor:        member.rfc,
      total_mxn:           totalMxn ?? 0,
      issued_at:           issuedAt ? new Date(issuedAt).toISOString() : new Date().toISOString(),
      status:              'pending',
      verification_status: 'pending',
      points_generated:    points,
      registered_by:       session.sub,
      ...(folioReferencia?.trim() ? { folio_referencia: folioReferencia.trim() } : {}),
    })
    .select('id, uuid_cfdi, status, verification_status, points_generated, created_at')
    .single()

  if (error || !invoice) {
    console.error('[invoices/manual] Error al insertar:', error)
    return NextResponse.json({ error: 'Error al registrar la factura' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invoice.manual_registered',
    target_type: 'invoice',
    target_id:   invoiceId,
    metadata:    { member_id: memberId, points, total_mxn: totalMxn, description },
  })

  return NextResponse.json({ invoice }, { status: 201 })
}
