import type { SupabaseClient } from '@supabase/supabase-js'
import { ACCOUNT_SELECT, roleOf, type AccountRow } from './accounts'
import { getBrand } from './brand'

/**
 * Cuentas de la misma persona: mismo correo (verificado con código al
 * registrarse), activas. Es lo que aparece en el menú de perfil para cambiar
 * de empresa sin volver a iniciar sesión. Cada cuenta conserva sus propios
 * puntos y permisos.
 */
export interface LinkedAccount {
  id:        string
  role:      string
  affiliate: string
  label:     string
  current:   boolean
}

const ROLE_LABEL: Record<string, string> = {
  member: 'Miembro', employee: 'Empleado', team_admin: 'Admin. de equipo', admin: 'Administrador', owner: 'Propietario',
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}

export async function getLinkedAccounts(supabase: SupabaseClient, currentId: string): Promise<LinkedAccount[]> {
  const { data: me } = await supabase.from('members').select('email').eq('id', currentId).maybeSingle()
  if (!me?.email) return []
  const { data } = await supabase.from('members').select(ACCOUNT_SELECT).eq('email', me.email)
  return ((data ?? []) as unknown as AccountRow[])
    .filter(r => r.status !== 'suspended')
    .map(r => {
      const role = roleOf(r)
      return {
        id:        r.id,
        role,
        affiliate: r.affiliate,
        label:     role === 'member' ? getBrand(r.affiliate).short : 'Panel de administración',
        current:   r.id === currentId,
      }
    })
    .sort((a, b) => Number(b.current) - Number(a.current))
}
