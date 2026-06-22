import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP, createSessionToken } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: 'Email y código requeridos' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const valid = await verifyOTP(normalizedEmail, code.trim())
  if (!valid) {
    return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, email, full_name, status, roles(name)')
    .eq('email', normalizedEmail)
    .maybeSingle()

  // Sin miembro = contexto de registro: email verificado antes de crear la cuenta
  if (!member) {
    return NextResponse.json({ success: true })
  }

  if (member.status === 'suspended') {
    return NextResponse.json({ error: 'Cuenta suspendida. Contacta a Dismant.' }, { status: 403 })
  }

  await supabase
    .from('members')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', member.id)

  const rolesData = member.roles as unknown as { name: string } | null
  const role = rolesData?.name ?? 'member'

  const sessionToken = await createSessionToken({
    sub: member.id,
    email: member.email,
    role,
    name: member.full_name,
  })

  const redirectTo = role === 'member' ? '/dashboard' : '/admin/dashboard'

  const response = NextResponse.json({ success: true, redirectTo })
  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
