/**
 * One-off Storage orphan sweep.
 *
 * Walks every `pins/<id>/` folder in Storage and classifies each:
 *
 *   - `unlinked-<token>` folders are how standalone-content uploads
 *     (no parent pin) are stored. `publish.ts` uses
 *     `pinMediaPath('unlinked-<ts>', ...)` and the resulting URL is
 *     written to a `content` doc's mediaUrl / mediaUrls / sourceUrls /
 *     thumbnailUrl. So an `unlinked-*` folder is ORPHAN only if no
 *     content doc references it.
 *
 *   - Non-unlinked folders are named after a Firestore pin doc ID.
 *     ORPHAN if the pin doc doesn't exist (hard-deleted out-of-band
 *     or predates the cleanupArchivedAssets scheduled function).
 *
 * Dry-run by default — prints a classification report and bytes that
 * WOULD be freed without touching anything.
 *
 *   cd functions && node sweep-storage-orphans.mjs
 *
 * After reviewing, re-run with --commit to actually delete:
 *
 *   cd functions && node sweep-storage-orphans.mjs --commit
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const PROJECT_ID = 'plot-fe990'
const COMMIT = process.argv.includes('--commit')

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: `${PROJECT_ID}.firebasestorage.app`,
})

const db = getFirestore()
const bucket = getStorage().bucket()

console.log(`Mode: ${COMMIT ? 'COMMIT (will delete)' : 'DRY RUN (no deletes)'}`)
console.log(`Bucket: ${bucket.name}`)
console.log('---')

// 1. List every file under `pins/`, group by folder, track total bytes.
const [allFiles] = await bucket.getFiles({ prefix: 'pins/' })
const folders = new Map() // folderName -> { files: [], bytes }
let totalBytes = 0
for (const file of allFiles) {
  const segments = file.name.split('/')
  if (segments.length < 3) continue
  const folderName = segments[1] // e.g. `unlinked-1776517994205` or a pin ID
  const size = Number(file.metadata.size || 0)
  totalBytes += size
  const entry = folders.get(folderName)
  if (entry) {
    entry.files.push(file)
    entry.bytes += size
  } else {
    folders.set(folderName, { files: [file], bytes: size })
  }
}
console.log(`Found ${folders.size} pin folders, ${allFiles.length} files, ${fmtBytes(totalBytes)} total`)

// 2. Cross-reference non-unlinked folders against the `pins` collection.
const nonUnlinkedIds = [...folders.keys()].filter((k) => !k.startsWith('unlinked-'))
const existingPinIds = new Set()
for (let i = 0; i < nonUnlinkedIds.length; i += 30) {
  const batch = nonUnlinkedIds.slice(i, i + 30)
  const refs = batch.map((id) => db.collection('pins').doc(id))
  const snaps = await db.getAll(...refs)
  for (const snap of snaps) if (snap.exists) existingPinIds.add(snap.id)
}
console.log(`Non-unlinked folders: ${nonUnlinkedIds.length}; matched pin docs: ${existingPinIds.size}`)

// 3. Cross-reference unlinked folders against the `content` collection.
//    Strategy: scan every content doc, extract `pins/unlinked-<token>`
//    folder names from mediaUrl / mediaUrls / sourceUrl / sourceUrls /
//    thumbnailUrl, and collect the set of folder names that ARE
//    referenced. Anything else is an orphan upload.
const unlinkedIds = new Set([...folders.keys()].filter((k) => k.startsWith('unlinked-')))
const referencedUnlinked = new Set()
const URL_FIELDS = ['mediaUrl', 'thumbnailUrl', 'sourceUrl']
const URL_ARRAY_FIELDS = ['mediaUrls', 'sourceUrls']
const FOLDER_RE = /pins\/(unlinked-[^/?]+)/g
function harvestUrls(obj) {
  const urls = []
  for (const f of URL_FIELDS) if (typeof obj[f] === 'string') urls.push(obj[f])
  for (const f of URL_ARRAY_FIELDS) if (Array.isArray(obj[f])) for (const u of obj[f]) if (typeof u === 'string') urls.push(u)
  return urls
}
// Standalone content collection.
const contentSnap = await db.collection('content').get()
for (const doc of contentSnap.docs) {
  for (const url of harvestUrls(doc.data())) {
    for (const match of url.matchAll(FOLDER_RE)) referencedUnlinked.add(match[1])
  }
}
// Pins also embed content[] arrays — scan those too in case any pin
// has content uploaded under an unlinked-* path before being attached.
const pinsAllSnap = await db.collection('pins').get()
for (const doc of pinsAllSnap.docs) {
  const data = doc.data()
  const items = Array.isArray(data.content) ? data.content : []
  for (const item of items) {
    for (const url of harvestUrls(item)) {
      for (const match of url.matchAll(FOLDER_RE)) referencedUnlinked.add(match[1])
    }
  }
}
console.log(`Unlinked folders: ${unlinkedIds.size}; referenced by content/pins docs: ${referencedUnlinked.size}`)

// 4. Classify + delete.
let kept = 0
let keptBytes = 0
let unlinkedToDelete = 0
let unlinkedToDeleteBytes = 0
let hardDeletedToDelete = 0
let hardDeletedToDeleteBytes = 0
let filesDeleted = 0
const errors = []

for (const [folderName, entry] of folders) {
  const isUnlinked = folderName.startsWith('unlinked-')
  let shouldDelete = false

  if (isUnlinked) {
    if (referencedUnlinked.has(folderName)) {
      kept++
      keptBytes += entry.bytes
      continue
    }
    unlinkedToDelete++
    unlinkedToDeleteBytes += entry.bytes
    shouldDelete = true
  } else {
    if (existingPinIds.has(folderName)) {
      kept++
      keptBytes += entry.bytes
      continue
    }
    hardDeletedToDelete++
    hardDeletedToDeleteBytes += entry.bytes
    shouldDelete = true
  }

  if (!shouldDelete) continue
  for (const file of entry.files) {
    if (COMMIT) {
      try {
        await file.delete({ ignoreNotFound: true })
        filesDeleted++
      } catch (err) {
        errors.push(`${file.name}: ${err.message || err}`)
      }
    } else {
      filesDeleted++ // count what WOULD be deleted
    }
  }
}

console.log('---')
console.log(`Kept (live data):                              ${kept.toString().padStart(4)} folders, ${fmtBytes(keptBytes)}`)
console.log(`Orphan unlinked-* (no content ref) → delete:   ${unlinkedToDelete.toString().padStart(4)} folders, ${fmtBytes(unlinkedToDeleteBytes)}`)
console.log(`Orphan hard-deleted pin → delete:              ${hardDeletedToDelete.toString().padStart(4)} folders, ${fmtBytes(hardDeletedToDeleteBytes)}`)
console.log(`Files ${COMMIT ? 'deleted' : 'WOULD be deleted'}: ${filesDeleted}`)
console.log(`Storage ${COMMIT ? 'freed' : 'WOULD be freed'}: ${fmtBytes(unlinkedToDeleteBytes + hardDeletedToDeleteBytes)}`)
if (errors.length > 0) {
  console.log(`\nErrors (${errors.length}, first 10):`)
  for (const e of errors.slice(0, 10)) console.log(`  ${e}`)
}
console.log(COMMIT ? '\n✓ Done.' : '\n(DRY RUN — re-run with --commit to actually delete.)')
process.exit(0)

function fmtBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}
