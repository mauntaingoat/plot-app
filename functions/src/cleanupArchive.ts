/**
 * Cloud Function: 7-day cleanup of archived pins and content
 *
 * Soft-archived pins (`status === 'archived'`) and content items
 * (`archivedAt` set) linger for 7 days so the agent can change their
 * mind. After the grace period this scheduled job tears down the
 * underlying assets:
 *   - Mux video assets (per content item with a muxAssetId)
 *   - Firebase Storage files (entire `pins/{pinId}/` prefix per pin)
 * …and then hard-deletes the Firestore doc.
 *
 * Runs daily at 03:00 UTC. Each invocation processes up to BATCH_LIMIT
 * pins and BATCH_LIMIT content items so a backlog can't blow past the
 * function's timeout. Items that aren't reached this run are picked up
 * tomorrow.
 *
 * Deploy:
 *   firebase deploy --only functions:cleanupArchivedAssets
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import Mux from '@mux/mux-node'

if (!admin.apps.length) admin.initializeApp()

const MUX_TOKEN_ID = defineSecret('MUX_TOKEN_ID')
const MUX_TOKEN_SECRET = defineSecret('MUX_TOKEN_SECRET')

const GRACE_DAYS = 7
const BATCH_LIMIT = 200

interface MinimalContentItem {
  id?: string
  muxAssetId?: string
  // Storage URL fields — gathered for file-level cleanup when a
  // standalone content doc archives. These URLs are Firebase Storage
  // download URLs (https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&token=...).
  mediaUrl?: string
  mediaUrls?: string[]
  sourceUrl?: string
  sourceUrls?: string[]
  thumbnailUrl?: string
}

/** Extract the Storage object path from a Firebase Storage download
 *  URL. Returns null for anything that doesn't look like a Storage
 *  URL (e.g., Mux playback URLs, external CDN links). Format:
 *    https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{ENCODED_PATH}?alt=media&token=...
 *  The path is URL-encoded after `/o/` and before `?` — so `pins/XYZ/photo.jpg`
 *  appears as `pins%2FXYZ%2Fphoto.jpg`. */
function storagePathFromUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null
  if (!url.includes('firebasestorage.googleapis.com')) return null
  const match = url.match(/\/o\/([^?]+)/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

/** Walk a content item's URL fields and return every unique Storage
 *  path it references. Lets the cleanup function surgically remove
 *  just the files for this one content item without touching the
 *  rest of the pin's prefix. */
function collectStoragePaths(item: MinimalContentItem): string[] {
  const paths = new Set<string>()
  const add = (u: string | undefined | null) => {
    const p = storagePathFromUrl(u)
    if (p) paths.add(p)
  }
  add(item.mediaUrl)
  add(item.sourceUrl)
  add(item.thumbnailUrl)
  for (const u of item.mediaUrls || []) add(u)
  for (const u of item.sourceUrls || []) add(u)
  return [...paths]
}

interface MinimalPinDoc {
  agentId?: string
  status?: string
  archivedAt?: admin.firestore.Timestamp | null
  content?: MinimalContentItem[]
}

export const cleanupArchivedAssets = onSchedule(
  {
    schedule: '0 3 * * *', // daily at 03:00 UTC
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 540,
    secrets: [MUX_TOKEN_ID, MUX_TOKEN_SECRET],
  },
  async () => {
    const db = admin.firestore()
    const storage = admin.storage()
    const bucket = storage.bucket()
    const cutoffMs = Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000
    const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs)

    const mux = new Mux({
      tokenId: MUX_TOKEN_ID.value(),
      tokenSecret: MUX_TOKEN_SECRET.value(),
    })

    let pinsDeleted = 0
    let contentDeleted = 0
    let muxAssetsDeleted = 0
    let storageFilesDeleted = 0
    const errors: string[] = []

    // ── 1. Pins: status === 'archived' AND archivedAt <= cutoff ──
    const pinsSnap = await db
      .collection('pins')
      .where('status', '==', 'archived')
      .where('archivedAt', '<=', cutoff)
      .limit(BATCH_LIMIT)
      .get()

    for (const pinDocSnap of pinsSnap.docs) {
      const pinId = pinDocSnap.id
      const pin = pinDocSnap.data() as MinimalPinDoc

      // Mux: delete every video asset referenced by this pin's content array.
      const muxIds = (pin.content || [])
        .map((c) => c.muxAssetId)
        .filter((id): id is string => Boolean(id))
      for (const assetId of muxIds) {
        try {
          await mux.video.assets.delete(assetId)
          muxAssetsDeleted++
        } catch (err: any) {
          // 404 = already gone; safe to ignore.
          if (err?.status !== 404) {
            errors.push(`pin ${pinId} mux asset ${assetId}: ${err?.message || err}`)
          }
        }
      }

      // Storage: every file under pins/{pinId}/ (covers media/, thumbnails, etc.)
      try {
        const [files] = await bucket.getFiles({ prefix: `pins/${pinId}/` })
        for (const file of files) {
          try {
            await file.delete({ ignoreNotFound: true })
            storageFilesDeleted++
          } catch (err: any) {
            errors.push(`pin ${pinId} storage ${file.name}: ${err?.message || err}`)
          }
        }
      } catch (err: any) {
        errors.push(`pin ${pinId} storage list: ${err?.message || err}`)
      }

      // Hard-delete the doc last, after assets are gone.
      try {
        await pinDocSnap.ref.delete()
        pinsDeleted++
      } catch (err: any) {
        errors.push(`pin ${pinId} doc delete: ${err?.message || err}`)
      }
    }

    // ── 2. Content (standalone collection): archivedAt <= cutoff ──
    const contentSnap = await db
      .collection('content')
      .where('archivedAt', '<=', cutoff)
      .limit(BATCH_LIMIT)
      .get()

    for (const cDocSnap of contentSnap.docs) {
      const contentId = cDocSnap.id
      const content = cDocSnap.data() as MinimalContentItem & { pinId?: string | null }

      if (content.muxAssetId) {
        try {
          await mux.video.assets.delete(content.muxAssetId)
          muxAssetsDeleted++
        } catch (err: any) {
          if (err?.status !== 404) {
            errors.push(`content ${contentId} mux asset ${content.muxAssetId}: ${err?.message || err}`)
          }
        }
      }

      // File-level Storage cleanup. The content doc references specific
      // files under `pins/{originalPinId}/` (or `pins/unlinked-{ts}/`
      // for never-attached standalone content). We can't sweep the
      // whole folder — sibling files belong to the still-live parent
      // pin or other content items — but we CAN delete just the URLs
      // this content doc owned. Without this surgical cleanup, files
      // orphan in Storage until their parent pin is eventually
      // archived (or forever, if it stays active).
      for (const path of collectStoragePaths(content)) {
        try {
          await bucket.file(path).delete({ ignoreNotFound: true })
          storageFilesDeleted++
        } catch (err: any) {
          errors.push(`content ${contentId} storage ${path}: ${err?.message || err}`)
        }
      }

      try {
        await cDocSnap.ref.delete()
        contentDeleted++
      } catch (err: any) {
        errors.push(`content ${contentId} doc delete: ${err?.message || err}`)
      }
    }

    logger.info('cleanupArchivedAssets done', {
      pinsDeleted,
      contentDeleted,
      muxAssetsDeleted,
      storageFilesDeleted,
      errorCount: errors.length,
      pinsConsidered: pinsSnap.size,
      contentConsidered: contentSnap.size,
      cutoffISO: new Date(cutoffMs).toISOString(),
    })
    if (errors.length > 0) {
      logger.warn('cleanupArchivedAssets errors', { errors: errors.slice(0, 50) })
    }
  },
)
