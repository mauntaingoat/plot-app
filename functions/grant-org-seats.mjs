/**
 * Adjust seatsTotal on an existing organization. Manual-fulfillment
 * path before Stripe is wired — use when a brokerage adds or drops
 * seats and pays you out-of-band.
 *
 * Refuses to drop below the org's current seatsAllocated (you must
 * release members first).
 *
 * Run:
 *   cd functions && node grant-org-seats.mjs <ORG_ID> <NEW_SEATS_TOTAL>
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = 'plot-fe990'
const orgId = process.argv[2]
const newTotal = parseInt(process.argv[3] || '', 10)

if (!orgId || !Number.isFinite(newTotal) || newTotal < 1) {
  console.error('Usage: node grant-org-seats.mjs <ORG_ID> <NEW_SEATS_TOTAL>')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const db = getFirestore()

const ref = db.collection('organizations').doc(orgId)
const snap = await ref.get()
if (!snap.exists) {
  console.error('Organization not found:', orgId)
  process.exit(1)
}
const org = snap.data()
if (newTotal < org.seatsAllocated) {
  console.error(`Cannot drop to ${newTotal} — currently allocated ${org.seatsAllocated}. Release members first.`)
  process.exit(1)
}
if (org.stripeSubscriptionId) {
  console.error('Organization is Stripe-billed. Adjust seat count via Stripe Dashboard instead.')
  process.exit(1)
}

await ref.update({
  seatsTotal: newTotal,
  updatedAt: Timestamp.now(),
})

console.log('✓ organization', orgId, 'seatsTotal updated:', org.seatsTotal, '→', newTotal)
console.log('  seatsAllocated:', org.seatsAllocated, '(unchanged)')
console.log('  available:     ', newTotal - org.seatsAllocated)
process.exit(0)
