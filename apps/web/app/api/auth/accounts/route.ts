import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getLinkedAccounts, roleLabel } from '@/lib/linked-accounts'

/** GET — Cuentas de la misma persona, para el menú de perfil. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const accounts = await getLinkedAccounts(createAdminClient(), session.sub)
  return NextResponse.json({
    roleLabel: roleLabel(session.role),
    accounts: accounts.map(a => ({ ...a, roleLabel: roleLabel(a.role) })),
  })
}
