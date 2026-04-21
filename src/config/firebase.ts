import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage'
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null
let appCheck: AppCheck | null = null

if (firebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)

    // ── App Check (anti-abuse via reCAPTCHA v3) ──
    // In dev, set self.FIREBASE_APPCHECK_DEBUG_TOKEN = true on the window
    // BEFORE initializeAppCheck runs, then grab the printed token from the
    // console and register it in Firebase Console → App Check → Apps → ⋮ → Manage debug tokens.
    if (RECAPTCHA_SITE_KEY) {
      if (import.meta.env.DEV) {
        // @ts-expect-error — Firebase debug token global
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
      }
      try {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        })
      } catch (e) {
        console.warn('App Check init failed:', e)
      }
    }

    auth = getAuth(app)
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    storage = getStorage(app)

    if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://localhost:9099')
      connectFirestoreEmulator(db, 'localhost', 8080)
      connectStorageEmulator(storage, 'localhost', 9199)
    }
  } catch (e) {
    console.warn('Firebase init failed:', e)
  }
}

export { app, auth, db, storage, appCheck }
