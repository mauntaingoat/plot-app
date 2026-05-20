/**
 * One-off: dump every doc in the `pins` collection so we can figure out
 * why the Storage sweep matched 7 pin folders while only 5 pins are
 * visible across all agent dashboards.
 *
 *   cd functions && node inspect-pin-docs.mjs
 *
 * Prints one row per pin with the fields that decide visibility:
 *   id · agentId · status · enabled · archivedAt · createdAt · title
 * Then summarizes by status/enabled so the 2 ghosts are obvious.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'plot-fe990'

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
})

const db = getFirestore()

const snap = await db.collection('pins').get()
console.log(`Total pin docs: ${snap.size}`)
console.log('---')

const rows = []
for (const doc of snap.docs) {
  const d = doc.data()
  rows.push({
    id: doc.id,
    agentId: d.agentId || '(none)',
    status: d.status || '(unset)',
    enabled: d.enabled === undefined ? '(unset)' : d.enabled,
    archivedAt: d.archivedAt?.toDate?.()?.toISOString() || '',
    createdAt: d.createdAt?.toDate?.()?.toISOString() || '',
    title: d.title || d.address || '(no title)',
  })
}

// Sort: active+enabled first, then by status
rows.sort((a, b) => {
  const aLive = a.status !== 'archived' && a.enabled !== false ? 0 : 1
  const bLive = b.status !== 'archived' && b.enabled !== false ? 0 : 1
  if (aLive !== bLive) return aLive - bLive
  return (a.agentId + a.id).localeCompare(b.agentId + b.id)
})

for (const r of rows) {
  console.log(
    `${r.id.padEnd(22)} agent=${String(r.agentId).slice(0, 12).padEnd(12)} status=${String(r.status).padEnd(10)} enabled=${String(r.enabled).padEnd(7)} archivedAt=${r.archivedAt.padEnd(25)} title=${String(r.title).slice(0, 40)}`,
  )
}

// Summarize.
const byStatus = {}
const byAgentVisible = {}
for (const r of rows) {
  const key = `${r.status} / enabled=${r.enabled}`
  byStatus[key] = (byStatus[key] || 0) + 1
  if (r.status !== 'archived' && r.enabled !== false) {
    byAgentVisible[r.agentId] = (byAgentVisible[r.agentId] || 0) + 1
  }
}
console.log('---')
console.log('Breakdown by status/enabled:')
for (const [k, v] of Object.entries(byStatus)) console.log(`  ${k.padEnd(40)} ${v}`)
console.log('---')
console.log('Publicly-visible pins per agent (status != archived AND enabled != false):')
for (const [agent, n] of Object.entries(byAgentVisible)) console.log(`  ${agent.padEnd(30)} ${n}`)

process.exit(0)
