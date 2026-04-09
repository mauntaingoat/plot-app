/**
 * Firebase Cloud Messaging service worker
 *
 * Handles incoming push messages when the Reelst tab is closed or
 * backgrounded. The browser shows a native OS notification.
 *
 * Lives at /firebase-messaging-sw.js so it can be registered at the
 * site root scope. Loaded via importScripts because service workers
 * don't support ESM imports in older browsers.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

// Pulled from your client config — these are public values, safe to inline.
firebase.initializeApp({
  apiKey: 'AIzaSyBjaQ1Z1qCLjlIIWQEZmvDaHbiWbNZCV-U',
  authDomain: 'plot-fe990.firebaseapp.com',
  projectId: 'plot-fe990',
  storageBucket: 'plot-fe990.firebasestorage.app',
  messagingSenderId: '1036651969923',
  appId: '1:1036651969923:web:22a4374986e6930db2cab6',
})

const messaging = firebase.messaging()

// Background message handler — fires when the tab is closed/backgrounded.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Reelst'
  const body = payload.notification?.body || ''
  const url = payload.data?.url || '/'

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: payload.data?.tag || 'reelst',
    data: { url },
    requireInteraction: false,
  })
})

// Click handler — open the relevant page (or focus an existing tab).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    }),
  )
})
