import { Queue, type QueueOptions } from 'bullmq'
import IORedis from 'ioredis'

// ── Job data types ───────────────────────────────────────────

export type InvoiceJobData = {
  invoiceId:   string
  memberId:    string
  uuidCfdi:    string
  rfcEmisor:   string
  rfcReceptor: string
  totalMxn:    number
}

export type NotificationJobData = {
  memberId:  string
  type:      string
  title:     string
  body:      string
  fcmToken?: string | null
  metadata?: Record<string, unknown>
}

export type StatementJobData = {
  memberId: string
  from?:    string
  to?:      string
  month?:   string  // YYYY-MM for cache key
}

// ── Redis connection ─────────────────────────────────────────

let _redis: IORedis | null | undefined = undefined

function getRedis(): IORedis | null {
  if (_redis !== undefined) return _redis

  const host     = process.env.UPSTASH_REDIS_HOST
  const password = process.env.UPSTASH_REDIS_PASSWORD
  if (!host || !password) {
    console.warn('[Queue] UPSTASH_REDIS_HOST/PASSWORD no configurados — colas deshabilitadas')
    _redis = null
    return null
  }

  _redis = new IORedis({
    host,
    port:                 6379,
    password,
    tls:                  {},
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck:     false,
    lazyConnect:          true,
  })
  return _redis
}

function makeQueueOpts(): QueueOptions | null {
  const conn = getRedis()
  if (!conn) return null
  return { connection: conn }
}

// ── Queue singletons ─────────────────────────────────────────

let _invoices:      Queue<InvoiceJobData>      | null | undefined = undefined
let _notifications: Queue<NotificationJobData> | null | undefined = undefined
let _statements:    Queue<StatementJobData>    | null | undefined = undefined

function getQueue<T>(
  ref: { get: () => Queue<T> | null | undefined; set: (q: Queue<T> | null) => void },
  name: string
): Queue<T> | null {
  if (ref.get() !== undefined) return ref.get()!
  const opts = makeQueueOpts()
  const q = opts ? new Queue<T>(name, opts) : null
  ref.set(q)
  return q
}

// ── Public producers ─────────────────────────────────────────

export async function enqueueInvoiceValidation(data: InvoiceJobData): Promise<void> {
  const q = getQueue<InvoiceJobData>(
    { get: () => _invoices, set: (v) => { _invoices = v } },
    'invoices'
  )
  if (!q) return
  await q.add('validate', data, {
    attempts:         3,
    backoff:          { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50 },
  })
}

export async function enqueueNotification(data: NotificationJobData): Promise<void> {
  const q = getQueue<NotificationJobData>(
    { get: () => _notifications, set: (v) => { _notifications = v } },
    'notifications'
  )
  if (!q) return
  await q.add('send', data, {
    attempts:         2,
    backoff:          { type: 'fixed', delay: 3_000 },
    removeOnComplete: { count: 200 },
    removeOnFail:     { count: 50 },
  })
}

export async function enqueueStatementPDF(data: StatementJobData): Promise<void> {
  const q = getQueue<StatementJobData>(
    { get: () => _statements, set: (v) => { _statements = v } },
    'statements'
  )
  if (!q) return
  await q.add('generate', data, {
    jobId:            `stmt-${data.memberId}-${data.month ?? 'custom'}`, // dedup
    removeOnComplete: { count: 50 },
    removeOnFail:     { count: 20 },
  })
}

/** Devuelve la conexión IORedis para uso en Workers (que necesitan la misma instancia). */
export { getRedis }
