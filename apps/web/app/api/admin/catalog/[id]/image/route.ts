import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, R2_PATHS } from '@/lib/r2'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !['owner', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
    return NextResponse.json({ error: 'Almacenamiento R2 no configurado' }, { status: 503 })
  }

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WebP' }, { status: 400 })
  }

  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = R2_PATHS.rewardCover(id)

  await uploadFile(key, buffer, file.type)

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  const supabase = createAdminClient()
  await supabase.from('reward_skus').update({ image_url: publicUrl }).eq('id', id)

  return NextResponse.json({ image_url: publicUrl })
}
