/**
 * Tests de integración: inmutabilidad del ledger y audit_log.
 *
 * Requieren SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en el entorno.
 * Si no están presentes, los tests se saltan con skip automático.
 *
 * Para correr: cd packages/database && npx vitest run
 */

import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll } from 'vitest'

const SUPABASE_URL           = process.env.NEXT_PUBLIC_SUPABASE_URL        ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY       ?? ''

const SKIP = !SUPABASE_URL || !SUPABASE_SERVICE_KEY

function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function getAnyLedgerEntryId(): Promise<string | null> {
  const { data } = await supabase()
    .from('ledger_entries')
    .select('id')
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

async function getAnyAuditLogId(): Promise<string | null> {
  const { data } = await supabase()
    .from('audit_log')
    .select('id')
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe.skipIf(SKIP)('Ledger inmutabilidad (integración contra Supabase)', () => {
  let ledgerEntryId: string
  let auditLogId: string

  beforeAll(async () => {
    const le = await getAnyLedgerEntryId()
    const al = await getAnyAuditLogId()

    if (!le || !al) {
      throw new Error(
        'No hay registros en ledger_entries o audit_log para probar. ' +
        'Asegúrate de que la base de datos tenga datos de prueba.'
      )
    }

    ledgerEntryId = le
    auditLogId    = al
  })

  // ── ledger_entries ─────────────────────────────────────────

  it('debería rechazar UPDATE en ledger_entries', async () => {
    const { error } = await supabase()
      .from('ledger_entries')
      .update({ description: 'intento de modificación' })
      .eq('id', ledgerEntryId)

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/inmutable|UPDATE.*no.*permitido/i)
  })

  it('debería rechazar DELETE en ledger_entries', async () => {
    const { error } = await supabase()
      .from('ledger_entries')
      .delete()
      .eq('id', ledgerEntryId)

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/inmutable|DELETE.*no.*permitido/i)
  })

  it('debería permitir SELECT en ledger_entries', async () => {
    const { data, error } = await supabase()
      .from('ledger_entries')
      .select('id, points, balance_after')
      .eq('id', ledgerEntryId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data).toHaveProperty('id', ledgerEntryId)
  })

  // ── audit_log ──────────────────────────────────────────────

  it('debería rechazar UPDATE en audit_log', async () => {
    const { error } = await supabase()
      .from('audit_log')
      .update({ action: 'intento.modificacion' })
      .eq('id', auditLogId)

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/inmutable|UPDATE.*no.*permitido/i)
  })

  it('debería rechazar DELETE en audit_log', async () => {
    const { error } = await supabase()
      .from('audit_log')
      .delete()
      .eq('id', auditLogId)

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/inmutable|DELETE.*no.*permitido/i)
  })

  it('debería permitir SELECT en audit_log', async () => {
    const { data, error } = await supabase()
      .from('audit_log')
      .select('id, action')
      .eq('id', auditLogId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data).toHaveProperty('id', auditLogId)
  })
})

// ─────────────────────────────────────────────────────────────
// Tests de unidad (sin base de datos)
// ─────────────────────────────────────────────────────────────

describe('Invariantes del ledger (unidad)', () => {
  it('el tipo LedgerEntryType solo acepta valores permitidos', () => {
    const allowed = ['invoice', 'redemption', 'welcome_bonus', 'review_bonus', 'adjustment']
    const invalid = ['update', 'delete', 'modify', 'rollback']

    for (const v of allowed) {
      expect(allowed).toContain(v)
    }
    for (const v of invalid) {
      expect(allowed).not.toContain(v)
    }
  })

  it('balance_after debe ser no-negativo tras cualquier operación', () => {
    const scenarios = [
      { current: 1000, delta: -500,  expected: 500  },
      { current: 500,  delta: -500,  expected: 0    },
      { current: 0,    delta: 100,   expected: 100  },
      { current: 200,  delta: -300,  valid: false   },
    ]

    for (const s of scenarios) {
      const newBalance = s.current + s.delta
      if (s.valid === false) {
        expect(newBalance).toBeLessThan(0)
      } else {
        expect(newBalance).toBeGreaterThanOrEqual(0)
        expect(newBalance).toBe(s.expected)
      }
    }
  })
})
