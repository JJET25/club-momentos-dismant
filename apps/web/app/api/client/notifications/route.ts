import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, metadata, read_at, created_at')
    .eq('member_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })

  const unreadCount = (data ?? []).filter(n => !n.read_at).length

  return NextResponse.json({ notifications: data ?? [], unreadCount })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const ids: string[] = body.ids ?? []

  const supabase = createAdminClient()

  if (ids.length === 0) {
    // Marcar todas como leídas
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('member_id', session.sub)
      .is('read_at', null)
  } else {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('member_id', session.sub)
      .in('id', ids)
      .is('read_at', null)
  }

  return NextResponse.json({ ok: true })
}
