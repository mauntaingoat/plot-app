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

      // Standalone content's storage objects sit under pins/{pinId}/ if
      // it was ever attached. We can't safely sweep that whole prefix
      // (other content items still live there), so we trust Mux as the
      // primary asset store and leave Storage cleanup to the pin-level
      // sweep above. Standalone-unlinked content's source files are
      // already in Mux's "delete asset" path.

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
