import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import ExcelJS from 'exceljs'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate, getAffiliateRfc } from '@/lib/scope'
import { createAdminClient } from '@/lib/supabase'
import { calculatePoints } from '@/lib/utils'

// Carga masiva de facturas desde un archivo Excel — mismo patrón de
// preview → confirmación que /api/admin/members/bulk-points, pero crea
// registros de Invoice en `pending` (no acredita puntos aquí; se acreditan
// al verificar, igual que en el registro manual de una sola factura).

interface ExcelRow {
  invoiceNumber?: string
  rfcEmisor?:     string
  email:          string
  orderNumber?:   string
  issuedAt?:      string
  paidAt?:        string
  totalMxn:       number
  points?:        number
}

const HEADER_ALIASES: Record<string, keyof ExcelRow> = {
  numerodefactura:      'invoiceNumber',
  numerofactura:        'invoiceNumber',
  clave:                'invoiceNumber',
  rfc:                  'rfcEmisor',
  rfcafiliado:          'rfcEmisor',
  rfcemisor:            'rfcEmisor',
  email:                'email',
  correo:               'email',
  miembro:              'email',
  pedido:               'orderNumber',
  supedido:             'orderNumber',
  numeropedido:         'orderNumber',
  fechadeemision:       'issuedAt',
  fechaemision:         'issuedAt',
  fechadeelaboracion:   'issuedAt',
  fechaelaboracion:     'issuedAt',
  fechadepago:          'paidAt',
  fechapago:            'paidAt',
  subtotal:             'totalMxn',
  subtotalmonto:        'totalMxn',
  monto:                'totalMxn',
  puntos:               'points',
  puntosasignados:      'points',
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseExcelDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value.trim())
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return undefined
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<{ rows: ExcelRow[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  const errors: string[] = []
  const rows: ExcelRow[] = []

  if (!sheet) {
    return { rows, errors: ['El archivo no tiene hojas.'] }
  }

  const headerRow = sheet.getRow(1)
  const colMap = new Map<number, keyof ExcelRow>()
  headerRow.eachCell((cell, colNumber) => {
    const key = HEADER_ALIASES[normalizeHeader(cell.value)]
    if (key) colMap.set(colNumber, key)
  })

  const hasEmail = [...colMap.values()].includes('email')
  const hasTotal = [...colMap.values()].includes('totalMxn')
  if (!hasEmail || !hasTotal) {
    errors.push('El Excel debe tener al menos las columnas: email, subtotal.')
    return { rows, errors }
  }

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    if (row.cellCount === 0) continue

    const parsed: Partial<ExcelRow> = {}
    row.eachCell((cell, colNumber) => {
      const key = colMap.get(colNumber)
      if (!key) return
      if (key === 'issuedAt' || key === 'paidAt') {
        parsed[key] = parseExcelDate(cell.value)
      } else if (key === 'totalMxn' || key === 'points') {
        const n = Number(cell.value)
        if (!isNaN(n)) parsed[key] = n
      } else {
        parsed[key] = String(cell.value ?? '').trim()
      }
    })

    if (!parsed.email && !parsed.totalMxn) continue // fila vacía

    if (!parsed.email) { errors.push(`Fila ${i}: falta el email del miembro`); continue }
    if (!parsed.totalMxn || parsed.totalMxn <= 0) { errors.push(`Fila ${i}: subtotal inválido`); continue }

    rows.push(parsed as ExcelRow)
  }

  return { rows, errors }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const affiliate = getEffectiveAffiliate(session, req)
  const formData  = await req.formData()
  const file      = formData.get('file') as File | null
  const confirm   = formData.get('confirm') === 'true'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { rows, errors: parseErrors } = await parseWorkbook(buffer)

  const supabase = createAdminClient()

  const emails = [...new Set(rows.map(r => r.email.toLowerCase()))]
  let membersQuery = supabase
    .from('members')
    .select('id, email, rfc, affiliate, company_name, full_name')
    .in('email', emails)
  if (affiliate) membersQuery = membersQuery.eq('affiliate', affiliate)
  const { data: members } = await membersQuery

  type MemberRow = { id: string; email: string; rfc: string; affiliate: string; company_name: string; full_name: string }
  // Un mismo email puede tener cuenta en ambas empresas: en la vista
  // combinada eso es ambiguo y se pide elegir la empresa antes de importar.
  const membersByEmail = new Map<string, MemberRow[]>()
  for (const m of members ?? []) {
    const key = m.email.toLowerCase()
    membersByEmail.set(key, [...(membersByEmail.get(key) ?? []), m])
  }

  const preview = rows.map((row, i) => {
    const matches = membersByEmail.get(row.email.toLowerCase()) ?? []
    const member = matches.length === 1 ? matches[0] : null
    let error: string | null = null
    if (matches.length === 0) error = `Miembro con email ${row.email} no encontrado`
    else if (matches.length > 1) error = `El email ${row.email} tiene cuenta en ambas empresas — elige la empresa en "Ver como" antes de importar`

    const points = row.points ?? calculatePoints(row.totalMxn)

    return {
      line:            i + 2,
      email:           row.email,
      member_id:       member?.id ?? null,
      member_name:     member?.full_name ?? null,
      company_name:    member?.company_name ?? null,
      rfc_receptor:    member?.rfc ?? null,
      invoice_number:  row.invoiceNumber ?? null,
      order_number:    row.orderNumber ?? null,
      rfc_emisor:      row.rfcEmisor ?? (member ? getAffiliateRfc(member.affiliate) ?? null : null),
      issued_at:       row.issuedAt ?? null,
      paid_at:         row.paidAt ?? null,
      total_mxn:       row.totalMxn,
      points,
      error,
    }
  })

  const allErrors = [...parseErrors, ...preview.filter(p => p.error).map(p => p.error!)]

  if (!confirm) {
    return NextResponse.json({ preview, parseErrors, canProcess: preview.some(p => !p.error) })
  }

  const valid = preview.filter(p => !p.error && p.member_id)
  let processed = 0

  for (const row of valid) {
    try {
      const invoiceId = crypto.randomUUID()
      const syntheticUuid = `MANUAL-${invoiceId.slice(0, 18).toUpperCase()}`
      const { error } = await supabase.from('invoices').insert({
        id:                  invoiceId,
        member_id:           row.member_id,
        uuid_cfdi:           syntheticUuid,
        rfc_emisor:          row.rfc_emisor ?? 'XAXX010101000',
        rfc_receptor:        row.rfc_receptor ?? '',
        total_mxn:           row.total_mxn,
        issued_at:           row.issued_at ?? new Date().toISOString(),
        paid_at:             row.paid_at,
        status:              'pending',
        verification_status: 'pending',
        points_generated:    row.points,
        registered_by:       session.sub,
        invoice_number:      row.invoice_number,
        order_number:        row.order_number,
      })
      if (error) throw error
      processed++
    } catch (err) {
      console.error('[invoices/bulk-import] Error en fila:', row.line, err)
      allErrors.push(`Fila ${row.line}: error al registrar la factura`)
    }
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invoice.bulk_imported',
    target_type: 'invoice',
    target_id:   session.sub,
    metadata:    { file: file.name, total_rows: rows.length, processed, errors: allErrors.length },
  })

  return NextResponse.json({ processed, skipped: valid.length - processed, errors: allErrors })
}
