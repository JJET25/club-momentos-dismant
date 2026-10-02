import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getLinkedAccounts } from '@/lib/linked-accounts'
import { createPass, passUrl } from '@/lib/passes'

/**
 * POST — Cambiar a otra cuenta de la misma persona (otra empresa, o del
 * portal de miembro al panel). Solo hacia cuentas activas con el mismo
 * correo; la cuenta destino conserva sus propios permisos.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { accountId } = await req.json().catch(() => ({}))
  const supabase = createAdminClient()
  const accounts = await getLinkedAccounts(supabase, session.sub)
  const target = accounts.find(a => a.id === accountId && !a.current)
  if (!target) return NextResponse.json({ error: 'Cuenta no disponible' }, { status: 403 })

  const pass = await createPass(supabase, target.id, 'switch')
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'account.switched',
    target_type: 'member',
    target_id:   target.id,
    metadata:    { from_affiliate: session.affiliate, to_affiliate: target.affiliate, to_role: target.role },
  })

  return NextResponse.json({ redirectTo: passUrl(pass, target.role, target.affiliate) })
}
