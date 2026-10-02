import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Límite de intentos fallidos de inicio de sesión: 8 por correo y 30 por
 * IP en 15 minutos. Solo cuentan los intentos fallidos.
 */
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_EMAIL = 8
const MAX_PER_IP = 30

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconocida'
}

const keys = (email: string, ip: string) => ({ email: `email:${email.toLowerCase().trim()}`, ip: `ip:${ip}` })

export async function isLoginBlocked(supabase: SupabaseClient, email: string, ip: string): Promise<boolean> {
  const k = keys(email, ip)
  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const [byEmail, byIp] = await Promise.all([
    supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('key', k.email).gt('created_at', since),
    supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('key', k.ip).gt('created_at', since),
  ])
  return (byEmail.count ?? 0) >= MAX_PER_EMAIL || (byIp.count ?? 0) >= MAX_PER_IP
}

export async function recordFailedLogin(supabase: SupabaseClient, email: string, ip: string): Promise<void> {
  const k = keys(email, ip)
  await supabase.from('login_attempts').insert([
    { id: crypto.randomUUID(), key: k.email },
    { id: crypto.randomUUID(), key: k.ip },
  ])
}

export const BLOCKED_MESSAGE = 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.'
