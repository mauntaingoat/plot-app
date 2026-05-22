/**
 * proxyImage8bpc — re-encodes Storage pin media to 8-bpc JPG for iOS.
 *
 * Background: Reelst's server-side photo cropping (cropPhotos) produces
 * JPGs that — for some inputs — end up as 16-bits-per-channel (48-bpp)
 * color depth. Apple's iOS ImageIO has a documented bug (Radar
 * 143602439) that fails to decode these:
 *
 *   [ImageIO] extractDecodeOptions_block_invoke:1325: ERROR:
 *   kCGImageBlockFormatBGRx8 is called for 48-bpp (16-bpc) image
 *
 * The web is unaffected (Chrome's decoder handles them). To unblock
 * the iOS Reelst app without modifying the cropPhotos pipeline, this
 * function transparently proxies pin-media URLs through a sharp
 * re-encode that guarantees standard 8-bpc output.
 *
 * Caching:
 *  - Originals at  pins/<id>/media/<file>
 *  - 8-bpc cached at  pins/<id>/media-8bpc/<file> (same name)
 *  - First request: fetch original → re-encode → save to cache → stream
 *  - Subsequent: stream straight from cache (sub-100ms)
 *  - Client Cache-Control: 30 days immutable so iOS only fetches each
 *    image once per device
 *
 * Security: only paths starting with `pins/` are accepted — matches
 * the storage.rules public-read scope.
 *
 * Usage:
 *   GET https://<region>-<project>.cloudfunctions.net/proxyImage8bpc?path=pins/<id>/media/<file>
 */
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import sharp from 'sharp'

if (admin.apps.length === 0) admin.initializeApp()

const CACHE_CONTROL = 'public, max-age=2592000, immutable'

export const proxyImage8bpc = onRequest(
  { cors: true, region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    const path = (req.query.path as string | undefined)?.trim()
    if (!path || !path.startsWith('pins/') || path.includes('..')) {
      res.status(400).send('Invalid path')
      return
    }

    const bucket = admin.storage().bucket()
    // Cache path: insert -8bpc segment in place of /media/
    const cachePath = path.replace('/media/', '/media-8bpc/')

    if (cachePath === path) {
      res.status(400).send('Unsupported path shape — must contain /media/')
      return
    }

    const cacheFile = bucket.file(cachePath)

    try {
      const [cacheExists] = await cacheFile.exists()

      if (!cacheExists) {
        const originalFile = bucket.file(path)
        const [originalExists] = await originalFile.exists()
        if (!originalExists) {
          res.status(404).send('Original not found')
          return
        }
        const [originalBytes] = await originalFile.download()
        // toColorspace('srgb') forces 8-bpc sRGB output regardless of
        // the input's bit depth. mozjpeg gives ~10-15% better
        // compression than libjpeg at the same quality.
        const reencoded = await sharp(originalBytes)
          .toColorspace('srgb')
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer()
        await cacheFile.save(reencoded, {
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: CACHE_CONTROL,
          },
        })
        logger.info('proxyImage8bpc cached', { path, bytes: reencoded.length })
      }

      res.set('Cache-Control', CACHE_CONTROL)
      res.set('Content-Type', 'image/jpeg')
      cacheFile.createReadStream().pipe(res)
    } catch (e) {
      logger.error('proxyImage8bpc failed', { path, error: (e as Error).message })
      res.status(500).send('Proxy failed')
    }
  },
)
