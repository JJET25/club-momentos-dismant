import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession, revokeSessions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { buildSessionToken, setSessionOnResponse } from '@/lib/accounts'

/**
 * DELETE — "Cerrar sesión en los demás dispositivos": invalida todas las
 * sesiones de la cuenta y vuelve a emitir solo la actual.
 */
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: account } = await supabase
    .from('members')
    .select('id, email, full_name, affiliate')
    .eq('id', session.sub)
    .single()
  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  await revokeSessions(session.sub)
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'account.sessions_revoked',
    target_type: 'member',
    target_id:   session.sub,
  })

  const res = NextResponse.json({ ok: true })
  return setSessionOnResponse(res, await buildSessionToken(supabase, account, session.role))
}
