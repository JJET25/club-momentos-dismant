import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSessionToken } from './auth'
import { isAffiliate, getHomeBaseUrl, type Tenant } from './tenant'

/**
 * Búsqueda de cuentas por email respetando la separación entre empresas.
 *
 * El email es único POR EMPRESA (members_email_affiliate_key): una misma
 * persona puede ser miembro de Dismant y de Lauti con dos cuentas
 * independientes. Por eso "buscar por email" ya no es suficiente — hay que
 * saber desde qué portal se está entrando:
 *
 * - Portal de una empresa → solo la cuenta de miembro de esa empresa.
 * - Panel central         → solo cuentas de staff.
 * - Dominio anterior      → la única cuenta con ese email; si hay más de una
 *                           (miembro de ambas empresas) es ambiguo y se pide
 *                           entrar desde el portal de su empresa.
 */

export const ACCOUNT_SELECT = 'id, email, full_name, status, affiliate, password_hash, roles(name)'

export interface AccountRow {
  id:            string
  email:         string
  full_name:     string
  status:        string
  affiliate:     string
  password_hash: string | null
  roles:         { name: string } | null
}

export type AccountLookup =
  | { account: AccountRow; role: string }
  | { account: null; reason: 'not_found' | 'ambiguous' | 'wrong_portal'; homeUrl?: string }

export function roleOf(row: Pick<AccountRow, 'roles'>): string {
  return row.roles?.name ?? 'member'
}

/** Elige la cuenta que corresponde al portal (tenant) desde el que se entra. */
export function pickAccountForTenant(rows: AccountRow[], tenant: Tenant): AccountLookup {
  if (tenant.kind === 'brand') {
    const member = rows.find(r => r.affiliate === tenant.affiliate && roleOf(r) === 'member')
    if (member) return { account: member, role: 'member' }
    // El staff (de cualquier empresa) opera desde el panel central
    const staff = rows.find(r => roleOf(r) !== 'member')
    if (staff) return { account: null, reason: 'wrong_portal', homeUrl: getHomeBaseUrl(roleOf(staff), staff.affiliate) }
    return { account: null, reason: 'not_found' }
  }

  if (tenant.kind === 'admin') {
    const staff = rows.filter(r => roleOf(r) !== 'member')
    if (staff.length === 1) return { account: staff[0], role: roleOf(staff[0]) }
    if (staff.length > 1) return { account: null, reason: 'ambiguous' }
    // Un miembro intentando entrar al panel: mandarlo a su portal
    if (rows.length === 1) return { account: null, reason: 'wrong_portal', homeUrl: getHomeBaseUrl('member', rows[0].affiliate) }
    return { account: null, reason: rows.length ? 'ambiguous' : 'not_found' }
  }

  // legacy
  if (rows.length === 1) return { account: rows[0], role: roleOf(rows[0]) }
  return { account: null, reason: rows.length ? 'ambiguous' : 'not_found' }
}

export async function findAccountsByEmail(supabase: SupabaseClient, email: string): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from('members')
    .select(ACCOUNT_SELECT)
    .eq('email', email.toLowerCase().trim())
  if (error) {
    console.error('[accounts] Error buscando cuenta por email:', error)
    return []
  }
  return (data ?? []) as unknown as AccountRow[]
}

export async function findAccountForTenant(supabase: SupabaseClient, email: string, tenant: Tenant): Promise<AccountLookup> {
  return pickAccountForTenant(await findAccountsByEmail(supabase, email), tenant)
}

/** Mensaje de error para el usuario según el motivo del lookup fallido. */
export function lookupErrorMessage(lookup: Extract<AccountLookup, { account: null }>): string | null {
  if (lookup.reason === 'ambiguous') {
    return 'Este correo tiene cuenta en más de una empresa. Ingresa desde el portal de tu empresa.'
  }
  if (lookup.reason === 'wrong_portal') {
    return lookup.homeUrl
      ? `Esta cuenta inicia sesión en ${lookup.homeUrl}`
      : 'Esta cuenta no inicia sesión desde este portal.'
  }
  return null
}

/** Empresas asignadas a un usuario de staff (tabla staff_affiliates). */
export async function getStaffAffiliates(supabase: SupabaseClient, memberId: string, primary: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('staff_affiliates')
    .select('affiliate')
    .eq('member_id', memberId)
  if (error) console.error('[accounts] Error leyendo staff_affiliates:', error)
  const list = (data ?? []).map(r => r.affiliate as string).filter(isAffiliate)
  return list.length ? list : (isAffiliate(primary) ? [primary] : [])
}

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

/** Firma el JWT de sesión de una cuenta (incluye las empresas asignadas si es staff). */
export async function buildSessionToken(supabase: SupabaseClient, account: Pick<AccountRow, 'id' | 'email' | 'full_name' | 'affiliate'>, role: string) {
  const affiliate = isAffiliate(account.affiliate) ? account.affiliate : 'dismant'
  return createSessionToken({
    sub:        account.id,
    email:      account.email,
    role,
    name:       account.full_name,
    affiliate,
    affiliates: role === 'member' ? [affiliate] : await getStaffAffiliates(supabase, account.id, affiliate),
  })
}

export function setSessionOnResponse(res: NextResponse, token: string) {
  res.cookies.set('session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   SESSION_MAX_AGE,
    path:     '/',
  })
  return res
}

/** Roles de staff cuyo acceso se limita a las empresas asignadas. */
export const SCOPED_STAFF_ROLES = ['team_admin', 'employee']

/** Normaliza una lista de empresas (sin duplicados, solo valores válidos). */
export function normalizeAffiliates(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isAffiliate))]
}

/**
 * Reemplaza las empresas asignadas a un usuario de staff. Si su empresa
 * principal (members.affiliate, usada para el branding de sus correos) ya no
 * está entre las asignadas, pasa a ser la primera de la lista.
 */
export async function setStaffAffiliates(
  supabase: SupabaseClient,
  memberId: string,
  affiliates: string[],
  currentPrimary: string,
): Promise<{ error: string | null }> {
  if (!affiliates.length) return { error: 'Asigna al menos una empresa' }

  const { error: delError } = await supabase.from('staff_affiliates').delete().eq('member_id', memberId)
  if (delError) return { error: delError.message }

  const { error: insError } = await supabase
    .from('staff_affiliates')
    .insert(affiliates.map(affiliate => ({ member_id: memberId, affiliate })))
  if (insError) return { error: insError.message }

  if (!affiliates.includes(currentPrimary)) {
    const { error } = await supabase.from('members').update({ affiliate: affiliates[0] }).eq('id', memberId)
    if (error) return { error: error.code === '23505' ? 'Ese correo ya tiene una cuenta en esa empresa' : error.message }
  }
  return { error: null }
}
