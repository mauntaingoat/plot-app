/**
 * Google Sign-In — native iOS flow that exchanges an Apple-quality
 * native sheet sign-in for a Firebase Auth credential. Mirrors the
 * web `signInWithPopup(GoogleAuthProvider)` flow but uses the
 * platform-correct native SDK on iOS.
 *
 * Flow:
 *   1. GoogleSignin.configure() once at module load (idempotent)
 *   2. GoogleSignin.signIn() opens the native sheet, returns the
 *      Google ID token
 *   3. Hand the ID token to Firebase Auth as a GoogleAuthProvider
 *      credential — Firebase mints a session matching the same UID
 *      we'd get from web sign-in (Firebase Auth is provider-agnostic)
 *
 * Caller is responsible for surfacing errors. Cancellation is
 * communicated via the `CANCELLED` exit code so callers can no-op.
 */
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import auth from '@react-native-firebase/auth'

// iOS OAuth Client ID from GoogleService-Info.plist. Bundled with
// the app at build time, not a secret — same value the URL scheme
// in Info.plist is keyed on.
const IOS_CLIENT_ID = '1036651969923-6sgfathmkt6jide50md5un70mnbanjfe.apps.googleusercontent.com'

let configured = false
function ensureConfigured() {
  if (configured) return
  GoogleSignin.configure({ iosClientId: IOS_CLIENT_ID })
  configured = true
}

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled.')
    this.name = 'GoogleSignInCancelledError'
  }
}

/** Run the native Google sign-in sheet and resolve with the Firebase
 *  user once exchange completes. Throws `GoogleSignInCancelledError`
 *  when the user dismisses the sheet — callers should treat that as
 *  a no-op rather than an error to surface. */
export async function signInWithGoogle() {
  ensureConfigured()
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false })
  } catch {
    // Android-only check; on iOS the call is a no-op and any failure
    // is benign. Proceed to sign-in.
  }

  let signInResult
  try {
    signInResult = await GoogleSignin.signIn()
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (
      code === statusCodes.SIGN_IN_CANCELLED ||
      code === statusCodes.IN_PROGRESS
    ) {
      throw new GoogleSignInCancelledError()
    }
    throw err
  }

  // The new SDK shape returns { type: 'success', data: { idToken } }
  // or { type: 'cancelled' }. Old shape returned { idToken } at the
  // top level. Support both defensively so an SDK minor-version
  // change doesn't silently break the flow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = signInResult as any
  if (result?.type === 'cancelled') throw new GoogleSignInCancelledError()
  const idToken: string | undefined = result?.data?.idToken ?? result?.idToken
  if (!idToken) {
    throw new Error('Google sign-in returned no ID token.')
  }

  const credential = auth.GoogleAuthProvider.credential(idToken)
  const userCred = await auth().signInWithCredential(credential)
  return userCred.user
}

/** Sign out from Google + Firebase. Useful on Settings → Sign out so
 *  the next Continue with Google tap shows the account picker rather
 *  than auto-resuming the last session. */
export async function signOutFromGoogle() {
  try {
    ensureConfigured()
    await GoogleSignin.signOut()
  } catch {
    // Best-effort; never block Firebase signOut on a Google SDK quirk.
  }
}
