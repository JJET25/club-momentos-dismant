import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'
import { insertLedgerEntry } from '@/lib/ledger'

interface CsvRow { rfc: string; puntos: number; razon: string }

function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const lines  = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const header = lines[0]?.toLowerCase().replace(/\s/g, '')
  const errors: string[] = []
  const rows:   CsvRow[] = []

  if (!header?.includes('rfc') || !header?.includes('puntos')) {
    errors.push('El CSV debe tener columnas: rfc, puntos, razon')
    return { rows, errors }
  }

  const cols = lines[0].split(',').map(c => c.trim().toLowerCase())
  const idxRfc    = cols.findIndex(c => c === 'rfc')
  const idxPuntos = cols.findIndex(c => c === 'puntos')
  const idxRazon  = cols.findIndex(c => c === 'razon')

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim())
    const rfc    = parts[idxRfc]    ?? ''
    const puntos = parseInt(parts[idxPuntos] ?? '', 10)
    const razon  = parts[idxRazon]  ?? 'Ajuste por carga masiva'

    if (!rfc)              { errors.push(`Fila ${i + 1}: RFC vacío`); continue }
    if (isNaN(puntos) || puntos === 0) { errors.push(`Fila ${i + 1}: puntos inválidos`); continue }

    rows.push({ rfc: rfc.toUpperCase(), puntos, razon })
  }

  return { rows, errors }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await req.formData()
  const file     = formData.get('csv') as File | null
  const confirm  = formData.get('confirm') === 'true'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo CSV' }, { status: 400 })

  const text           = await file.text()
  const { rows, errors } = parseCsv(text)

  const supabase = createAdminClient()

  // Resolve RFCs → member IDs
  const rfcs = [...new Set(rows.map(r => r.rfc))]
  const { data: members } = await supabase
    .from('members')
    .select('id, rfc, full_name')
    .in('rfc', rfcs)

  const memberMap = new Map((members ?? []).map(m => [m.rfc.toUpperCase(), m]))

  const preview = rows.map((row, i) => {
    const member = memberMap.get(row.rfc)
    return {
      line:      i + 2,
      rfc:       row.rfc,
      puntos:    row.puntos,
      razon:     row.razon,
      member_id: member?.id ?? null,
      name:      member?.full_name ?? null,
      error:     member ? null : `RFC ${row.rfc} no encontrado`,
    }
  })

  const allErrors = [...errors, ...preview.filter(p => p.error).map(p => p.error!)]

  // Preview mode — return without processing
  if (!confirm) {
    return NextResponse.json({ preview, parseErrors: errors, canProcess: preview.some(p => !p.error) })
  }

  // Process only valid rows
  const valid = preview.filter(p => !p.error && p.member_id)
  let processed = 0

  for (const row of valid) {
    try {
      await insertLedgerEntry({
        memberId:    row.member_id!,
        type:        'adjustment',
        points:      row.puntos,
        description: row.razon,
        operatorId:  session.sub,
      })
      processed++
    } catch {
      allErrors.push(`Error al procesar RFC ${row.rfc}`)
    }
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'points.bulk_adjustment',
    target_type: 'ledger',
    target_id:   session.sub,
    metadata:    { file: file.name, total_rows: rows.length, processed, errors: allErrors.length },
  })

  return NextResponse.json({ processed, skipped: valid.length - processed, errors: allErrors })
}
