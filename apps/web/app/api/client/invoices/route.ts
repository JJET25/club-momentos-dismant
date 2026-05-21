import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, R2_PATHS } from '@/lib/r2'
import { parseCFDIXml, calculatePoints, isInvoiceWithinPeriod, isValidCFDIUUID } from '@/lib/utils'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Leer el multipart form
  const formData = await req.formData()
  const file = formData.get('xml') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.xml')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos XML de CFDI.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo no debe superar 2 MB.' }, { status: 400 })
  }

  const xmlText = await file.text()

  // Extraer datos del CFDI
  const cfdi = parseCFDIXml(xmlText)
  if (!cfdi) {
    return NextResponse.json({ error: 'No se pudo leer el XML. Verifica que sea un CFDI válido.' }, { status: 422 })
  }

  if (!isValidCFDIUUID(cfdi.uuid)) {
    return NextResponse.json({ error: 'El Folio Fiscal del XML no tiene formato válido.' }, { status: 422 })
  }

  const supabase = createAdminClient()
  const memberId = session.sub

  // Obtener RFC del miembro
  const { data: member } = await supabase
    .from('members')
    .select('rfc')
    .eq('id', memberId)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  // Validación: RFC receptor == RFC del miembro
  if (cfdi.rfcReceptor.toUpperCase() !== member.rfc.toUpperCase()) {
    return NextResponse.json({ error: 'Esta factura no está a tu nombre.' }, { status: 422 })
  }

  // Validación: RFC emisor == RFC de Dismant
  const dismantRfc = process.env.DISMANT_RFC
  if (dismantRfc && cfdi.rfcEmisor.toUpperCase() !== dismantRfc.toUpperCase()) {
    return NextResponse.json({ error: 'Esta factura no fue emitida por Dismant.' }, { status: 422 })
  }

  // Validación: antigüedad <= 90 días
  const maxDays = parseInt(process.env.INVOICE_MAX_AGE_DAYS ?? '90')
  if (!isInvoiceWithinPeriod(cfdi.issuedAt, maxDays)) {
    return NextResponse.json({ error: `Esta factura está fuera del período permitido (máximo ${maxDays} días).` }, { status: 422 })
  }

  // Validación: UUID no duplicado
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('uuid_cfdi', cfdi.uuid)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Esta factura ya fue registrada anteriormente.' }, { status: 409 })
  }

  // Subir XML a R2 (si está configurado)
  const xmlBuffer = Buffer.from(xmlText, 'utf-8')
  const r2Key = R2_PATHS.invoice(memberId, cfdi.uuid)
  let xmlStorageKey: string | null = null

  if (process.env.R2_ACCOUNT_ID) {
    try {
      await uploadFile(r2Key, xmlBuffer, 'application/xml')
      xmlStorageKey = r2Key
    } catch (err) {
      console.error('[invoices] Error al subir XML a R2:', err)
      // No bloqueamos el flujo si R2 falla
    }
  }

  // Calcular puntos estimados
  const pointsPerAmount = parseInt(process.env.POINTS_PER_AMOUNT ?? '100')
  const pointsGenerated = calculatePoints(cfdi.total, pointsPerAmount)

  // Insertar factura
  const invoiceId = crypto.randomUUID()
  const { data: invoice, error: insertError } = await supabase
    .from('invoices')
    .insert({
      id: invoiceId,
      member_id: memberId,
      uuid_cfdi: cfdi.uuid,
      rfc_emisor: cfdi.rfcEmisor.toUpperCase(),
      rfc_receptor: cfdi.rfcReceptor.toUpperCase(),
      total_mxn: cfdi.total,
      issued_at: cfdi.issuedAt.toISOString(),
      status: 'pending',
      xml_storage_key: xmlStorageKey,
      points_generated: pointsGenerated,
    })
    .select('id, uuid_cfdi, total_mxn, issued_at, status, points_generated, created_at')
    .single()

  if (insertError || !invoice) {
    console.error('[invoices] Error al insertar factura:', insertError)
    return NextResponse.json({ error: 'Error al registrar la factura. Intenta de nuevo.' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id: crypto.randomUUID(),
    actor_id: memberId,
    action: 'invoice.uploaded',
    target_type: 'invoice',
    target_id: invoiceId,
    metadata: { uuid_cfdi: cfdi.uuid, total_mxn: cfdi.total },
  })

  return NextResponse.json({ invoice }, { status: 201 })
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, uuid_cfdi, total_mxn, issued_at, status, points_generated, created_at, rejection_reason')
    .eq('member_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 })
  }

  return NextResponse.json({ invoices: data ?? [] })
}
