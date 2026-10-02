import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase'
import { getRequestTenant } from '@/lib/tenant-server'
import { findAccountForTenant, lookupErrorMessage, buildSessionToken, setSessionOnResponse } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const lookup = await findAccountForTenant(supabase, email, await getRequestTenant())

  if (!lookup.account) {
    const message = lookupErrorMessage(lookup) ?? 'Correo o contraseña incorrectos'
    return NextResponse.json({ error: message }, { status: 401 })
  }

  const { account: member, role } = lookup
  if (member.status === 'suspended') {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
  }

  // Staff sin contraseña → pedir que use "Olvidé mi contraseña" para configurarla
  if (!member.password_hash) {
    return NextResponse.json({ noPassword: true })
  }

  const passwordValid = await bcrypt.compare(password, member.password_hash)
  if (!passwordValid) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
  }

  await supabase
    .from('members')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', member.id)

  const token = await buildSessionToken(supabase, member, role)
  const redirectTo = role === 'member' ? '/dashboard' : '/admin/dashboard'

  return setSessionOnResponse(NextResponse.json({ success: true, redirectTo }), token)
}
