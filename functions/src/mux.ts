/**
 * Mux Video Cloud Functions — fully server-side processing.
 *
 * createMuxAsset: receives raw clip Storage URLs + processing instructions.
 * If any clip needs preprocessing (photo→video, trim, speed), runs native
 * FFmpeg server-side, uploads the result to Storage, then hands clean URLs
 * to Mux. No browser-side ffmpeg.wasm needed.
 *
 * muxWebhook: receives Mux asset.ready events and patches the pin's
 * content array with final playback URLs.
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import Mux from '@mux/mux-node'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path

if (!admin.apps.length) admin.initializeApp()

const MUX_TOKEN_ID = defineSecret('MUX_TOKEN_ID')
const MUX_TOKEN_SECRET = defineSecret('MUX_TOKEN_SECRET')
const MUX_WEBHOOK_SECRET = defineSecret('MUX_WEBHOOK_SECRET')

/* ─────────── Types ─────────── */

interface ClipInput {
  url: string
  /** 'video' or 'photo' — photos get converted to short video clips. */
  type?: string
  /** Trim start in seconds. */
  startTime?: number
  /** Trim end in seconds. */
  endTime?: number
  /** Photo display duration in seconds (default 3). */
  photoDuration?: number
  /** Playback speed multiplier (default 1). */
  speed?: number
}

interface CreateMuxAssetRequest {
  pinId: string
  contentId: string
  clips: ClipInput[]
  caption?: string
}

interface CreateMuxAssetResult {
  assetId: string
  playbackId: string
  mp4Url: string
  hlsUrl: string
}

/* ─────────── Helpers ─────────── */

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
}

async function uploadToStorage(localPath: string, storagePath: string): Promise<string> {
  const bucket = admin.storage().bucket()
  await bucket.upload(localPath, { destination: storagePath })
  const file = bucket.file(storagePath)
  await file.makePublic()
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`
}

function needsPreprocess(clip: ClipInput): boolean {
  if (clip.type === 'photo') return true
  if (clip.startTime && clip.startTime > 0.05) return true
  if (clip.speed && clip.speed !== 1) return true
  return false
}

async function preprocessClip(clip: ClipInput, idx: number, tmpDir: string): Promise<string> {
  const isPhoto = clip.type === 'photo'
  const ext = isPhoto ? 'png' : 'mp4'
  const inputPath = path.join(tmpDir, `input_${idx}.${ext}`)
  const outputPath = path.join(tmpDir, `output_${idx}.mp4`)

  await downloadFile(clip.url, inputPath)

  const args: string[] = []

  if (isPhoto) {
    const duration = clip.photoDuration || 3
    args.push(
      '-loop', '1',
      '-i', inputPath,
      '-t', String(duration),
      '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
      '-r', '30',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      outputPath,
    )
  } else {
    // Video with trim and/or speed
    if (clip.startTime && clip.startTime > 0) {
      args.push('-ss', String(clip.startTime))
    }
    args.push('-i', inputPath)
    if (clip.endTime && clip.startTime) {
      args.push('-t', String(clip.endTime - clip.startTime))
    } else if (clip.endTime) {
      args.push('-t', String(clip.endTime))
    }

    const filters: string[] = []
    if (clip.speed && clip.speed !== 1) {
      filters.push(`setpts=${(1 / clip.speed).toFixed(4)}*PTS`)
    }

    if (filters.length > 0) {
      args.push('-vf', filters.join(','))
      args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart')
    } else {
      args.push('-c', 'copy', '-movflags', '+faststart')
    }
    args.push('-an', outputPath)
  }

  await execFileAsync(ffmpegPath, args, { timeout: 120_000 })

  // Clean up input
  try { fs.unlinkSync(inputPath) } catch { /* noop */ }

  return outputPath
}

/* ─────────── createMuxAsset (callable) ─────────── */

export const createMuxAsset = onCall<CreateMuxAssetRequest, Promise<CreateMuxAssetResult>>(
  {
    secrets: [MUX_TOKEN_ID, MUX_TOKEN_SECRET],
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 300,
    memory: '1GiB',
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

    // Preprocess clips that need it (photos, trimmed, speed-adjusted).
    // Upload preprocessed results to Storage and use those URLs for Mux.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reelst-'))
    const muxInputs: { url: string }[] = []

    try {
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]
        if (needsPreprocess(clip)) {
          logger.info(`[mux] preprocessing clip ${i}`, { type: clip.type, trim: !!clip.startTime })
          const localPath = await preprocessClip(clip, i, tmpDir)
          const storagePath = `pins/${pinId}/media/${contentId}-processed-${i}-${Date.now()}.mp4`
          const url = await uploadToStorage(localPath, storagePath)
          try { fs.unlinkSync(localPath) } catch { /* noop */ }
          muxInputs.push({ url })
        } else {
          muxInputs.push({ url: clip.url })
        }
      }
    } catch (err) {
      // Clean up tmp dir on error
      try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* noop */ }
      const message = err instanceof Error ? err.message : String(err)
      logger.error('[mux] preprocessing failed', { error: message })
      throw new HttpsError('internal', `Video processing failed: ${message}`)
    }

    // Clean up tmp dir
    try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* noop */ }

    try {
      const asset = await mux.video.assets.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputs: muxInputs as any,
        playback_policy: ['public'],
        ...(muxInputs.length === 1 ? { video_quality: 'basic' } : {}),
        mp4_support: 'capped-1080p',
        passthrough: JSON.stringify({ pinId, contentId, caption: caption ?? '' }),
      })

      const playbackId = asset.playback_ids?.[0]?.id
      if (!playbackId) {
        throw new HttpsError('internal', 'Mux asset created without playback id.')
      }

      logger.info('[mux] asset created', {
        assetId: asset.id, playbackId, pinId, contentId,
        clipCount: clips.length, preprocessed: clips.filter(needsPreprocess).length,
      })

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

        await docRef.update({
          status: 'ready',
          mp4Url, hlsUrl, thumbUrl,
          readyAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        const pinRef = admin.firestore().collection('pins').doc(pinId)
        await admin.firestore().runTransaction(async (tx) => {
          const pinSnap = await tx.get(pinRef)
          if (!pinSnap.exists) return
          const content: any[] = pinSnap.get('content') ?? []
          const idx = content.findIndex((c) => c.id === contentId)
          if (idx === -1) return
          content[idx] = {
            ...content[idx],
            mediaUrl: mp4Url,
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
