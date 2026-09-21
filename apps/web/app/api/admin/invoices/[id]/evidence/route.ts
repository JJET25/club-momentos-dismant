import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, getSignedDownloadUrl, STORAGE_PATHS } from '@/lib/storage'

const MAX_BYTES    = 8 * 1024 * 1024 // 8 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/heic': 'heic', 'application/pdf': 'pdf',
  }
  return map[mime] ?? 'bin'
}

/** GET → URL firmada para ver la evidencia */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('evidence_key, members!member_id!inner(affiliate)')
    .eq('id', id)
    .maybeSingle()

  const invoiceAffiliate = (invoice?.members as unknown as { affiliate: string } | null)?.affiliate
  if (invoice && affiliate && invoiceAffiliate !== affiliate) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }

  if (!invoice?.evidence_key) {
    return NextResponse.json({ url: null })
  }

  try {
    // URL válida por 30 minutos
    const url = await getSignedDownloadUrl(invoice.evidence_key, 1800)
    return NextResponse.json({ url, key: invoice.evidence_key })
  } catch {
    return NextResponse.json({ error: 'Error al generar URL de descarga' }, { status: 500 })
  }
}

/** POST → sube la evidencia y actualiza la factura */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, members!member_id!inner(affiliate)')
    .eq('id', id)
    .maybeSingle()

  const invoiceAffiliate = (invoice?.members as unknown as { affiliate: string } | null)?.affiliate
  if (!invoice || (affiliate && invoiceAffiliate !== affiliate)) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usa JPG, PNG, WEBP, HEIC o PDF.' },
      { status: 422 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no puede superar 8 MB.' }, { status: 422 })
  }

  const ext = extFromMime(file.type)
  const key = STORAGE_PATHS.invoiceEvidence(id, ext)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, buffer, file.type)
  } catch (err) {
    console.error('[evidence] Error al subir a Storage:', err)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }

  const { error } = await supabase
    .from('invoices')
    .update({ evidence_key: key })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al guardar la referencia del archivo' }, { status: 500 })
  }

  return NextResponse.json({ evidenceKey: key })
}
