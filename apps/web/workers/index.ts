/**
 * Worker runner — iniciar con: npm run workers (desde apps/web/)
 * Requiere que UPSTASH_REDIS_HOST y UPSTASH_REDIS_PASSWORD estén configurados.
 */
import 'dotenv/config'
import { startInvoiceWorker } from './invoice.worker'
import { startNotificationWorker } from './notification.worker'

const invoiceWorker      = startInvoiceWorker()
const notificationWorker = startNotificationWorker()

const active = [invoiceWorker, notificationWorker].filter(Boolean).length
console.log(`[workers] ${active} worker(s) activos`)

if (active === 0) {
  console.error('[workers] Ningún worker iniciado. Verifica las variables de entorno.')
  process.exit(1)
}

process.on('SIGTERM', async () => {
  console.log('[workers] Apagando workers...')
  await Promise.all([invoiceWorker?.close(), notificationWorker?.close()])
  process.exit(0)
})
