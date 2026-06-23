import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyMagicLinkToken, createSessionToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const loginUrl = new URL('/login', req.url)

  if (!token) {
    loginUrl.searchParams.set('error', 'link-invalido')
    return NextResponse.redirect(loginUrl)
  }

  const payload = await verifyMagicLinkToken(token)
  if (!payload) {
    loginUrl.searchParams.set('error', 'link-expirado')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, email, full_name, status, affiliate, roles(name)')
    .eq('id', payload.sub)
    .maybeSingle()

  if (!member || member.status === 'suspended') {
    loginUrl.searchParams.set('error', 'cuenta-suspendida')
    return NextResponse.redirect(loginUrl)
  }

  // Actualizar último login
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
    affiliate: (member as { affiliate?: string }).affiliate ?? 'dismant',
  })

  const destination = role === 'member' ? '/dashboard' : '/admin/dashboard'
  const response = NextResponse.redirect(new URL(destination, req.url))
  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
