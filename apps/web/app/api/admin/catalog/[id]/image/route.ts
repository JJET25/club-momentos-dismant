import { MANAGER_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, getSignedDownloadUrl, STORAGE_PATHS } from '@/lib/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
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

  const supabase = createAdminClient()
  await supabase.from('reward_skus').update({ image_url: imageUrl }).eq('id', id)

  return NextResponse.json({ image_url: imageUrl })
}
