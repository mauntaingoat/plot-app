/**
 * Grant admin to a UID. Sets a Firebase Auth custom claim (`admin: true`)
 * AND mirrors `tier: 'pro'` onto users/{uid} so admins get Pro features
 * without an isAdmin() check inside getUserTier().
 *
 * Run:  cd functions && node grant-admin.mjs <UID>
 *
 * After running, the granted user must sign out + sign in for the new
 * token to include the claim (token cache is ~1h otherwise). Verify
 * with:  node check-admin.mjs <UID>
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'plot-fe990'
const uid = process.argv[2]

if (!uid) {
  console.error('Usage: node grant-admin.mjs <UID>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })

const auth = getAuth()
const db = getFirestore()

// Preserve any existing claims; add admin: true on top.
const user = await auth.getUser(uid)
const existing = user.customClaims || {}
await auth.setCustomUserClaims(uid, { ...existing, admin: true })
console.log('✓ custom claim { admin: true } set on uid', uid)

await db.collection('users').doc(uid).update({ tier: 'pro' })
console.log('✓ users/' + uid + ' tier set to pro')

console.log('\nNext: sign the user out and back in so the fresh ID token includes the claim.')
process.exit(0)
