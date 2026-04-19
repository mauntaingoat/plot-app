/**
 * Mux Video Cloud Functions
 *
 * Two functions:
 *   1. createMuxAsset  — HTTPS callable invoked by the client after clips
 *      are uploaded to Firebase Storage. Creates a Mux asset from the
 *      storage URLs and returns the asset + upload id for polling.
 *      Mux handles concat + per-clip trim server-side.
 *
 *   2. muxWebhook      — Public HTTPS endpoint registered in the Mux
 *      dashboard. Receives `video.asset.ready` events and writes the
 *      final playback URL into the pin's content array in Firestore.
 *
 * Env vars (set via Firebase Functions config or .env):
 *   MUX_TOKEN_ID      — Mux API token id (public-ish)
 *   MUX_TOKEN_SECRET  — Mux API token secret (sensitive!)
 *   MUX_WEBHOOK_SECRET — optional; Mux signing secret for webhook verification
 *
 * Deploy:
 *   firebase deploy --only functions:createMuxAsset,functions:muxWebhook
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import Mux from '@mux/mux-node'

if (!admin.apps.length) admin.initializeApp()

const MUX_TOKEN_ID     = defineSecret('MUX_TOKEN_ID')
const MUX_TOKEN_SECRET = defineSecret('MUX_TOKEN_SECRET')
const MUX_WEBHOOK_SECRET = defineSecret('MUX_WEBHOOK_SECRET')

/* ─────────── Types ─────────── */

interface ClipInput {
  /** Firebase Storage download URL for the uploaded clip file. */
  url: string
  /** Optional trim start in seconds (source time). */
  startTime?: number
  /** Optional trim end in seconds (source time). */
  endTime?: number
}

interface CreateMuxAssetRequest {
  /** Pin id that will host the rendered video (webhook writes back to this doc). */
  pinId: string
  /** Content item id inside the pin — lets the webhook target a specific item. */
  contentId: string
  /** Ordered clip list. Mux concatenates in order. */
  clips: ClipInput[]
  /** Optional caption text, stored on the content item when the webhook fires. */
  caption?: string
}

interface CreateMuxAssetResult {
  assetId: string
  playbackId: string
  /** Direct .mp4 URL for static playback fallback. Only valid once asset is 'ready'. */
  mp4Url: string
  /** HLS URL for adaptive streaming. */
  hlsUrl: string
}

/* ─────────── createMuxAsset (callable) ─────────── */

export const createMuxAsset = onCall<CreateMuxAssetRequest, Promise<CreateMuxAssetResult>>(
  {
    secrets: [MUX_TOKEN_ID, MUX_TOKEN_SECRET],
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required to publish content.')
    }

    const { pinId, contentId, clips, caption } = request.data

    if (!pinId || !contentId || !Array.isArray(clips) || clips.length === 0) {
      throw new HttpsError('invalid-argument', 'pinId, contentId, and at least one clip are required.')
    }
    if (clips.length > 20) {
      throw new HttpsError('invalid-argument', 'Maximum 20 clips per render.')
    }

    const mux = new Mux({
      tokenId: MUX_TOKEN_ID.value(),
      tokenSecret: MUX_TOKEN_SECRET.value(),
    })

    // Build Mux input array. Each input is one clip; Mux concatenates in
    // order. `start_time` / `end_time` apply server-side trim.
    const inputs = clips.map((clip) => {
      const input: Record<string, unknown> = { url: clip.url }
      if (typeof clip.startTime === 'number' && clip.startTime > 0) {
        input.start_time = clip.startTime
      }
      if (typeof clip.endTime === 'number' && clip.endTime > 0) {
        input.end_time = clip.endTime
      }
      return input
    })

    try {
      const asset = await mux.video.assets.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputs: inputs as any,
        playback_policy: ['public'],
        // Multi-input (concat) isn't supported on basic tier.
        // Use default (plus) for multi-clip, basic for single.
        ...(inputs.length === 1 ? { video_quality: 'basic' } : {}),
        mp4_support: 'capped-1080p',
        passthrough: JSON.stringify({ pinId, contentId, caption: caption ?? '' }),
      })

      const playbackId = asset.playback_ids?.[0]?.id
      if (!playbackId) {
        throw new HttpsError('internal', 'Mux asset created without playback id.')
      }

      logger.info('[mux] asset created', {
        assetId: asset.id,
        playbackId,
        pinId,
        contentId,
        clipCount: clips.length,
      })

      // Stash the pending asset in Firestore immediately so the client can
      // observe state transitions without polling Mux directly.
      await admin.firestore().collection('muxAssets').doc(asset.id).set({
        assetId: asset.id,
        playbackId,
        pinId,
        contentId,
        caption: caption ?? '',
        agentId: request.auth.uid,
        status: 'preparing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return {
        assetId: asset.id,
        playbackId,
        mp4Url: `https://stream.mux.com/${playbackId}/high.mp4`,
        hlsUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('[mux] asset create failed', { error: message, pinId, contentId })
      throw new HttpsError('internal', `Mux rejected the render: ${message}`)
    }
  },
)

/* ─────────── muxWebhook (HTTPS) ─────────── */

interface MuxWebhookEvent {
  type: string
  data: {
    id: string
    status?: string
    playback_ids?: { id: string; policy: string }[]
    passthrough?: string
    errors?: { type: string; messages: string[] }
  }
}

export const muxWebhook = onRequest(
  {
    secrets: [MUX_WEBHOOK_SECRET],
    cors: false,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('method not allowed')
      return
    }

    // TODO: signature verification with mux.webhooks.unwrap() once the
    // webhook secret is registered in the Mux dashboard. For now we trust
    // the passthrough payload (which came from our own callable).
    const event = req.body as MuxWebhookEvent
    if (!event?.type || !event?.data?.id) {
      res.status(400).send('malformed event')
      return
    }

    const assetId = event.data.id
    const docRef = admin.firestore().collection('muxAssets').doc(assetId)

    try {
      if (event.type === 'video.asset.ready') {
        const playbackId = event.data.playback_ids?.[0]?.id
        if (!playbackId) {
          logger.warn('[mux] asset.ready without playback_id', { assetId })
          res.status(200).send('ok')
          return
        }

        const snap = await docRef.get()
        if (!snap.exists) {
          logger.warn('[mux] asset.ready for unknown asset', { assetId })
          res.status(200).send('ok')
          return
        }
        const { pinId, contentId, caption } = snap.data() as {
          pinId: string
          contentId: string
          caption: string
        }

        const mp4Url = `https://stream.mux.com/${playbackId}/high.mp4`
        const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`
        const thumbUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`

        // Update the muxAssets doc → ready
        await docRef.update({
          status: 'ready',
          mp4Url,
          hlsUrl,
          thumbUrl,
          readyAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Patch the content item on the pin doc
        const pinRef = admin.firestore().collection('pins').doc(pinId)
        await admin.firestore().runTransaction(async (tx) => {
          const pinSnap = await tx.get(pinRef)
          if (!pinSnap.exists) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content: any[] = pinSnap.get('content') ?? []
          const idx = content.findIndex((c) => c.id === contentId)
          if (idx === -1) return
          content[idx] = {
            ...content[idx],
            mediaUrl: hlsUrl,
            mp4Url,
            thumbnailUrl: thumbUrl,
            muxPlaybackId: playbackId,
            muxAssetId: assetId,
            caption: content[idx].caption || caption,
            status: 'ready',
          }
          tx.update(pinRef, { content })
        })

        logger.info('[mux] asset ready → pin updated', { assetId, pinId, contentId })
      } else if (event.type === 'video.asset.errored') {
        await docRef.update({
          status: 'errored',
          errors: event.data.errors ?? null,
          erroredAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        logger.error('[mux] asset errored', { assetId, errors: event.data.errors })
      } else {
        logger.debug('[mux] ignoring event', { type: event.type, assetId })
      }

      res.status(200).send('ok')
    } catch (err) {
      logger.error('[mux] webhook handler failed', {
        error: err instanceof Error ? err.message : String(err),
        assetId,
      })
      res.status(500).send('error')
    }
  },
)
