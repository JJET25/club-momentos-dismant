import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const hdrs   = await headers()
  const userId = hdrs.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const token = body?.token
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase.from('members').update({ fcm_token: token }).eq('id', userId)

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const hdrs   = await headers()
  const userId = hdrs.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  await supabase.from('members').update({ fcm_token: null }).eq('id', userId)

  return NextResponse.json({ ok: true })
}
