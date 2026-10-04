import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { buildSessionToken, setSessionOnResponse } from '@/lib/accounts'
import { MEMBER_SELF_FIELDS, PROFILE_COLUMNS, diffProfile, validateProfileInput } from '@/lib/profile'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('members')
    .select(`${PROFILE_COLUMNS}, password_hash`)
    .eq('id', session.sub)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const { password_hash, ...profile } = data
  return NextResponse.json({ profile: { ...profile, has_password: !!password_hash } })
}

/**
 * PATCH — El miembro edita su nombre, celular y ubicación. RFC y razón social
 * se ignoran a propósito (ver lib/profile.ts): se corrigen vía ARCO.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const result = validateProfileInput(body, MEMBER_SELF_FIELDS)
  if (!result.update) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = createAdminClient()
  const { data: before } = await supabase
    .from('members')
    .select(`${PROFILE_COLUMNS}, password_hash`)
    .eq('id', session.sub)
    .single()
  if (!before) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const changes = diffProfile(before, result.update)
  const { password_hash, ...current } = before
  if (!Object.keys(changes).length) {
    return NextResponse.json({ profile: { ...current, has_password: !!password_hash } })
  }

  const { data, error } = await supabase
    .from('members')
    .update(result.update)
    .eq('id', session.sub)
    .select(PROFILE_COLUMNS)
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
    metadata: { changes },
  })

  const res = NextResponse.json({ profile: { ...data, has_password: !!password_hash } })
  // El nombre viaja en el JWT (sidebar, menú de perfil): se renueva la sesión
  if (changes.full_name) setSessionOnResponse(res, await buildSessionToken(supabase, data, session.role))
  return res
}
