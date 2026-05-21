/**
 * Thin wrapper around @react-native-firebase/auth — native iOS Firebase
 * Auth SDK. No WebView, no CORS, no JS SDK quirks. Auth state is read
 * via `auth().onAuthStateChanged()`, identical pattern to the web app's
 * `useAuthListener` (which uses the JS SDK's listener).
 *
 * All operations hit the same Firebase project (plot-fe990) as the web
 * app via the bundled GoogleService-Info.plist. A user signed up here
 * is the same UID as one signed up via reel.st on desktop — same
 * Firestore /users/{uid} doc, same dashboard data.
 */
import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth'

export type FirebaseUser = FirebaseAuthTypes.User

/** Subscribe to auth state changes. Returns unsubscribe. */
export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return auth().onAuthStateChanged(callback)
}

/** Current user, or null. */
export function currentUser(): FirebaseUser | null {
  return auth().currentUser
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  const cred = await auth().signInWithEmailAndPassword(email, password)
  return cred.user
}

export async function createUserWithEmailAndPassword(email: string, password: string) {
  const cred = await auth().createUserWithEmailAndPassword(email, password)
  return cred.user
}

export async function signOut() {
  await auth().signOut()
}

export async function sendPasswordResetEmail(email: string) {
  await auth().sendPasswordResetEmail(email)
}

export async function sendEmailVerification() {
  const user = auth().currentUser
  if (!user) throw new Error('No user signed in')
  await user.sendEmailVerification()
}

export async function reloadCurrentUser() {
  const user = auth().currentUser
  if (!user) return null
  await user.reload()
  return auth().currentUser
}

/** Map a Firebase auth error code to a short, user-readable string. */
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with that email'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password'
    case 'auth/invalid-email':
      return 'Invalid email format'
    case 'auth/email-already-in-use':
      return 'An account with that email already exists'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters'
    case 'auth/too-many-requests':
      return 'Too many attempts — wait a minute and try again'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.'
    case 'auth/user-disabled':
      return 'This account has been disabled'
    default:
      return fallback
  }
}
