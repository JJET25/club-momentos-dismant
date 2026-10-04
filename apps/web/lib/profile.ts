import { MEXICAN_STATES } from '@dismant/types'
import { isValidRFC } from './utils'

/**
 * Validación de los datos de perfil de una cuenta (miembro o staff).
 *
 * Qué puede editar cada quién:
 * - Miembro (autoservicio): nombre, celular, estado y ciudad. RFC y razón
 *   social NO — el RFC es contra el que se validan sus facturas, así que
 *   cambiarlo permitiría reclamar facturas de otra empresa. Se corrigen vía
 *   solicitud ARCO y los cambia el staff.
 * - Staff (autoservicio): nombre y celular.
 * - Staff sobre un miembro: todo lo anterior + RFC y razón social.
 * El correo, la empresa (affiliate), el rol y el estatus nunca son editables aquí.
 */

export type ProfileField = 'fullName' | 'phone' | 'locationState' | 'locationCity' | 'companyName' | 'rfc'

export const MEMBER_SELF_FIELDS: ProfileField[] = ['fullName', 'phone', 'locationState', 'locationCity']
export const STAFF_SELF_FIELDS: ProfileField[]  = ['fullName', 'phone']
export const STAFF_ON_MEMBER_FIELDS: ProfileField[] = [...MEMBER_SELF_FIELDS, 'companyName', 'rfc']

/** Columnas que se devuelven al cliente (nunca password_hash). */
export const PROFILE_COLUMNS = 'id, full_name, email, company_name, rfc, location_state, location_city, phone, created_at, affiliate, push_enabled'

/** Normaliza un celular mexicano a 10 dígitos (acepta espacios, guiones y prefijo +52). */
export function normalizePhone(value: string): string | null {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2)
  return digits.length === 10 ? digits : null
}

type Result = { update: Record<string, string | null>; error?: undefined } | { update?: undefined; error: string }

/**
 * Valida y normaliza los campos permitidos de `body`. Los campos que no están
 * en `allowed` se ignoran; los ausentes (`undefined`) no se tocan.
 */
export function validateProfileInput(body: Record<string, unknown>, allowed: ProfileField[]): Result {
  const update: Record<string, string | null> = {}

  for (const field of allowed) {
    const raw = body[field]
    if (raw === undefined) continue
    if (raw !== null && typeof raw !== 'string') return { error: 'Formato de datos inválido' }
    const value = (raw ?? '').trim()

    switch (field) {
      case 'fullName':
        if (value.length < 3 || value.length > 120) return { error: 'El nombre debe tener entre 3 y 120 caracteres' }
        update.full_name = value.replace(/\s+/g, ' ')
        break
      case 'phone':
        if (!value) { update.phone = null; break }
        {
          const phone = normalizePhone(value)
          if (!phone) return { error: 'El celular debe tener 10 dígitos' }
          update.phone = phone
        }
        break
      case 'locationState':
        if (!(MEXICAN_STATES as readonly string[]).includes(value)) return { error: 'Selecciona un estado válido' }
        update.location_state = value
        break
      case 'locationCity':
        if (value.length < 2 || value.length > 80) return { error: 'Escribe una ciudad válida' }
        update.location_city = value
        break
      case 'companyName':
        if (value.length < 2 || value.length > 200) return { error: 'Escribe una razón social válida' }
        update.company_name = value
        break
      case 'rfc': {
        const rfc = value.toUpperCase()
        if (!isValidRFC(rfc)) return { error: 'El RFC no tiene un formato válido' }
        update.rfc = rfc
        break
      }
    }
  }

  return { update }
}

/** Campos que realmente cambian, como { columna: [antes, después] } para el audit_log. */
export function diffProfile(before: Record<string, unknown>, update: Record<string, string | null>) {
  const changes: Record<string, [unknown, unknown]> = {}
  for (const [column, value] of Object.entries(update)) {
    if ((before[column] ?? null) !== value) changes[column] = [before[column] ?? null, value]
  }
  return changes
}
