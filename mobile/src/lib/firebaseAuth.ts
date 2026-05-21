/**
 * Thin wrapper around @react-native-firebase/auth (modular API, v22+) —
 * native iOS Firebase Auth SDK. No WebView, no CORS, no JS SDK quirks.
 * Auth state is read via `onAuthStateChanged(getAuth(), …)`, identical
 * pattern to the web app's JS SDK call.
 *
 * All operations hit the same Firebase project (plot-fe990) as the
 * web app via the bundled GoogleService-Info.plist. A user signed up
 * here is the same UID as one signed up via reel.st on desktop — same
 * Firestore /users/{uid} doc, same dashboard data.
 */
import {
  getAuth,
  onAuthStateChanged as onAuthStateChangedNative,
  signInWithEmailAndPassword as signInWithEmailAndPasswordNative,
  createUserWithEmailAndPassword as createUserWithEmailAndPasswordNative,
  signOut as signOutNative,
  sendPasswordResetEmail as sendPasswordResetEmailNative,
  sendEmailVerification as sendEmailVerificationNative,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth'

export type FirebaseUser = FirebaseAuthTypes.User

/** Subscribe to auth state changes. Returns unsubscribe. */
export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChangedNative(getAuth(), callback)
}

/** Current user, or null. */
export function currentUser(): FirebaseUser | null {
  return getAuth().currentUser
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  const cred = await signInWithEmailAndPasswordNative(getAuth(), email, password)
  return cred.user
}

export async function createUserWithEmailAndPassword(email: string, password: string) {
  const cred = await createUserWithEmailAndPasswordNative(getAuth(), email, password)
  return cred.user
}

export async function signOut() {
  await signOutNative(getAuth())
}

export async function sendPasswordResetEmail(email: string) {
  await sendPasswordResetEmailNative(getAuth(), email)
}

export async function sendEmailVerification() {
  const user = getAuth().currentUser
  if (!user) throw new Error('No user signed in')
  await sendEmailVerificationNative(user)
}

export async function reloadCurrentUser() {
  const user = getAuth().currentUser
  if (!user) return null
  await user.reload()
  return getAuth().currentUser
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
