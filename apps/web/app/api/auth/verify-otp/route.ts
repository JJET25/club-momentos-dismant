import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getRequestTenant } from '@/lib/tenant-server'
import { findAccountForTenant, lookupErrorMessage, buildSessionToken, setSessionOnResponse } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { email, code, purpose } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: 'Email y código requeridos' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const valid = await verifyOTP(normalizedEmail, code.trim())
  if (!valid) {
    return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 })
  }

  // Registro: solo se verifica el correo, sin iniciar sesión. Importante
  // cuando la persona ya es miembro de la otra empresa y se está registrando
  // en esta con una invitación nueva.
  if (purpose === 'register') {
    return NextResponse.json({ success: true })
  }

  const supabase = createAdminClient()
  const lookup = await findAccountForTenant(supabase, normalizedEmail, await getRequestTenant())

  // Sin cuenta = contexto de registro: email verificado antes de crear la cuenta
  if (!lookup.account) {
    const message = lookupErrorMessage(lookup)
    if (message) return NextResponse.json({ error: message }, { status: 409 })
    return NextResponse.json({ success: true })
  }

  const { account: member, role } = lookup
  if (member.status === 'suspended') {
    return NextResponse.json({ error: 'Cuenta suspendida. Contacta a tu ejecutivo de cuenta.' }, { status: 403 })
  }

  await supabase
    .from('members')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', member.id)

  const sessionToken = await buildSessionToken(supabase, member, role)
  const redirectTo = role === 'member' ? '/dashboard' : '/admin/dashboard'

  return setSessionOnResponse(NextResponse.json({ success: true, redirectTo }), sessionToken)
}
