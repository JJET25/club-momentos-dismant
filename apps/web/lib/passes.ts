import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getHomeBaseUrl } from './tenant'

/**
 * Pases de un solo uso para entrar a otro dominio ya autenticado.
 *
 * Las sesiones son por dominio (cookie host-only): la página de inicio no
 * puede dejar una sesión en el portal de una empresa. Emite un pase, el
 * dominio destino lo canjea en /api/auth/pass y crea su propia sesión.
 *
 * - Solo se guarda el SHA-256 del pase (el valor viaja una vez, en la URL).
 * - Caduca en segundos (login/cambio) o minutos (enlace mágico por correo).
 * - El canje es atómico: `used_at IS NULL` en el mismo UPDATE, así dos
 *   peticiones con el mismo pase no pueden crear dos sesiones.
 */

export type PassPurpose = 'login' | 'switch' | 'magic_link'

const TTL_SECONDS: Record<PassPurpose, number> = {
  login:      60,
  switch:     60,
  magic_link: 15 * 60,
}

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

/** Ruta interna segura a la cual ir después de canjear (nunca otro dominio). */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value.slice(0, 512)
}

export async function createPass(
  supabase: SupabaseClient,
  memberId: string,
  purpose: PassPurpose,
  nextPath?: string | null,
): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const { error } = await supabase.from('auth_passes').insert({
    id:         crypto.randomUUID(),
    token_hash: hash(token),
    member_id:  memberId,
    purpose,
    next_path:  safeNextPath(nextPath),
    expires_at: new Date(Date.now() + TTL_SECONDS[purpose] * 1000).toISOString(),
  })
  if (error) throw new Error(`No se pudo emitir el pase: ${error.message}`)
  return token
}

/** URL absoluta (en el dominio donde opera la cuenta) que canjea el pase. */
export function passUrl(token: string, role: string, affiliate: unknown): string {
  return `${getHomeBaseUrl(role, affiliate)}/api/auth/pass?token=${encodeURIComponent(token)}`
}

export interface PassRow {
  member_id: string
  next_path: string | null
}

/** Lee un pase vigente sin canjearlo (para decidir el dominio correcto). */
export async function peekPass(supabase: SupabaseClient, token: string): Promise<PassRow | null> {
  const { data } = await supabase
    .from('auth_passes')
    .select('member_id, next_path')
    .eq('token_hash', hash(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return (data as PassRow | null) ?? null
}

/** Canjea el pase una sola vez. Devuelve null si no existe, caducó o ya se usó. */
export async function consumePass(supabase: SupabaseClient, token: string): Promise<PassRow | null> {
  const { data } = await supabase
    .from('auth_passes')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', hash(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('member_id, next_path')
    .maybeSingle()
  return (data as PassRow | null) ?? null
}
