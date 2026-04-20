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
  /** Target aspect ratio (e.g. '9:16', '1:1', '4:5', '16:9'). Applied
   *  as an FFmpeg scale+crop on each clip during preprocessing. */
  aspect?: string
}

interface CreateMuxAssetResult {
  assetId: string
  playbackId: string
  mp4Url: string
  hlsUrl: string
  processedUrl: string
  thumbnailUrl: string
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

// Aspect ratio → FFmpeg scale+crop dimensions
const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 720, h: 1280 },
  '16:9': { w: 1280, h: 720 },
  '1:1':  { w: 720, h: 720 },
  '4:3':  { w: 960, h: 720 },
  '3:4':  { w: 720, h: 960 },
  '4:5':  { w: 720, h: 900 },
}

function needsPreprocess(clip: ClipInput, aspect?: string): boolean {
  if (clip.type === 'photo') return true
  if (clip.startTime && clip.startTime > 0.05) return true
  if (clip.speed && clip.speed !== 1) return true
  // Non-default aspect requires re-encode with crop
  if (aspect && aspect !== '9:16' && aspect !== 'original') return true
  return false
}

async function preprocessClip(clip: ClipInput, idx: number, tmpDir: string, aspect?: string): Promise<string> {
  const isPhoto = clip.type === 'photo'
  const ext = isPhoto ? 'png' : 'mp4'
  const inputPath = path.join(tmpDir, `input_${idx}.${ext}`)
  const outputPath = path.join(tmpDir, `output_${idx}.mp4`)

  await downloadFile(clip.url, inputPath)

  const dims = aspect && ASPECT_DIMS[aspect] ? ASPECT_DIMS[aspect] : ASPECT_DIMS['9:16']
  const scaleFilter = `scale=${dims.w}:${dims.h}:force_original_aspect_ratio=increase,crop=${dims.w}:${dims.h}`

  const args: string[] = []

  if (isPhoto) {
    const duration = clip.photoDuration || 3
    args.push(
      '-loop', '1',
      '-i', inputPath,
      '-t', String(duration),
      '-vf', scaleFilter,
      '-r', '30',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      outputPath,
    )
  } else {
    if (clip.startTime && clip.startTime > 0) {
      args.push('-ss', String(clip.startTime))
    }
    args.push('-i', inputPath)
    if (clip.endTime && clip.startTime) {
      args.push('-t', String(clip.endTime - clip.startTime))
    } else if (clip.endTime) {
      args.push('-t', String(clip.endTime))
    }

    const filters: string[] = [scaleFilter]
    if (clip.speed && clip.speed !== 1) {
      filters.push(`setpts=${(1 / clip.speed).toFixed(4)}*PTS`)
    }

    // Always re-encode — ensures uniform codec/resolution/framerate
    // across all clips so concat is seamless (no pauses at boundaries).
    args.push('-vf', filters.join(','))
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
      '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart')
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

    const { pinId, contentId, clips, caption, aspect } = request.data

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

    // Process clips server-side. Mux only accepts ONE video input URL
    // from external sources — multi-input concat doesn't work with
    // Firebase Storage URLs. So for multi-clip reels, we concat
    // locally via FFmpeg and send a single baked file to Mux.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reelst-'))
    let finalUrl = clips[0].url // default for single untouched clip
    let thumbnailUrl = ''

    try {
      // When multiple clips exist OR a non-default aspect is set, ALL clips
      // get re-encoded to uniform codec/resolution/framerate. This ensures:
      // 1. Seamless transitions (no pause/glitch at clip boundaries)
      // 2. Correct aspect ratio crop on every clip
      const forcePreprocess = clips.length > 1 || (aspect && aspect !== '9:16' && aspect !== 'original')

      if (clips.length === 1 && !forcePreprocess && !needsPreprocess(clips[0], aspect)) {
        logger.info('[mux] single clip, no preprocessing')
      } else {
        const segments: string[] = []
        for (let i = 0; i < clips.length; i++) {
          const clip = clips[i]
          // Every clip gets preprocessed when forcePreprocess is true
          logger.info(`[mux] preprocessing clip ${i}`, { type: clip.type, aspect, forced: !!forcePreprocess })
          segments.push(await preprocessClip(clip, i, tmpDir, aspect))
        }

        let outputPath: string
        if (segments.length === 1) {
          outputPath = segments[0]
        } else {
          const listPath = path.join(tmpDir, 'concat.txt')
          fs.writeFileSync(listPath, segments.map((s) => `file '${s}'`).join('\n'))
          outputPath = path.join(tmpDir, 'concat_out.mp4')
          // Re-encode the concat to guarantee seamless playback
          // (no pause/glitch at clip boundaries from keyframe misalignment)
          await execFileAsync(ffmpegPath, [
            '-f', 'concat', '-safe', '0', '-i', listPath,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
            '-pix_fmt', 'yuv420p', '-r', '30',
            '-movflags', '+faststart',
            '-an', outputPath,
          ], { timeout: 180_000 })
          logger.info(`[mux] concat ${segments.length} segments → ${outputPath}`)
        }

        // Upload the single processed file to Storage
        const storagePath = `pins/${pinId}/media/${contentId}-final-${Date.now()}.mp4`
        finalUrl = await uploadToStorage(outputPath, storagePath)
        logger.info('[mux] processed file uploaded', { storagePath })

        // Generate a thumbnail from the first frame
        const thumbPath = path.join(tmpDir, 'thumb.jpg')
        try {
          await execFileAsync(ffmpegPath, [
            '-i', outputPath, '-vframes', '1', '-q:v', '3',
            '-vf', 'scale=480:-2', thumbPath,
          ], { timeout: 15_000 })
          const thumbStoragePath = `pins/${pinId}/media/${contentId}-thumb-${Date.now()}.jpg`
          thumbnailUrl = await uploadToStorage(thumbPath, thumbStoragePath)
        } catch { /* thumbnail is optional */ }
      }
    } catch (err) {
      try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* noop */ }
      const message = err instanceof Error ? err.message : String(err)
      logger.error('[mux] preprocessing failed', { error: message })
      throw new HttpsError('internal', `Video processing failed: ${message}`)
    }

    try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* noop */ }

    // Send ONE URL to Mux — always single input, always basic tier.
    try {
      const asset = await mux.video.assets.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputs: [{ url: finalUrl }] as any,
        playback_policy: ['public'],
        video_quality: 'basic',
        mp4_support: 'capped-1080p',
        passthrough: JSON.stringify({ pinId, contentId, caption: caption ?? '' }),
      })

      const playbackId = asset.playback_ids?.[0]?.id
      if (!playbackId) {
        throw new HttpsError('internal', 'Mux asset created without playback id.')
      }

      logger.info('[mux] asset created', {
        assetId: asset.id, playbackId, pinId, contentId,
        clipCount: clips.length, preprocessed: clips.filter((c) => needsPreprocess(c, aspect)).length,
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
        mp4Url: `https://stream.mux.com/${playbackId}/capped-1080p.mp4`,
        hlsUrl: `https://stream.mux.com/${playbackId}.m3u8`,
        processedUrl: finalUrl,
        thumbnailUrl,
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

        const mp4Url = `https://stream.mux.com/${playbackId}/capped-1080p.mp4`
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
            hlsUrl,
            thumbnailUrl: thumbUrl,
            muxPlaybackId: playbackId,
            muxAssetId: assetId,
            caption: content[idx].caption || caption,
            status: 'ready',
          }
          tx.update(pinRef, { content })
        })

        // Also patch the standalone content doc (if it exists).
        const contentRef = admin.firestore().collection('content').doc(contentId)
        const contentSnap = await contentRef.get()
        if (contentSnap.exists) {
          await contentRef.update({
            mediaUrl: mp4Url,
            mp4Url,
            hlsUrl,
            thumbnailUrl: thumbUrl,
            muxPlaybackId: playbackId,
            muxAssetId: assetId,
            status: 'ready',
          })
        }

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
