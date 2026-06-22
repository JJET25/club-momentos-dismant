import crypto from 'crypto'
import { createAdminClient } from './supabase'

export type LedgerEntryType =
  | 'invoice'
  | 'redemption'
  | 'welcome_bonus'
  | 'review_bonus'
  | 'adjustment'

interface InsertLedgerEntryParams {
  memberId:     string
  type:         LedgerEntryType
  points:       number        // positivo o negativo
  description?: string
  invoiceId?:   string
  redemptionId?: string
  operatorId?:  string
}

/**
 * Única función autorizada para escribir en ledger_entries.
 * Calcula el nuevo balance y garantiza que sea >= 0.
 * Nunca hace UPDATE ni DELETE — solo INSERT.
 */
export async function insertLedgerEntry(params: InsertLedgerEntryParams): Promise<{
  id: string
  balance_after: number
}> {
  const supabase = createAdminClient()

  // Obtener saldo actual del miembro
  const { data: latest } = await supabase
    .from('ledger_entries')
    .select('balance_after')
    .eq('member_id', params.memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentBalance = latest?.balance_after ?? 0
  const newBalance     = currentBalance + params.points

  if (newBalance < 0) {
    throw new Error(`Saldo insuficiente: saldo actual ${currentBalance}, operación ${params.points}`)
  }

  const id = crypto.randomUUID()

  const { error } = await supabase.from('ledger_entries').insert({
    id,
    member_id:     params.memberId,
    type:          params.type,
    points:        params.points,
    balance_after: newBalance,
    description:   params.description ?? null,
    invoice_id:    params.invoiceId ?? null,
    redemption_id: params.redemptionId ?? null,
    operator_id:   params.operatorId ?? null,
  })

  if (error) throw new Error(`Error al insertar en ledger: ${error.message}`)

  return { id, balance_after: newBalance }
}

/**
 * Registra una entrada en audit_log.
 * Solo INSERT — append-only.
 */
export async function insertAuditLog(params: {
  actorId?:    string
  action:      string
  targetType?: string
  targetId?:   string
  metadata?:   Record<string, unknown>
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    params.actorId ?? null,
    action:      params.action,
    target_type: params.targetType ?? null,
    target_id:   params.targetId ?? null,
    metadata:    params.metadata ?? null,
  })
}
