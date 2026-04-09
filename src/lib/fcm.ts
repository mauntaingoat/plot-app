/**
 * Firebase Cloud Messaging — web push wiring
 *
 * Flow:
 *   1. requestNotificationPermission() — asks the OS for permission
 *   2. getOrRefreshFcmToken() — registers the service worker, gets a token
 *   3. saveFcmTokenToUser() — persists token to the user's Firestore doc
 *   4. listenToForegroundMessages() — fires a callback while the tab is open
 *
 * The matching service worker lives at /firebase-messaging-sw.js so it
 * can be registered at the site root.
 */

import { getMessaging, getToken, onMessage, type Messaging, isSupported } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { app, db, VAPID_KEY } from '@/config/firebase'

let messagingPromise: Promise<Messaging | null> | null = null

/**
 * Lazily initialize Messaging. Returns null if the browser doesn't support it
 * (e.g. Safari < 16.4 without PWA install, in-app browsers, server-side).
 */
export function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise
  messagingPromise = (async () => {
    if (!app) return null
    try {
      const supported = await isSupported()
      if (!supported) return null
      return getMessaging(app)
    } catch {
      return null
    }
  })()
  return messagingPromise
}

/**
 * Asks the browser/OS for notification permission. Returns the resulting
 * permission state. Safe to call multiple times — the prompt only shows
 * once per origin per user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Registers the messaging service worker, fetches a token from FCM, and
 * returns it. Returns null if any prerequisite is missing.
 */
export async function getOrRefreshFcmToken(): Promise<string | null> {
  if (!VAPID_KEY) {
    console.warn('[fcm] VITE_FIREBASE_VAPID_KEY missing — push disabled')
    return null
  }
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  if (Notification.permission !== 'granted') return null

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    return token || null
  } catch (e) {
    console.warn('[fcm] getToken failed:', e)
    return null
  }
}

/** Adds the device token to the user's `fcmTokens` array (dedupe-safe via arrayUnion). */
export async function saveFcmTokenToUser(uid: string, token: string) {
  if (!db) return
  await updateDoc(doc(db, 'users', uid), {
    fcmTokens: arrayUnion(token),
  }).catch(() => {})
}

/** Removes a device token (e.g. on sign-out or notification opt-out). */
export async function removeFcmTokenFromUser(uid: string, token: string) {
  if (!db) return
  await updateDoc(doc(db, 'users', uid), {
    fcmTokens: arrayRemove(token),
  }).catch(() => {})
}

/**
 * Subscribes to foreground messages — these fire when the user has the
 * tab open. The browser does NOT show a system notification in that
 * case, so the app needs to render an in-app toast itself.
 *
 * Returns an unsubscribe function.
 */
export async function listenToForegroundMessages(
  callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || '',
      body: payload.notification?.body || '',
      data: payload.data,
    })
  })
}
