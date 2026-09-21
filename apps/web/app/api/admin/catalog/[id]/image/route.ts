import { SCOPED_MANAGER_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, getSignedDownloadUrl, STORAGE_PATHS } from '@/lib/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabaseCheck = createAdminClient()
  const { data: skuCheck } = await supabaseCheck.from('reward_skus').select('affiliate').eq('id', id).maybeSingle()
  if (!skuCheck || (affiliate && skuCheck.affiliate !== affiliate)) {
    return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WebP' }, { status: 400 })
  }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = STORAGE_PATHS.rewardCover(id)

  await uploadFile(key, buffer, file.type)

  // URL firmada con vigencia de 10 años — prácticamente permanente para imágenes de catálogo
  const imageUrl = await getSignedDownloadUrl(key, 60 * 60 * 24 * 365 * 10)

  await supabaseCheck.from('reward_skus').update({ image_url: imageUrl }).eq('id', id)

  return NextResponse.json({ image_url: imageUrl })
}
