/**
 * Manual-fulfillment org creator. Use this for the first few
 * brokerage sales before Stripe is wired:
 *
 *   1) Brokerage owner signs up on Reelst as an individual agent
 *      and verifies their email + license.
 *   2) You take their payment manually (Stripe Dashboard invoice,
 *      ACH, whatever).
 *   3) Run this script with their UID and the seat count they paid
 *      for. It creates the org doc, attaches the owner, sets
 *      seatsTotal, and bumps the owner's tier to pro.
 *   4) Owner logs in to Reelst, goes to Dashboard → Team, and
 *      invites their agents from there.
 *
 * Run:
 *   cd functions && node create-organization.mjs <OWNER_UID> "Org Name" <SEATS_TOTAL>
 *
 * Example:
 *   node create-organization.mjs abc123 "Coldwell Banker Miami" 25
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = 'plot-fe990'
const ownerUid = process.argv[2]
const orgName = process.argv[3]
const seatsTotal = parseInt(process.argv[4] || '', 10)

if (!ownerUid || !orgName || !Number.isFinite(seatsTotal) || seatsTotal < 1) {
  console.error('Usage: node create-organization.mjs <OWNER_UID> "Org Name" <SEATS_TOTAL>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const db = getFirestore()

const userSnap = await db.collection('users').doc(ownerUid).get()
if (!userSnap.exists) {
  console.error('User not found:', ownerUid)
  process.exit(1)
}
const user = userSnap.data()
if (user.organizationId) {
  console.error(`User already in organization ${user.organizationId} — release them first.`)
  process.exit(1)
}

const existing = await db.collection('organizations').where('ownerId', '==', ownerUid).limit(1).get()
if (!existing.empty) {
  console.error('User already owns organization', existing.docs[0].id)
  process.exit(1)
}

const now = Timestamp.now()
const orgRef = db.collection('organizations').doc()
const memberRef = orgRef.collection('members').doc(ownerUid)

const batch = db.batch()
batch.set(orgRef, {
  name: orgName,
  ownerId: ownerUid,
  seatsTotal,
  seatsAllocated: 1, // owner takes one seat
  status: 'active',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: now,
  updatedAt: now,
})
batch.set(memberRef, {
  userId: ownerUid,
  role: 'admin',
  joinedAt: now,
  displayName: user.displayName || '',
  email: user.email || '',
  photoURL: user.photoURL ?? null,
  username: user.username ?? null,
})
batch.update(userSnap.ref, {
  organizationId: orgRef.id,
  organizationRole: 'admin',
  tier: 'pro',
})
await batch.commit()

console.log('✓ organization created:', orgRef.id)
console.log('  name:        ', orgName)
console.log('  owner:       ', ownerUid)
console.log('  seatsTotal:  ', seatsTotal)
console.log('  seatsUsed:   ', 1, '(owner)')
console.log('  available:   ', seatsTotal - 1)
console.log('')
console.log('Owner can now go to Dashboard → Team to invite their agents.')
process.exit(0)
