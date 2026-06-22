/**
 * Invoice worker — valida CFDIs ante el SAT vía Facturapi.
 * Se ejecuta como proceso separado: npm run workers
 */
import crypto from 'crypto'
import { Worker } from 'bullmq'
import { getRedis, type InvoiceJobData } from '../lib/queue'
import { verifyCFDI } from '../lib/facturapi'
import { createAdminClient } from '../lib/supabase'
import { sendPushNotification } from '../lib/firebase-admin'
import { insertLedgerEntry } from '../lib/ledger'

const AUTO_APPROVE = process.env.INVOICE_AUTO_APPROVE === 'true'

export function startInvoiceWorker() {
  const connection = getRedis()
  if (!connection) {
    console.warn('[invoice-worker] Redis no configurado — worker no iniciado')
    return null
  }

  const worker = new Worker<InvoiceJobData>(
    'invoices',
    async (job) => {
      const { invoiceId, memberId, uuidCfdi, rfcEmisor, rfcReceptor, totalMxn } = job.data
      const supabase = createAdminClient()

      console.log(`[invoice-worker] Verificando ${uuidCfdi}`)

      // Verify with SAT via Facturapi
      let verification
      try {
        verification = await verifyCFDI({ uuid: uuidCfdi, rfcEmisor, rfcReceptor, total: totalMxn })
      } catch (err) {
        // Network error → let BullMQ retry with backoff
        throw err
      }

      if (!verification.valid) {
        // Mark as SAT-rejected
        await supabase
          .from('invoices')
          .update({ status: 'rejected', sat_status: verification.status, rejection_reason: `SAT: ${verification.message}` })
          .eq('id', invoiceId)

        await supabase.from('audit_log').insert({
          id:          crypto.randomUUID(),
          actor_id:    memberId,
          action:      'invoice.sat_rejected',
          target_type: 'invoice',
          target_id:   invoiceId,
          metadata:    { sat_status: verification.status, message: verification.message },
        })

        // Notify member
        const { data: member } = await supabase
          .from('members')
          .select('email, full_name, fcm_token')
          .eq('id', memberId)
          .single()

        if (member) {
          await supabase.from('notifications').insert({
            id:        crypto.randomUUID(),
            member_id: memberId,
            type:      'invoice.rejected',
            title:     'Factura no procesada',
            body:      `Tu factura no pudo ser verificada ante el SAT. ${verification.message}`,
            metadata:  { invoice_id: invoiceId, sat_status: verification.status },
          })
          if (member.fcm_token) {
            await sendPushNotification({
              fcmToken: member.fcm_token,
              title:    'Factura no procesada',
              body:     `No se pudo verificar con el SAT: ${verification.message}`,
              data:     { type: 'invoice.rejected', url: '/invoices' },
            })
          }
        }
        return
      }

      // SAT says it's valid — record sat_status, keep pending unless auto-approving
      await supabase
        .from('invoices')
        .update({ sat_status: 'vigente', status: AUTO_APPROVE ? 'approved' : 'pending' })
        .eq('id', invoiceId)

      if (!AUTO_APPROVE) {
        console.log(`[invoice-worker] ${uuidCfdi} sat_validated — esperando aprobación manual`)
        return
      }

      // Auto-approve: credit points
      const { data: invoice } = await supabase
        .from('invoices')
        .select('points_generated, uuid_cfdi, total_mxn')
        .eq('id', invoiceId)
        .single()

      const points = invoice?.points_generated ?? 0

      await insertLedgerEntry({
        memberId,
        type:        'invoice',
        points,
        description: `Factura validada: ${uuidCfdi.slice(0, 8)}…`,
        invoiceId,
        operatorId:  memberId,
      })

      await supabase
        .from('invoices')
        .update({ approved_at: new Date().toISOString(), approved_by: memberId })
        .eq('id', invoiceId)

      await supabase.from('audit_log').insert({
        id:          crypto.randomUUID(),
        actor_id:    memberId,
        action:      'invoice.auto_approved',
        target_type: 'invoice',
        target_id:   invoiceId,
        metadata:    { points, auto: true },
      })

      console.log(`[invoice-worker] ${uuidCfdi} auto-aprobada — ${points} pts`)
    },
    { connection, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    console.error(`[invoice-worker] Job ${job?.id} falló:`, err.message)
  })

  return worker
}
