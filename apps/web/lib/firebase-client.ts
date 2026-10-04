import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export type PushSetupResult = 'ok' | 'unconfigured' | 'unsupported' | 'denied' | 'error'

/** true si este ambiente tiene Firebase configurado (en local no lo tiene). */
export const isPushConfigured = () => !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY

export async function requestAndSavePushToken(): Promise<PushSetupResult> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!isPushConfigured()) return 'unconfigured'

  try {
    const supported = await isSupported()
    if (!supported) return 'unsupported'

    const app       = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })

    const token = await getToken(messaging, {
      vapidKey:                  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })

    if (!token) return 'error'
    await fetch('/api/client/fcm-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    return 'ok'
  } catch {
    // Silent — push is optional, never break the app
    return 'error'
  }
}
