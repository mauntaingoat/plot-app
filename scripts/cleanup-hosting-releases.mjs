#!/usr/bin/env node
/**
 * cleanup-hosting-releases.mjs
 *
 * Firebase Hosting keeps every deployed version forever by default —
 * each `firebase deploy --only hosting` adds another ~1GB snapshot of
 * the dist/ output (Mapbox GL, Three.js, FFmpeg WASM, etc. are heavy).
 * That's why Storage shows 18GB+ and growing on a project with one
 * active user. This script trims old versions via the Hosting REST
 * API, keeping the last N most-recent finalized versions.
 *
 * Usage:
 *   node scripts/cleanup-hosting-releases.mjs            # dry-run, keeps 5 newest
 *   node scripts/cleanup-hosting-releases.mjs --apply    # actually deletes
 *   node scripts/cleanup-hosting-releases.mjs --keep=10  # keep 10 newest
 *
 * Auth: requires `gcloud` CLI installed and authenticated against the
 *   plot-fe990 project. Uses `gcloud auth print-access-token`.
 *
 * Safety:
 *   - Never deletes the currently-released version.
 *   - Dry-run by default; --apply required to actually delete.
 *   - Sorts versions by createTime descending; keeps the newest N.
 */

import { execSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const SITE_ID = 'plot-fe990'

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    keep: { type: 'string', default: '5' },
  },
})
const APPLY = values.apply
const KEEP = parseInt(values.keep, 10)
if (!Number.isFinite(KEEP) || KEEP < 1) {
  console.error('--keep must be a positive integer')
  process.exit(1)
}

function getToken() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim()
  } catch (err) {
    console.error('Could not get gcloud access token. Run: gcloud auth login')
    process.exit(1)
  }
}

async function api(token, path, init = {}) {
  const url = path.startsWith('http')
    ? path
    : `https://firebasehosting.googleapis.com/v1beta1${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Required when authing with a user-cred access token (no quota
      // project baked in). Without this, Google's API gateway returns
      // 403 SERVICE_DISABLED against the dummy project 32555940559.
      'X-Goog-User-Project': SITE_ID,
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${path}\n${body}`)
  }
  return res.json()
}

async function listAllVersions(token) {
  const out = []
  let pageToken
  do {
    const qs = new URLSearchParams({ pageSize: '100' })
    if (pageToken) qs.set('pageToken', pageToken)
    const data = await api(token, `/sites/${SITE_ID}/versions?${qs}`)
    if (data.versions) out.push(...data.versions)
    pageToken = data.nextPageToken
  } while (pageToken)
  return out
}

async function getCurrentReleaseVersionName(token) {
  // The most recent /releases entry points at the currently-served version.
  const data = await api(token, `/sites/${SITE_ID}/releases?pageSize=1`)
  return data.releases?.[0]?.version?.name ?? null
}

function bytesToHuman(b) {
  const n = Number(b)
  if (!Number.isFinite(n) || n === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

async function main() {
  console.log(`Hosting cleanup — site: ${SITE_ID}, keep: ${KEEP}, mode: ${APPLY ? 'APPLY' : 'dry-run'}`)
  const token = getToken()

  const [allVersions, currentName] = await Promise.all([
    listAllVersions(token),
    getCurrentReleaseVersionName(token),
  ])
  if (currentName) {
    console.log(`Current live version: ${currentName.split('/').pop()}`)
  }

  // Only consider finalized versions (status: FINALIZED). Anything
  // CREATED/EXPIRED/ABANDONED is not a live release.
  const finalized = allVersions.filter((v) => v.status === 'FINALIZED')

  // Sort by createTime desc — newest first
  finalized.sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''))

  console.log(`Found ${finalized.length} finalized versions (out of ${allVersions.length} total).`)

  const toKeep = new Set(finalized.slice(0, KEEP).map((v) => v.name))
  if (currentName) toKeep.add(currentName)
  const toDelete = finalized.filter((v) => !toKeep.has(v.name))

  if (toDelete.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  let totalBytes = 0
  for (const v of toDelete) {
    totalBytes += Number(v.versionBytes || 0)
  }
  console.log(`Will delete ${toDelete.length} version(s), ~${bytesToHuman(totalBytes)} freed.`)
  console.log('---')
  for (const v of toDelete) {
    const shortId = v.name.split('/').pop()
    const when = v.createTime?.slice(0, 19).replace('T', ' ') || '?'
    console.log(`  ${shortId}  ${when}  ${bytesToHuman(v.versionBytes || 0)}`)
  }
  console.log('---')

  if (!APPLY) {
    console.log('Dry-run. Re-run with --apply to actually delete.')
    return
  }

  let ok = 0
  let fail = 0
  for (const v of toDelete) {
    try {
      await api(token, `/${v.name}`, { method: 'DELETE' })
      ok++
      process.stdout.write('.')
    } catch (err) {
      fail++
      console.error(`\n  ${v.name}: ${err.message?.split('\n')[0]}`)
    }
  }
  console.log(`\nDone — deleted: ${ok}, failed: ${fail}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
