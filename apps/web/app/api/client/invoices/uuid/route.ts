import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { isValidCFDIUUID, calculatePoints, isInvoiceWithinPeriod } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { uuid, totalMxn, rfcEmisor, issuedAt } = body

  if (!uuid?.trim()) {
    return NextResponse.json({ error: 'El UUID es obligatorio.' }, { status: 400 })
  }
  if (!isValidCFDIUUID(uuid.trim())) {
    return NextResponse.json({ error: 'Formato de UUID inválido. Debe ser: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX.' }, { status: 422 })
  }
  if (!totalMxn || isNaN(Number(totalMxn)) || Number(totalMxn) <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor a cero.' }, { status: 422 })
  }
  if (!rfcEmisor?.trim()) {
    return NextResponse.json({ error: 'El RFC emisor es obligatorio.' }, { status: 422 })
  }
  if (!issuedAt) {
    return NextResponse.json({ error: 'La fecha de emisión es obligatoria.' }, { status: 422 })
  }

  const normalizedUuid   = uuid.trim().toLowerCase()
  const normalizedRfcEmi = rfcEmisor.trim().toUpperCase()
  const issuedDate       = new Date(issuedAt)

  if (isNaN(issuedDate.getTime())) {
    return NextResponse.json({ error: 'Fecha de emisión inválida.' }, { status: 422 })
  }

  const supabase   = createAdminClient()
  const memberId   = session.sub

  // Obtener RFC del miembro
  const { data: member } = await supabase
    .from('members')
    .select('rfc')
    .eq('id', memberId)
    .single()

  if (!member) return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 })

  // Validación: RFC emisor == RFC de Dismant
  const dismantRfc = process.env.DISMANT_RFC
  if (dismantRfc && normalizedRfcEmi !== dismantRfc.toUpperCase()) {
    return NextResponse.json({ error: 'Esta factura no fue emitida por la empresa correspondiente.' }, { status: 422 })
  }

  // Validación: antigüedad <= 90 días
  const maxDays = parseInt(process.env.INVOICE_MAX_AGE_DAYS ?? '90')
  if (!isInvoiceWithinPeriod(issuedDate, maxDays)) {
    return NextResponse.json({ error: `Esta factura está fuera del período permitido (máximo ${maxDays} días).` }, { status: 422 })
  }

  // Validación: UUID no duplicado
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('uuid_cfdi', normalizedUuid)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Esta factura ya fue registrada anteriormente.' }, { status: 409 })
  }

  const pointsPerAmount  = parseInt(process.env.POINTS_PER_AMOUNT ?? '100')
  const pointsGenerated  = calculatePoints(Number(totalMxn), pointsPerAmount)

  const invoiceId = crypto.randomUUID()
  const { data: invoice, error: insertError } = await supabase
    .from('invoices')
    .insert({
      id:               invoiceId,
      member_id:        memberId,
      uuid_cfdi:        normalizedUuid,
      rfc_emisor:       normalizedRfcEmi,
      rfc_receptor:     member.rfc.toUpperCase(),
      total_mxn:        Number(totalMxn),
      issued_at:        issuedDate.toISOString(),
      status:           'pending',
      xml_storage_key:  null,
      points_generated: pointsGenerated,
    })
    .select('id, uuid_cfdi, total_mxn, issued_at, status, points_generated, created_at')
    .single()

  if (insertError || !invoice) {
    return NextResponse.json({ error: 'Error al registrar la factura.' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    memberId,
    action:      'invoice.uploaded_uuid',
    target_type: 'invoice',
    target_id:   invoiceId,
    metadata:    { uuid_cfdi: normalizedUuid, total_mxn: Number(totalMxn), method: 'manual_uuid' },
  })

  return NextResponse.json({ invoice }, { status: 201 })
}
