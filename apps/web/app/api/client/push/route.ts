import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

/**
 * PUT — Prende/apaga las notificaciones push del miembro. Al apagarlas se
 * borra el token FCM (los envíos usan fcm_token, así que dejan de llegar) y
 * /api/client/fcm-token deja de aceptar tokens nuevos.
 */
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const update: Record<string, unknown> = { push_enabled: body.enabled }
  if (!body.enabled) update.fcm_token = null

  const { error } = await createAdminClient().from('members').update(update).eq('id', session.sub)
  if (error) return NextResponse.json({ error: 'No se pudo guardar la preferencia' }, { status: 500 })

  return NextResponse.json({ push_enabled: body.enabled })
}
