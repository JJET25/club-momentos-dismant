import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { createAdminClient } from './supabase'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const SESSION_COOKIE = 'session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 días en segundos

export interface SessionPayload {
  sub: string        // member ID
  email: string
  role: string       // owner | admin | employee | member
  name: string
  affiliate: string  // dismant | lauti — empresa principal de la cuenta
  /** Empresas a las que tiene acceso (staff asignado a una o ambas). En
   *  miembros siempre es [affiliate]. Ausente en sesiones emitidas antes
   *  de la separación por empresa — ver getAllowedAffiliates(). */
  affiliates?: string[]
  /** members.session_version al emitir el token. Si en la base ya es mayor
   *  (cambio de contraseña, "cerrar otras sesiones", suspensión) la sesión
   *  deja de ser válida. Ausente en tokens anteriores = 0. */
  sv?: number
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

/**
 * Obtiene la sesión actual desde la cookie. Además de la firma del JWT
 * comprueba en la base que la sesión no haya sido revocada (session_version)
 * ni la cuenta suspendida. Memorizada por request (React cache): una sola
 * consulta aunque varios componentes la pidan.
 *
 * El middleware solo verifica la firma (corre en edge, sin base); por eso
 * los layouts mandan a /api/auth/logout cuando esto devuelve null.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await verifySessionToken(token)
  if (!payload) return null
  return (await isSessionCurrent(payload)) ? payload : null
})

async function isSessionCurrent(payload: SessionPayload): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('members')
    .select('session_version, status')
    .eq('id', payload.sub)
    .maybeSingle()
  // Ante un error de la base (o columna aún sin migrar) no se tumba a todos
  // los usuarios: se confía en la firma del JWT, como antes de esta comprobación
  if (error) {
    console.error('[auth] No se pudo verificar la versión de sesión:', error.message)
    return true
  }
  if (!data || data.status === 'suspended') return false
  return (data.session_version ?? 0) === (payload.sv ?? 0)
}

/**
 * Invalida todas las sesiones emitidas de una o varias cuentas. Quien llama
 * debe volver a emitir la sesión actual si quiere conservarla
 * (buildSessionToken lee la versión nueva).
 */
export async function revokeSessions(memberIds: string | string[]) {
  const supabase = createAdminClient()
  for (const id of Array.isArray(memberIds) ? memberIds : [memberIds]) {
    const { data } = await supabase.from('members').select('session_version').eq('id', id).maybeSingle()
    if (!data) continue
    await supabase.from('members').update({ session_version: (data.session_version ?? 0) + 1 }).eq('id', id)
  }
}

/** Genera un OTP de 6 dígitos, lo hashea y lo guarda en la base de datos */
export async function generateAndStoreOTP(email: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  const supabase = createAdminClient()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  const { error } = await supabase.from('otp_tokens').insert({
    id: crypto.randomUUID(),
    email,
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    console.error('[auth] Error al guardar OTP:', error)
    throw new Error('No se pudo generar el código de verificación')
  }

  return code
}

/** Verifica un OTP ingresado por el usuario */
export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const supabase = createAdminClient()
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')

  const { data } = await supabase
    .from('otp_tokens')
    .select('id, used, expires_at')
    .eq('email', email)
    .eq('code_hash', codeHash)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return false

  await supabase.from('otp_tokens').update({ used: true }).eq('id', data.id)
  return true
}

/** Crea un token JWT de un solo uso para Magic Link (expira en 15 min) */
export async function createMagicLinkToken(memberId: string, email: string): Promise<string> {
  return new SignJWT({ sub: memberId, email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET)
}

/** Verifica un token de Magic Link */
export async function verifyMagicLinkToken(token: string): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.purpose !== 'magic-link') return null
    return { sub: payload.sub as string, email: payload.email as string }
  } catch {
    return null
  }
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
