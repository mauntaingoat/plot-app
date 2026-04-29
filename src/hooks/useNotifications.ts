import { useEffect, useCallback, useState } from 'react'
import {
  requestNotificationPermission,
  getOrRefreshFcmToken,
  saveFcmTokenToUser,
  removeFcmTokenFromUser,
  listenToForegroundMessages,
} from '@/lib/fcm'
import { useAuthStore } from '@/stores/authStore'

interface ToastPayload {
  id: number
  title: string
  body: string
  url?: string
}

/**
 * App-wide notifications hook. Mount once near the top of the tree.
 *
 * Responsibilities:
 *  - Auto-registers a token if the user already granted permission previously
 *    (so we don't lose them on page reload).
 *  - Exposes `enable()` to ask permission and persist the token.
 *  - Subscribes to foreground messages and surfaces them as toasts.
 */
export function useNotifications() {
  const { userDoc } = useAuthStore()
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const [toasts, setToasts] = useState<ToastPayload[]>([])

  // ── Foreground message subscription ──
  useEffect(() => {
    let unsub: (() => void) | null = null
    listenToForegroundMessages((payload) => {
      setToasts((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          title: payload.title,
          body: payload.body,
          url: payload.data?.url,
        },
      ])
    }).then((fn) => {
      unsub = fn
    })
    return () => {
      if (unsub) unsub()
    }
  }, [])

  // ── Auto-register token if previously granted ──
  // ── Reconcile stored tokens with current permission state ──
  // If the user revoked permission since their last visit, the tokens
  // sitting on their user doc are dead — clear them so server pushes
  // don't waste FCM API calls firing into the void.
  useEffect(() => {
    if (!userDoc?.uid) return
    if (permission === 'granted') {
      ;(async () => {
        const token = await getOrRefreshFcmToken()
        if (token) await saveFcmTokenToUser(userDoc.uid, token)
      })()
    } else if (permission === 'denied') {
      import('@/lib/fcm').then(({ reconcileFcmTokens }) => reconcileFcmTokens(userDoc.uid)).catch(() => {})
    }
  }, [userDoc?.uid, permission])

  // ── Public API ──

  const enable = useCallback(async (): Promise<boolean> => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result !== 'granted' || !userDoc?.uid) return false
    const token = await getOrRefreshFcmToken()
    if (!token) return false
    await saveFcmTokenToUser(userDoc.uid, token)
    return true
  }, [userDoc?.uid])

  const disable = useCallback(async () => {
    if (!userDoc?.uid) return
    const token = await getOrRefreshFcmToken().catch(() => null)
    if (token) await removeFcmTokenFromUser(userDoc.uid, token)
  }, [userDoc?.uid])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { permission, enable, disable, toasts, dismissToast }
}
