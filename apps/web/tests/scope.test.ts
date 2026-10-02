import { describe, expect, it } from 'vitest'
import { getAllowedAffiliates, resolvePerspective, canAccessAffiliate, getMemberAffiliate } from '@/lib/scope'

const owner      = { role: 'owner',      affiliate: 'lauti' }
const admin      = { role: 'admin',      affiliate: 'dismant' }
const employee1  = { role: 'employee',   affiliate: 'dismant', affiliates: ['dismant'] }
const employee2  = { role: 'employee',   affiliate: 'dismant', affiliates: ['dismant', 'lauti'] }
const teamAdmin  = { role: 'team_admin', affiliate: 'lauti',   affiliates: ['lauti'] }
const legacyJwt  = { role: 'employee',   affiliate: 'lauti' } // sesión sin claim `affiliates`

describe('getAllowedAffiliates', () => {
  it('roles globales ven ambas empresas', () => {
    expect(getAllowedAffiliates(owner)).toEqual(['dismant', 'lauti'])
    expect(getAllowedAffiliates(admin)).toEqual(['dismant', 'lauti'])
  })
  it('staff scoped ve solo sus empresas asignadas', () => {
    expect(getAllowedAffiliates(employee1)).toEqual(['dismant'])
    expect(getAllowedAffiliates(employee2)).toEqual(['dismant', 'lauti'])
    expect(getAllowedAffiliates(teamAdmin)).toEqual(['lauti'])
  })
  it('sesiones anteriores al claim caen a su empresa principal', () => {
    expect(getAllowedAffiliates(legacyJwt)).toEqual(['lauti'])
  })
  it('ignora valores inválidos en el claim', () => {
    expect(getAllowedAffiliates({ role: 'employee', affiliate: 'lauti', affiliates: ['hack', 'lauti'] })).toEqual(['lauti'])
  })
})

describe('resolvePerspective', () => {
  it('rol global: vista combinada por default, o la empresa elegida', () => {
    expect(resolvePerspective(owner, undefined)).toBeNull()
    expect(resolvePerspective(owner, 'lauti')).toBe('lauti')
    expect(resolvePerspective(owner, 'basura')).toBeNull()
  })
  it('staff scoped nunca obtiene la vista combinada', () => {
    expect(resolvePerspective(employee1, undefined)).toBe('dismant')
    expect(resolvePerspective(employee1, '')).toBe('dismant')
  })
  it('staff scoped no puede forzar una empresa no asignada vía cookie', () => {
    expect(resolvePerspective(employee1, 'lauti')).toBe('dismant')
    expect(resolvePerspective(teamAdmin, 'dismant')).toBe('lauti')
  })
  it('staff con ambas empresas cambia entre ellas', () => {
    expect(resolvePerspective(employee2, 'lauti')).toBe('lauti')
    expect(resolvePerspective(employee2, 'dismant')).toBe('dismant')
  })
})

describe('canAccessAffiliate / getMemberAffiliate', () => {
  it('valida acceso por empresa', () => {
    expect(canAccessAffiliate(teamAdmin, 'lauti')).toBe(true)
    expect(canAccessAffiliate(teamAdmin, 'dismant')).toBe(false)
    expect(canAccessAffiliate(owner, 'dismant')).toBe(true)
    expect(canAccessAffiliate(owner, 'otra')).toBe(false)
  })
  it('empresa del miembro', () => {
    expect(getMemberAffiliate({ affiliate: 'lauti' })).toBe('lauti')
    expect(getMemberAffiliate({ affiliate: 'x' })).toBe('dismant')
  })
})
