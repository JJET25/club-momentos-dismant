import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { MANAGER_ROLES } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase'

async function requireManager() {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) return null
  return session
}

export async function GET() {
  const session = await requireManager()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('global_banners')
    .select('id, message, is_active, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ banner: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const session = await requireManager()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json() as { message?: string; isActive?: boolean }
  const { message, isActive } = body

  if (message !== undefined && !message.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Singleton: buscar el registro existente
  const { data: existing } = await supabase
    .from('global_banners')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let result
  if (existing) {
    const patch: Record<string, unknown> = {
      updated_by: session.sub,
      updated_at:  new Date().toISOString(),
    }
    if (message !== undefined) patch.message = message.trim()
    if (isActive !== undefined) patch.is_active = isActive

    const { data, error } = await supabase
      .from('global_banners')
      .update(patch)
      .eq('id', existing.id)
      .select('id, message, is_active, updated_at')
      .single()

    if (error) return NextResponse.json({ error: 'Error al actualizar el banner' }, { status: 500 })
    result = data
  } else {
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Se requiere un mensaje para crear el banner' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('global_banners')
      .insert({
        id: crypto.randomUUID(),
        message:    message.trim(),
        is_active:  isActive ?? false,
        updated_at: new Date().toISOString(),
        updated_by: session.sub,
      })
      .select('id, message, is_active, updated_at')
      .single()

    if (error) return NextResponse.json({ error: 'Error al crear el banner' }, { status: 500 })
    result = data
  }

  return NextResponse.json({ banner: result })
}
