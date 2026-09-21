import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { SCOPED_MANAGER_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, getSignedDownloadUrl, STORAGE_PATHS } from '@/lib/storage'

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  const { data: promo } = await supabase
    .from('partner_promotions')
    .select('banner_key, image_url, partners!partner_id(affiliate)')
    .eq('id', id)
    .maybeSingle()

  const promoAffiliate = (promo?.partners as unknown as { affiliate: string } | null)?.affiliate
  if (!promo || (affiliate && promoAffiliate !== affiliate)) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }

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
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  const { data: promo } = await supabase
    .from('partner_promotions')
    .select('id, partners!partner_id(affiliate)')
    .eq('id', id)
    .maybeSingle()

  const promoAffiliate = (promo?.partners as unknown as { affiliate: string } | null)?.affiliate
  if (!promo || (affiliate && promoAffiliate !== affiliate)) {
    return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })
  }

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
  const key = STORAGE_PATHS.promotionBanner(id, ext)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(key, buffer, file.type)
  } catch (err) {
    console.error('[banner] Error al subir a Storage:', err)
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
