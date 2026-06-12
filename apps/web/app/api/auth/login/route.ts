import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'

const OTP_REQUIRED_AFTER_DAYS = 30

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, email, full_name, status, password_hash, last_login_at, roles(name)')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (!member || member.status === 'suspended') {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
  }

  // Miembro sin contraseña (creado antes del nuevo flujo) → fallback a OTP
  if (!member.password_hash) {
    return NextResponse.json({ requiresOtp: true, reason: 'no-password' })
  }

  const passwordValid = await bcrypt.compare(password, member.password_hash)
  if (!passwordValid) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
  }

  // Determinar si se requiere OTP
  const isFirstLogin = !member.last_login_at
  const daysSinceLogin = member.last_login_at
    ? (Date.now() - new Date(member.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity

  if (isFirstLogin || daysSinceLogin >= OTP_REQUIRED_AFTER_DAYS) {
    // Generar y enviar OTP
    const { generateAndStoreOTP } = await import('@/lib/auth')
    const { sendEmail, buildOTPEmail } = await import('@/lib/resend')
    const code = await generateAndStoreOTP(member.email)

    if (process.env.RESEND_API_KEY) {
      try {
        await sendEmail({
          to: member.email,
          subject: 'Tu código de verificación — Club Momentos Dismant',
          html: buildOTPEmail(code, member.full_name),
        })
      } catch {
        console.log(`[DEV] OTP para ${member.email}: ${code}`)
      }
    } else {
      console.log(`[DEV] OTP para ${member.email}: ${code}`)
    }

    return NextResponse.json({ requiresOtp: true })
  }

  // Login directo sin OTP
  return await createLoginSession(member)
}

async function createLoginSession(member: {
  id: string; email: string; full_name: string; roles: unknown
}) {
  const supabase = createAdminClient()
  await supabase
    .from('members')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', member.id)

  const rolesData = member.roles as unknown as { name: string } | null
  const role = rolesData?.name ?? 'member'
  const token = await createSessionToken({ sub: member.id, email: member.email, role, name: member.full_name })
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
