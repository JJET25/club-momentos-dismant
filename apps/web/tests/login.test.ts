import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { authenticateAcrossAccounts, type AccountRow } from '@/lib/accounts'
import { safeNextPath } from '@/lib/passes'

const hash = (p: string) => bcrypt.hashSync(p, 4)
const row = (id: string, affiliate: string, role: string, opts: Partial<AccountRow> = {}): AccountRow => ({
  id, email: 'ana@empresa.mx', full_name: 'Ana', status: 'active', affiliate,
  password_hash: hash('correcta'), last_login_at: null, roles: { name: role }, ...opts,
})

describe('authenticateAcrossAccounts (login desde la página de inicio)', () => {
  it('una sola cuenta con contraseña correcta', async () => {
    const r = await authenticateAcrossAccounts([row('a', 'lauti', 'member')], 'correcta')
    expect(r.account?.id).toBe('a')
  })

  it('contraseña incorrecta → invalid', async () => {
    const r = await authenticateAcrossAccounts([row('a', 'lauti', 'member')], 'otra')
    expect(r.account === null && r.reason).toBe('invalid')
  })

  it('varias cuentas: entra a la última usada', async () => {
    const r = await authenticateAcrossAccounts([
      row('dismant', 'dismant', 'member', { last_login_at: '2026-09-01T10:00:00Z' }),
      row('lauti',   'lauti',   'member', { last_login_at: '2026-10-01T10:00:00Z' }),
    ], 'correcta')
    expect(r.account?.id).toBe('lauti')
  })

  it('solo cuenta la cuenta cuya contraseña coincide', async () => {
    const r = await authenticateAcrossAccounts([
      row('dismant', 'dismant', 'member', { last_login_at: '2026-10-01T10:00:00Z', password_hash: hash('distinta') }),
      row('lauti',   'lauti',   'member', { last_login_at: '2026-01-01T10:00:00Z' }),
    ], 'correcta')
    expect(r.account?.id).toBe('lauti')
  })

  it('sin historial: primero la cuenta del equipo', async () => {
    const r = await authenticateAcrossAccounts([row('m', 'lauti', 'member'), row('s', 'lauti', 'employee')], 'correcta')
    expect(r.account?.id).toBe('s')
    expect(r.account && r.role).toBe('employee')
  })

  it('cuenta suspendida nunca entra', async () => {
    const r = await authenticateAcrossAccounts([row('a', 'lauti', 'member', { status: 'suspended' })], 'correcta')
    expect(r.account === null && r.reason).toBe('invalid')
  })

  it('cuenta activa sin contraseña → pide configurarla', async () => {
    const r = await authenticateAcrossAccounts([row('a', 'lauti', 'admin', { password_hash: null })], 'loquesea')
    expect(r.account === null && r.reason).toBe('no_password')
  })

  it('sin cuentas → invalid (mensaje genérico)', async () => {
    const r = await authenticateAcrossAccounts([], 'x')
    expect(r.account === null && r.reason).toBe('invalid')
  })
})

describe('safeNextPath (a dónde ir después de canjear un pase)', () => {
  it('acepta rutas internas', () => {
    expect(safeNextPath('/catalog')).toBe('/catalog')
    expect(safeNextPath('/admin/members?q=1')).toBe('/admin/members?q=1')
  })
  it('rechaza otros dominios y valores raros', () => {
    expect(safeNextPath('https://malicioso.com')).toBeNull()
    expect(safeNextPath('//malicioso.com')).toBeNull()
    expect(safeNextPath('/\\malicioso.com')).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
    expect(safeNextPath(42)).toBeNull()
  })
})
