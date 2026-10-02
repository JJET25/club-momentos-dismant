import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pickAccountForTenant, type AccountRow } from '@/lib/accounts'

const row = (id: string, affiliate: string, role: string): AccountRow => ({
  id, email: 'ana@empresa.com', full_name: 'Ana', status: 'active', affiliate, password_hash: 'x', roles: { name: role },
})

const dismantMember = row('m-d', 'dismant', 'member')
const lautiMember   = row('m-l', 'lauti',   'member')
const staff         = row('s-1', 'dismant', 'employee')

beforeEach(() => {
  process.env.DISMANT_APP_HOST = 'club.dismant.com.mx'
  process.env.LAUTI_APP_HOST   = 'club.silauti.com.mx'
  process.env.ADMIN_APP_HOST   = 'admin.clubmomentos.mx'
})
afterEach(() => {
  delete process.env.DISMANT_APP_HOST
  delete process.env.LAUTI_APP_HOST
  delete process.env.ADMIN_APP_HOST
})

describe('pickAccountForTenant', () => {
  it('portal de empresa: solo la cuenta de esa empresa', () => {
    const rows = [dismantMember, lautiMember]
    const d = pickAccountForTenant(rows, { kind: 'brand', affiliate: 'dismant' })
    const l = pickAccountForTenant(rows, { kind: 'brand', affiliate: 'lauti' })
    expect(d.account?.id).toBe('m-d')
    expect(l.account?.id).toBe('m-l')
  })

  it('portal de empresa: un miembro de la otra empresa no existe aquí', () => {
    const r = pickAccountForTenant([lautiMember], { kind: 'brand', affiliate: 'dismant' })
    expect(r.account).toBeNull()
    expect(r.account === null && r.reason).toBe('not_found')
  })

  it('portal de empresa: el staff es enviado al panel central', () => {
    const r = pickAccountForTenant([staff], { kind: 'brand', affiliate: 'dismant' })
    expect(r.account).toBeNull()
    if (r.account === null) {
      expect(r.reason).toBe('wrong_portal')
      expect(r.homeUrl).toBe('https://admin.clubmomentos.mx')
    }
  })

  it('portal de OTRA empresa: el staff también es enviado al panel central', () => {
    const r = pickAccountForTenant([staff], { kind: 'brand', affiliate: 'lauti' })
    expect(r.account === null && r.reason).toBe('wrong_portal')
  })

  it('portal de empresa: el miembro gana sobre un staff con el mismo email', () => {
    const r = pickAccountForTenant([row('s-2', 'lauti', 'employee'), dismantMember], { kind: 'brand', affiliate: 'dismant' })
    expect(r.account?.id).toBe('m-d')
  })

  it('panel central: solo cuentas de staff', () => {
    expect(pickAccountForTenant([staff, dismantMember], { kind: 'admin' }).account?.id).toBe('s-1')
    const r = pickAccountForTenant([lautiMember], { kind: 'admin' })
    expect(r.account === null && r.reason).toBe('wrong_portal')
    expect(r.account === null && r.homeUrl).toBe('https://club.silauti.com.mx')
  })

  it('dominio anterior: única cuenta OK, dos cuentas es ambiguo', () => {
    expect(pickAccountForTenant([lautiMember], { kind: 'legacy' }).account?.id).toBe('m-l')
    const r = pickAccountForTenant([dismantMember, lautiMember], { kind: 'legacy' })
    expect(r.account === null && r.reason).toBe('ambiguous')
  })

  it('sin cuentas: not_found en todos los portales', () => {
    for (const t of [{ kind: 'legacy' as const }, { kind: 'admin' as const }, { kind: 'brand' as const, affiliate: 'lauti' as const }]) {
      const r = pickAccountForTenant([], t)
      expect(r.account === null && r.reason).toBe('not_found')
    }
  })
})
