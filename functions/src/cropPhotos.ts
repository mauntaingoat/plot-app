/**
 * cropPhotos Cloud Function — server-side photo cropping.
 *
 * Receives Firebase Storage URLs + a target aspect ratio, crops each
 * photo to the exact pixel dimensions using sharp, uploads the cropped
 * versions back to Storage, and returns the new public URLs.
 *
 * This mirrors how the Mux pipeline crops video clips via FFmpeg —
 * carousels get the same pixel-perfect treatment.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import sharp from 'sharp'

if (!admin.apps.length) admin.initializeApp()

interface CropPhotosRequest {
  urls: string[]
  aspect: string
  pinId: string
  contentId: string
}

interface CropPhotosResult {
  urls: string[]
}

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '1:1':  { w: 1080, h: 1080 },
  '4:3':  { w: 1440, h: 1080 },
  '3:4':  { w: 1080, h: 1440 },
  '4:5':  { w: 1080, h: 1350 },
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function uploadToStorage(localPath: string, storagePath: string): Promise<string> {
  const bucket = admin.storage().bucket()
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType: 'image/jpeg' },
  })
  const file = bucket.file(storagePath)
  await file.makePublic()
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`
}

export const cropPhotos = onCall<CropPhotosRequest, Promise<CropPhotosResult>>(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.')
    }

    const { urls, aspect, pinId, contentId } = request.data

    if (!Array.isArray(urls) || urls.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one photo URL is required.')
    }
    if (urls.length > 20) {
      throw new HttpsError('invalid-argument', 'Maximum 20 photos per carousel.')
    }

    const dims = ASPECT_DIMS[aspect]
    if (!dims) {
      throw new HttpsError('invalid-argument', `Unsupported aspect ratio: ${aspect}`)
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reelst-crop-'))
    const croppedUrls: string[] = []

    try {
      for (let i = 0; i < urls.length; i++) {
        const buffer = await downloadBuffer(urls[i])
        const outputPath = path.join(tmpDir, `cropped_${i}.jpg`)

        await sharp(buffer)
          .resize(dims.w, dims.h, {
            fit: 'cover',
            position: 'centre',
          })
          .jpeg({ quality: 90, mozjpeg: true })
          .toFile(outputPath)

        const storagePath = `pins/${pinId}/media/${contentId}-cropped-${i}-${Date.now()}.jpg`
        const url = await uploadToStorage(outputPath, storagePath)
        croppedUrls.push(url)

        logger.info(`[cropPhotos] cropped photo ${i}`, { aspect, dims, storagePath })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('[cropPhotos] failed', { error: message })
      throw new HttpsError('internal', `Photo cropping failed: ${message}`)
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true }) } catch { /* noop */ }
    }

    return { urls: croppedUrls }
  },
)
