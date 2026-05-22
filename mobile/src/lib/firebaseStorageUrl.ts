/**
 * Resolve any pin-media URL to a properly tokenized Firebase Storage
 * download URL.
 *
 * Why this exists:
 *  - Some pin URLs are direct GCS URLs (server-side admin SDK writes):
 *      https://storage.googleapis.com/<bucket>/pins/.../media/....jpg
 *    iOS URLSession is unreliable with these (TCP drops, HTTP/2
 *    multiplexing issues — "cannot parse response" / "network
 *    connection lost").
 *  - Some are Firebase wrapper URLs WITH a download token, which
 *    work reliably:
 *      https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>?alt=media&token=<token>
 *  - The Firebase wrapper format WITHOUT a token returns 403 even
 *    for files where rules permit public read — Firebase requires
 *    either the token OR auth context.
 *
 * @react-native-firebase/storage's getDownloadURL() always returns
 * the tokenized wrapper URL — exactly what iOS needs. We cache the
 * result in module-level memo so repeated calls for the same URL
 * don't re-fetch.
 */
import storage from '@react-native-firebase/storage'

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

/**
 * Cloud Function URL that re-encodes 16-bpc JPGs from cropPhotos
 * to standard 8-bpc that iOS ImageIO can decode (Radar 143602439).
 * Caches the 8-bpc version in Storage at pins/<id>/media-8bpc/<file>
 * so subsequent requests stream the cached version directly.
 */
const PROXY_URL = 'https://us-central1-plot-fe990.cloudfunctions.net/proxyImage8bpc'

/**
 * Returns true for URLs that hit the iOS ImageIO 48-bpp decode bug —
 * specifically the server-cropped thumbnails which are the only files
 * affected (cropPhotos sometimes outputs 16-bpc JPGs).
 */
function needsProxy(path: string): boolean {
  return /\/media\/content-\d+-[a-z0-9]+-cropped-/.test(path)
}

/** Build a proxy URL given a Storage object path. */
function proxiedUrl(path: string): string {
  return `${PROXY_URL}?path=${encodeURIComponent(path)}`
}

/**
 * Returns a tokenized Firebase Storage download URL for the given
 * pin-media URL. If the input is already a tokenized wrapper URL,
 * returns it unchanged. Returns null if the URL can't be resolved.
 */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  // Already tokenized wrapper URL — pass through.
  if (url.includes('firebasestorage.googleapis.com') && url.includes('token=')) {
    return url
  }
  // Cached?
  const cached = cache.get(url)
  if (cached) return cached
  // In-flight?
  const pending = inflight.get(url)
  if (pending) return pending

  const promise = (async () => {
    try {
      // Direct-GCS URL → convert to gs:// (refFromURL doesn't accept
      // the https://storage.googleapis.com/<bucket>/<path> shape).
      // Wrapper URL (firebasestorage.googleapis.com/v0/...) → already
      // accepted as-is.
      const gcsMatch = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+?)(?:\?.*)?$/)
      const path = gcsMatch ? gcsMatch[2] : null

      // Buggy cropPhotos thumbnail → route through 8-bpc proxy
      // function (which serves a sharp-re-encoded copy iOS can decode).
      if (path && needsProxy(path)) {
        const proxied = proxiedUrl(path)
        cache.set(url, proxied)
        return proxied
      }
      // Also handle wrapper-URL form of the same buggy files.
      const wrapperMatch = url.match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/)
      if (wrapperMatch) {
        const decoded = decodeURIComponent(wrapperMatch[1])
        if (needsProxy(decoded)) {
          const proxied = proxiedUrl(decoded)
          cache.set(url, proxied)
          return proxied
        }
      }

      // Otherwise resolve to a tokenized wrapper URL via the SDK.
      const refUrl = gcsMatch ? `gs://${gcsMatch[1]}/${gcsMatch[2]}` : url
      const ref = storage().refFromURL(refUrl)
      const resolved = await ref.getDownloadURL()
      cache.set(url, resolved)
      return resolved
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[resolveStorageUrl] failed:', (e as Error).message, url)
      return url
    } finally {
      inflight.delete(url)
    }
  })()

  inflight.set(url, promise)
  return promise
}
