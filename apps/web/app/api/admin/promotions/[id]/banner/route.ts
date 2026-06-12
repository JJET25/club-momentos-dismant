import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { MANAGER_ROLES } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, getSignedDownloadUrl, R2_PATHS } from '@/lib/r2'

const MAX_BYTES    = 5 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function extFromMime(mime: string) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif',
  }
  return map[mime] ?? 'jpg'
}

/** GET → redirige a la URL firmada del banner (usable como src de <img>) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: promo } = await supabase
    .from('partner_promotions')
    .select('banner_key, image_url')
    .eq('id', id)
    .maybeSingle()

  if (!promo) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  if (promo.banner_key) {
    try {
      const url = await getSignedDownloadUrl(promo.banner_key, 3600)
      return NextResponse.redirect(url)
    } catch {
      return NextResponse.json({ error: 'Error al generar URL' }, { status: 500 })
    }
  }

  // Fallback: redirigir a image_url externo si existe
  if (promo.image_url) return NextResponse.redirect(promo.image_url)

  return NextResponse.json({ error: 'Sin imagen' }, { status: 404 })
}

/** POST → sube el banner y actualiza banner_key */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: promo } = await supabase
    .from('partner_promotions')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (!promo) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.' },
      { status: 422 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no puede superar 5 MB.' }, { status: 422 })
  }

  const ext = extFromMime(file.type)
  const key = R2_PATHS.promotionBanner(id, ext)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, buffer, file.type)
  } catch (err) {
    console.error('[banner] Error al subir a R2:', err)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }

  const { error } = await supabase
    .from('partner_promotions')
    .update({ banner_key: key })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al guardar la referencia' }, { status: 500 })
  }

  return NextResponse.json({ bannerKey: key })
}
