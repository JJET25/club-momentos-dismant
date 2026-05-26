/**
 * Notification worker — inserta en DB y envía FCM push con reintentos automáticos.
 */
import crypto from 'crypto'
import { Worker } from 'bullmq'
import { getRedis, type NotificationJobData } from '../lib/queue'
import { createAdminClient } from '../lib/supabase'
import { sendPushNotification } from '../lib/firebase-admin'

export function startNotificationWorker() {
  const connection = getRedis()
  if (!connection) {
    console.warn('[notif-worker] Redis no configurado — worker no iniciado')
    return null
  }

  const worker = new Worker<NotificationJobData>(
    'notifications',
    async (job) => {
      const { memberId, type, title, body, fcmToken, metadata } = job.data
      const supabase = createAdminClient()

      // 1. Insert in-app notification
      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        member_id: memberId,
        type,
        title,
        body,
        metadata: metadata ?? null,
      })

      // 2. FCM push (retry-eligible)
      if (fcmToken) {
        await sendPushNotification({
          fcmToken,
          title,
          body,
          data: { type, url: metadata?.url as string ?? '/' },
        })
      }
    },
    { connection, concurrency: 10 }
  )

  worker.on('failed', (job, err) => {
    console.error(`[notif-worker] Job ${job?.id} falló:`, err.message)
  })

  return worker
}
