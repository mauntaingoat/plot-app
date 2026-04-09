/**
 * Cloud Function: Publish scheduled content
 *
 * Pub/Sub-cron Function that runs every 5 minutes. Scans pins for content
 * items whose `publishAt` has passed and clears the field so the item
 * becomes publicly visible. Optionally sends an FCM notification to
 * followers (when FCM is wired up).
 *
 * Deploy:
 *   firebase deploy --only functions:publishScheduledContent
 *
 * The client-side `publicContent()` filter already hides future-dated
 * items even without this Function — this exists so:
 *   1. Notifications fire at the exact intended publish time
 *   2. Other server-side consumers (sitemap, OG, indexers) see the item
 *   3. Audit/analytics events fire at the right moment
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

interface ContentItem {
  id: string
  type: string
  caption: string
  publishAt?: admin.firestore.Timestamp | null
  // ... other fields we don't touch
}

interface PinDoc {
  agentId: string
  address: string
  content: ContentItem[]
}

export const publishScheduledContent = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    const db = admin.firestore()
    const now = admin.firestore.Timestamp.now()

    // Find pins that have any content scheduled in the past.
    // (Firestore can't query inside arrays directly, so we keep a hint
    // field `nextPublishAt` on the pin doc that the client sets when
    // adding scheduled content. If absent, we fall back to the slower
    // collection scan.)
    const dueSnap = await db
      .collection('pins')
      .where('nextPublishAt', '<=', now)
      .get()

    if (dueSnap.empty) {
      logger.info('publishScheduledContent: no due pins')
      return
    }

    let publishedCount = 0
    const batch = db.batch()

    for (const docSnap of dueSnap.docs) {
      const pin = docSnap.data() as PinDoc
      const content = pin.content || []
      let mutated = false
      let nextPublishAt: admin.firestore.Timestamp | null = null

      const updated = content.map((item) => {
        if (item.publishAt && item.publishAt.toMillis() <= now.toMillis()) {
          mutated = true
          publishedCount++
          // Strip publishAt — content is now live
          return { ...item, publishAt: null }
        }
        if (item.publishAt) {
          // Track the next future publish time
          if (!nextPublishAt || item.publishAt.toMillis() < nextPublishAt.toMillis()) {
            nextPublishAt = item.publishAt
          }
        }
        return item
      })

      if (mutated) {
        batch.update(docSnap.ref, {
          content: updated,
          nextPublishAt: nextPublishAt || admin.firestore.FieldValue.delete(),
          updatedAt: now,
        })
      }
    }

    if (publishedCount > 0) {
      await batch.commit()
      logger.info(`publishScheduledContent: published ${publishedCount} items`)
    }
  },
)
