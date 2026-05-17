/**
 * Revoke admin from a UID. Removes the `admin` custom claim and resets
 * users/{uid}.tier back to 'free' (mirror of the grant script).
 *
 * Run:  cd functions && node revoke-admin.mjs <UID>
 *
 * Token cache is up to ~1h — revocation takes effect on next sign-in
 * or token refresh. To force-revoke immediately, call
 * auth.revokeRefreshTokens(uid) which invalidates all active sessions
 * for that uid (drastic — the user gets signed out everywhere).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'plot-fe990'
const uid = process.argv[2]

if (!uid) {
  console.error('Usage: node revoke-admin.mjs <UID>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })

const auth = getAuth()
const db = getFirestore()

const user = await auth.getUser(uid)
const { admin: _drop, ...rest } = user.customClaims || {}
await auth.setCustomUserClaims(uid, rest)
console.log('✓ admin claim removed from uid', uid)

await db.collection('users').doc(uid).update({ tier: 'free' })
console.log('✓ users/' + uid + ' tier set to free')

console.log('\nClaim removal takes effect on next sign-in or token refresh (within ~1h).')
process.exit(0)
