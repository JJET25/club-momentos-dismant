import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createAdminClient } from './supabase'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const SESSION_COOKIE = 'session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 días en segundos

export interface SessionPayload {
  sub: string        // member ID
  email: string
  role: string       // owner | admin | employee | member
  name: string
  iat: number
  exp: number
}

/** Crea un JWT de sesión firmado */
export async function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET)
}

/** Verifica y decodifica un JWT de sesión */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/** Obtiene la sesión actual desde la cookie */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

/** Genera un OTP de 6 dígitos y lo guarda en la base de datos */
export async function generateAndStoreOTP(email: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const supabase = createAdminClient()

  // Guardar el hash del código (en producción usar bcrypt)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  await supabase.from('otp_tokens').insert({
    email,
    code_hash: code, // TODO: hashear con bcrypt en producción
    expires_at: expiresAt.toISOString(),
  })

  return code
}

/** Verifica un OTP ingresado por el usuario */
export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('otp_tokens')
    .select('id, code_hash, used, expires_at')
    .eq('email', email)
    .eq('code_hash', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return false

  // Marcar como usado
  await supabase
    .from('otp_tokens')
    .update({ used: true })
    .eq('id', data.id)

  return true
}

/** Establece la cookie de sesión (HttpOnly + Secure) */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

/** Elimina la cookie de sesión */
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
