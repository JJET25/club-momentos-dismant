import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function getFirebaseApp(): App | null {
  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return null
  }

  if (getApps().length > 0) return getApp()

  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}

/** Envía una push notification a un token FCM. No lanza error si FCM no está configurado. */
export async function sendPushNotification(params: {
  fcmToken: string
  title:    string
  body:     string
  data?:    Record<string, string>
}): Promise<void> {
  const app = getFirebaseApp()
  if (!app) {
    console.warn('[FCM] Firebase Admin no configurado — push omitida')
    return
  }

  try {
    await getMessaging(app).send({
      token:        params.fcmToken,
      notification: { title: params.title, body: params.body },
      data:         params.data,
      webpush: {
        notification: {
          title: params.title,
          body:  params.body,
          icon:  '/icon-192.png',
        },
      },
    })
  } catch (err) {
    // Token inválido / expirado — no relanzar para no romper el flujo
    console.error('[FCM] Error al enviar push:', err)
  }
}
