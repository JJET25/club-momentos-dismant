import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { STAFF_ROLES } from '@/lib/permissions'
import { getAllowedAffiliates } from '@/lib/scope'
import { buildSessionToken, setSessionOnResponse } from '@/lib/accounts'
import { STAFF_SELF_FIELDS, diffProfile, validateProfileInput } from '@/lib/profile'

const COLUMNS = 'id, full_name, email, phone, affiliate, created_at, last_login_at'

async function requireStaff() {
  const session = await getSession()
  return session && STAFF_ROLES.includes(session.role as never) ? session : null
}

/** GET — Datos de la cuenta del staff que inició sesión. */
export async function GET() {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('members')
    .select(`${COLUMNS}, password_hash`)
    .eq('id', session.sub)
    .single()
  if (!data) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  const { password_hash, ...account } = data
  return NextResponse.json({
    account: {
      ...account,
      has_password: !!password_hash,
      role:         session.role,
      affiliates:   getAllowedAffiliates(session),
    },
  })
}

/**
 * PATCH — El staff edita su propio nombre y celular. Rol, empresas, correo y
 * estatus no se aceptan aquí (los administra el Propietario en /admin/team).
 */
export async function PATCH(req: NextRequest) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const result = validateProfileInput(body, STAFF_SELF_FIELDS)
  if (!result.update) return NextResponse.json({ error: result.error }, { status: 400 })

  const supabase = createAdminClient()
  const { data: before } = await supabase.from('members').select(COLUMNS).eq('id', session.sub).single()
  if (!before) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  const changes = diffProfile(before, result.update)
  if (!Object.keys(changes).length) return NextResponse.json({ account: before })

  const { data, error } = await supabase
    .from('members')
    .update(result.update)
    .eq('id', session.sub)
    .select(COLUMNS)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Error al actualizar la cuenta' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'staff.profile_updated',
    target_type: 'member',
    target_id:   session.sub,
    metadata:    { changes },
  })

  const res = NextResponse.json({ account: data })
  if (changes.full_name) setSessionOnResponse(res, await buildSessionToken(supabase, data, session.role))
  return res
}
