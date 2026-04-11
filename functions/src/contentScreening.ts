/**
 * Content screening Cloud Function.
 *
 * Triggers when a pin is created or updated. Checks if any content
 * items contain flagged material using Google Cloud Vision API
 * (SafeSearch detection). If flagged, auto-creates a report and
 * optionally disables the pin.
 *
 * Requires:
 *   - Cloud Vision API enabled on the project
 *   - IAM: Cloud Functions service agent needs Vision API access
 *
 * Deploy: firebase deploy --only functions:onPinContentChange
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

// SafeSearch likelihood levels that trigger a flag
const FLAG_THRESHOLD = ['LIKELY', 'VERY_LIKELY']

export const onPinContentChange = onDocumentWritten(
  { document: 'pins/{pinId}', region: 'us-central1' },
  async (event) => {
    const after = event.data?.after?.data()
    if (!after?.content || !Array.isArray(after.content)) return

    const db = admin.firestore()
    const pinId = event.params.pinId

    // Only check content items that have image/thumbnail URLs
    const imageUrls: string[] = after.content
      .map((c: any) => c.thumbnailUrl || c.mediaUrl)
      .filter((url: string) => url && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')))

    if (imageUrls.length === 0) return

    try {
      // Dynamic import — Vision API may not be available in all environments
      // @ts-ignore — Vision API is optional, installed separately when needed
      const vision = await import('@google-cloud/vision').catch(() => null)
      if (!vision) {
        logger.info('contentScreening: @google-cloud/vision not installed, skipping')
        return
      }

      const client = new vision.ImageAnnotatorClient()
      let flagged = false
      let flagReason = ''

      for (const url of imageUrls.slice(0, 5)) { // check max 5 images
        try {
          const [result] = await client.safeSearchDetection(url)
          const safe = result.safeSearchAnnotation
          if (!safe) continue

          if (FLAG_THRESHOLD.includes(safe.adult || '') ||
              FLAG_THRESHOLD.includes(safe.violence || '') ||
              FLAG_THRESHOLD.includes(safe.racy || '')) {
            flagged = true
            flagReason = `SafeSearch: adult=${safe.adult}, violence=${safe.violence}, racy=${safe.racy}`
            break
          }
        } catch (e) {
          logger.warn(`contentScreening: failed to check ${url}`, e)
        }
      }

      if (flagged) {
        // Auto-create a system report
        await db.collection('reports').add({
          reporterUid: 'system',
          targetType: 'pin',
          targetId: pinId,
          targetOwnerId: after.agentId || '',
          reason: 'inappropriate',
          detail: `Auto-flagged by content screening. ${flagReason}`,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Optionally disable the pin
        await db.collection('pins').doc(pinId).update({ enabled: false })

        logger.warn(`contentScreening: pin ${pinId} flagged and disabled. ${flagReason}`)
      }
    } catch (e) {
      logger.error('contentScreening: error', e)
    }
  },
)
