import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resolveTenant, isHostRoutingEnabled, getAffiliateBaseUrl, getAdminBaseUrl, getHomeBaseUrl,
} from '@/lib/tenant'

const ENV_KEYS = ['DISMANT_APP_HOST', 'LAUTI_APP_HOST', 'ADMIN_APP_HOST', 'HUB_APP_HOST', 'NEXT_PUBLIC_APP_URL'] as const
let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]))
  for (const k of ENV_KEYS) delete process.env[k]
  process.env.NEXT_PUBLIC_APP_URL = 'https://club-actual.example.com'
})
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

function configureDomains() {
  process.env.DISMANT_APP_HOST = 'club.dismant.com.mx'
  process.env.LAUTI_APP_HOST   = 'club.silauti.com.mx'
  process.env.ADMIN_APP_HOST   = 'admin.clubmomentos.mx'
}

describe('resolveTenant', () => {
  it('sin dominios configurados todo es legacy (comportamiento actual)', () => {
    expect(resolveTenant('club-actual.example.com')).toEqual({ kind: 'legacy' })
    expect(resolveTenant('club.dismant.com.mx')).toEqual({ kind: 'legacy' })
    expect(isHostRoutingEnabled()).toBe(false)
  })

  it('resuelve cada dominio a su empresa / panel', () => {
    configureDomains()
    expect(resolveTenant('club.dismant.com.mx')).toEqual({ kind: 'brand', affiliate: 'dismant' })
    expect(resolveTenant('club.silauti.com.mx')).toEqual({ kind: 'brand', affiliate: 'lauti' })
    expect(resolveTenant('admin.clubmomentos.mx')).toEqual({ kind: 'admin' })
    expect(resolveTenant('club-actual.example.com')).toEqual({ kind: 'legacy' })
    expect(isHostRoutingEnabled()).toBe(true)
  })

  it('reconoce la entrada del proyecto (hub)', () => {
    configureDomains()
    process.env.HUB_APP_HOST = 'clubmomentos.scitechnexus.com.mx'
    expect(resolveTenant('clubmomentos.scitechnexus.com.mx')).toEqual({ kind: 'hub' })
    expect(resolveTenant('clubmomentos.localhost:3000')).toEqual({ kind: 'hub' })
  })

  it('subdominios de dos niveles bajo el proyecto', () => {
    process.env.DISMANT_APP_HOST = 'dismant.clubmomentos.scitechnexus.com.mx'
    process.env.LAUTI_APP_HOST   = 'lauti.clubmomentos.scitechnexus.com.mx'
    process.env.ADMIN_APP_HOST   = 'admin.clubmomentos.scitechnexus.com.mx'
    expect(resolveTenant('lauti.clubmomentos.scitechnexus.com.mx')).toEqual({ kind: 'brand', affiliate: 'lauti' })
    expect(resolveTenant('admin.clubmomentos.scitechnexus.com.mx')).toEqual({ kind: 'admin' })
    expect(getAffiliateBaseUrl('dismant')).toBe('https://dismant.clubmomentos.scitechnexus.com.mx')
  })

  it('ignora mayúsculas y puerto', () => {
    configureDomains()
    expect(resolveTenant('CLUB.Dismant.com.mx:443')).toEqual({ kind: 'brand', affiliate: 'dismant' })
  })

  it('reconoce *.localhost en desarrollo', () => {
    expect(resolveTenant('dismant.localhost:3000')).toEqual({ kind: 'brand', affiliate: 'dismant' })
    expect(resolveTenant('lauti.localhost:3000')).toEqual({ kind: 'brand', affiliate: 'lauti' })
    expect(resolveTenant('admin.localhost:3000')).toEqual({ kind: 'admin' })
    expect(resolveTenant('localhost:3000')).toEqual({ kind: 'legacy' })
  })

  it('host vacío o nulo es legacy', () => {
    expect(resolveTenant(null)).toEqual({ kind: 'legacy' })
    expect(resolveTenant('')).toEqual({ kind: 'legacy' })
  })
})

describe('URLs base', () => {
  it('sin dominios propios cae al dominio actual', () => {
    expect(getAffiliateBaseUrl('lauti')).toBe('https://club-actual.example.com')
    expect(getAdminBaseUrl()).toBe('https://club-actual.example.com')
  })

  it('con dominios usa el de cada empresa', () => {
    configureDomains()
    expect(getAffiliateBaseUrl('dismant')).toBe('https://club.dismant.com.mx')
    expect(getAffiliateBaseUrl('lauti')).toBe('https://club.silauti.com.mx')
    expect(getAdminBaseUrl()).toBe('https://admin.clubmomentos.mx')
    expect(getHomeBaseUrl('member', 'lauti')).toBe('https://club.silauti.com.mx')
    expect(getHomeBaseUrl('employee', 'lauti')).toBe('https://admin.clubmomentos.mx')
  })

  it('empresa desconocida nunca cae en el dominio de otra empresa', () => {
    configureDomains()
    expect(getAffiliateBaseUrl('otra')).toBe('https://club-actual.example.com')
    expect(getAffiliateBaseUrl(undefined)).toBe('https://club-actual.example.com')
  })

  it('*.localhost conserva protocolo y puerto en desarrollo', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.DISMANT_APP_HOST = 'dismant.localhost'
    expect(getAffiliateBaseUrl('dismant')).toBe('http://dismant.localhost:3000')
  })
})
