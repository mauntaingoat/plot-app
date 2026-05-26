#!/usr/bin/env node
/**
 * sweep-orphan-pin-storage.mjs
 *
 * The `cleanupArchivedAssets` cron handles the soft-delete (archive)
 * path cleanly. It does NOT handle:
 *   - Pins that were hard-deleted from Firestore (manual Console cleanup,
 *     buggy code path, or test data) — the `pins/{pinId}/` folder
 *     orphans forever.
 *   - `pins/unlinked-{ts}/` folders from aborted content uploads
 *     (photos uploaded before the content doc was written, then the
 *     agent backed out).
 *
 * This script does an explicit orphan sweep:
 *   1. Lists every top-level directory under `pins/` in Storage.
 *   2. Checks each one's `pinId` against Firestore.
 *   3. Surfaces orphans (Storage prefix exists, no live pin doc).
 *   4. With --apply, deletes the orphaned files.
 *
 * Safety rails:
 *   - Dry-run by default; --apply required to delete.
 *   - Only deletes folders whose newest file is older than --min-age-days
 *     (default 1) — protects in-flight uploads.
 *   - `unlinked-` folders are matched separately and need --include-unlinked
 *     to be touched (extra safety for that path).
 *
 * Usage:
 *   node scripts/sweep-orphan-pin-storage.mjs                       # dry-run, pin-id folders only
 *   node scripts/sweep-orphan-pin-storage.mjs --include-unlinked    # dry-run, also include unlinked-*
 *   node scripts/sweep-orphan-pin-storage.mjs --apply --include-unlinked
 *   node scripts/sweep-orphan-pin-storage.mjs --min-age-days=7      # extra-conservative
 *
 * Auth: requires GOOGLE_APPLICATION_CREDENTIALS to point at a service
 * account JSON with Storage + Firestore read/delete perms, OR an
 * environment where firebase-admin can auto-discover credentials
 * (e.g., `gcloud auth application-default login`).
 */

import { createRequire } from 'module'
import { parseArgs } from 'node:util'

// firebase-admin lives in functions/node_modules — same pattern as the
// other repo scripts (publish-blog-post.mjs, update-blog-cover.mjs) so
// we don't need a separate install at the repo root.
const require = createRequire(import.meta.url)
const admin = require('../functions/node_modules/firebase-admin')

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    'include-unlinked': { type: 'boolean', default: false },
    'min-age-days': { type: 'string', default: '1' },
    'project-id': { type: 'string', default: 'plot-fe990' },
    bucket: { type: 'string', default: 'plot-fe990.firebasestorage.app' },
  },
})
const APPLY = values.apply
const INCLUDE_UNLINKED = values['include-unlinked']
const MIN_AGE_DAYS = parseInt(values['min-age-days'], 10)
if (!Number.isFinite(MIN_AGE_DAYS) || MIN_AGE_DAYS < 0) {
  console.error('--min-age-days must be a non-negative integer')
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: values['project-id'],
    storageBucket: values.bucket,
  })
}

const db = admin.firestore()
const bucket = admin.storage().bucket()

const MIN_AGE_MS = MIN_AGE_DAYS * 24 * 60 * 60 * 1000

function bytesToHuman(n) {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

/** Return the unique top-level "directory" names under pins/. */
async function listPinPrefixes() {
  const [, , apiResp] = await bucket.getFiles({
    prefix: 'pins/',
    delimiter: '/',
    autoPaginate: true,
    maxResults: 1000,
  })
  const prefixes = apiResp?.prefixes || []
  // Strip leading `pins/` and trailing `/`
  return prefixes.map((p) => p.replace(/^pins\//, '').replace(/\/$/, '')).filter(Boolean)
}

/** Sum size + find newest mtime + count files under a single prefix. */
async function describePrefix(prefix) {
  const [files] = await bucket.getFiles({ prefix: `pins/${prefix}/` })
  let bytes = 0
  let newestMs = 0
  for (const f of files) {
    bytes += Number(f.metadata?.size || 0)
    const mt = f.metadata?.updated || f.metadata?.timeCreated
    if (mt) {
      const ms = new Date(mt).getTime()
      if (ms > newestMs) newestMs = ms
    }
  }
  return { count: files.length, bytes, newestMs, files }
}

/** Check whether a Firestore pin doc with this id exists. */
async function pinDocExists(pinId) {
  if (pinId.startsWith('unlinked-')) return false
  try {
    const snap = await db.collection('pins').doc(pinId).get()
    return snap.exists
  } catch (err) {
    console.error(`  Firestore lookup failed for ${pinId}: ${err.message}`)
    // Fail-closed: treat as "exists" so we don't accidentally delete real data.
    return true
  }
}

async function main() {
  console.log(`Orphan-pin-storage sweep — bucket: ${bucket.name}`)
  console.log(`  mode: ${APPLY ? 'APPLY (will delete)' : 'dry-run'}`)
  console.log(`  include unlinked-*: ${INCLUDE_UNLINKED ? 'yes' : 'no'}`)
  console.log(`  min-age-days: ${MIN_AGE_DAYS}`)
  console.log()

  const prefixes = await listPinPrefixes()
  console.log(`Found ${prefixes.length} top-level pin storage directories.\n`)

  const now = Date.now()
  const orphans = []

  for (const prefix of prefixes) {
    const isUnlinked = prefix.startsWith('unlinked-')
    if (isUnlinked && !INCLUDE_UNLINKED) continue

    const exists = await pinDocExists(prefix)
    if (exists) continue

    const desc = await describePrefix(prefix)
    if (desc.count === 0) continue

    const ageMs = now - desc.newestMs
    if (ageMs < MIN_AGE_MS) {
      console.log(`  SKIP (too new): pins/${prefix}/ — ${bytesToHuman(desc.bytes)}, newest file ${Math.round(ageMs / 1000 / 60)} min old`)
      continue
    }

    orphans.push({ prefix, ...desc, ageMs })
  }

  if (orphans.length === 0) {
    console.log('No orphans found.')
    return
  }

  const totalBytes = orphans.reduce((sum, o) => sum + o.bytes, 0)
  const totalFiles = orphans.reduce((sum, o) => sum + o.count, 0)

  console.log(`\nOrphans to clean: ${orphans.length} dirs, ${totalFiles} files, ${bytesToHuman(totalBytes)} total`)
  console.log('---')
  // Sort biggest first
  orphans.sort((a, b) => b.bytes - a.bytes)
  for (const o of orphans) {
    const ageDays = (o.ageMs / 1000 / 60 / 60 / 24).toFixed(1)
    console.log(`  pins/${o.prefix}/  ${o.count} files  ${bytesToHuman(o.bytes)}  (newest ${ageDays}d old)`)
  }
  console.log('---')

  if (!APPLY) {
    console.log('Dry-run. Re-run with --apply to actually delete.')
    return
  }

  let okFiles = 0
  let failFiles = 0
  for (const o of orphans) {
    for (const f of o.files) {
      try {
        await f.delete({ ignoreNotFound: true })
        okFiles++
      } catch (err) {
        failFiles++
        console.error(`  ${f.name}: ${err.message}`)
      }
    }
  }
  console.log(`\nDone — deleted ${okFiles} files (${bytesToHuman(totalBytes)}), failed: ${failFiles}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
