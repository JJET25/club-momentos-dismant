import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

// Solo disponible en desarrollo local
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? 'member'

  const accounts: Record<string, { sub: string; email: string; name: string; redirect: string }> = {
    member: {
      sub:      'test-member-id',
      email:    'cliente@empresa.com',
      name:     'Carlos Mendoza',
      redirect: '/dashboard',
    },
    admin: {
      sub:      'test-admin-id',
      email:    'admin@dismant.test',
      name:     'Admin Test',
      redirect: '/admin/dashboard',
    },
    owner: {
      sub:      'test-owner-id',
      email:    'owner@dismant.test',
      name:     'Owner Test',
      redirect: '/admin/dashboard',
    },
  }

  const account = accounts[role] ?? accounts.member
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

  const token = await new SignJWT({
    sub:   account.sub,
    email: account.email,
    role,
    name:  account.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret)

  const res = NextResponse.redirect(new URL(account.redirect, req.url))
  res.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 12,
  })

  return res
}
