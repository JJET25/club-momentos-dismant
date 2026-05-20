import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Cliente público (frontend / Server Components sin autenticación especial)
 * Respeta Row Level Security
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Cliente de servidor con privilegios de admin (service role)
 * SOLO usar en API Routes / Server Actions donde se necesite saltarse RLS
 * NUNCA exponer en el cliente
 */
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Cliente de servidor con cookies (para Server Components autenticados)
 * Mantiene la sesión del usuario
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // El setter puede fallar en Server Components (read-only)
          // Se maneja en el middleware
        }
      },
    },
  })
}
