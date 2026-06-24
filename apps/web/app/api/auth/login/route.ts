import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, email, full_name, status, password_hash, affiliate, roles(name)')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (!member || member.status === 'suspended') {
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

  const rolesData = member.roles as unknown as { name: string } | null
  const role = rolesData?.name ?? 'member'
  const token = await createSessionToken({
    sub: member.id,
    email: member.email,
    role,
    name: member.full_name,
    affiliate: member.affiliate ?? 'dismant',
  })
  const redirectTo = role === 'member' ? '/dashboard' : '/admin/dashboard'

  const response = NextResponse.json({ success: true, redirectTo })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
