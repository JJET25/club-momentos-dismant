import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, email, company_name, rfc, location_state, location_city, created_at')
    .eq('id', session.sub)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { fullName, locationState, locationCity } = body

  if (!fullName?.trim() || !locationState?.trim() || !locationCity?.trim()) {
    return NextResponse.json({ error: 'Nombre, estado y ciudad son obligatorios' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('members')
    .update({
      full_name: fullName.trim(),
      location_state: locationState.trim(),
      location_city: locationCity.trim(),
    })
    .eq('id', session.sub)
    .select('id, full_name, email, company_name, rfc, location_state, location_city, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Error al actualizar el perfil' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id: crypto.randomUUID(),
    actor_id: session.sub,
    action: 'member.profile_updated',
    target_type: 'member',
    target_id: session.sub,
  })

  return NextResponse.json({ profile: data })
}
