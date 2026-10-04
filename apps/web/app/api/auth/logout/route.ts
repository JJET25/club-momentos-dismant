import { NextRequest, NextResponse } from 'next/server'

function clearSession(res: NextResponse) {
  res.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return res
}

export async function POST() {
  return clearSession(NextResponse.json({ ok: true }))
}

/**
 * GET — Usado por los layouts cuando la sesión fue revocada (cambio de
 * contraseña en otro dispositivo, suspensión): borra la cookie y manda al
 * login. Sin esto el middleware, que solo valida la firma del JWT, volvería
 * a mandar de /login al área privada.
 */
export async function GET(req: NextRequest) {
  const url = new URL('/login', req.url)
  url.searchParams.set('error', 'sesion-cerrada')
  return clearSession(NextResponse.redirect(url))
}
