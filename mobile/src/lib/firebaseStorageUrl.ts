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
      const ref = storage().refFromURL(url)
      const resolved = await ref.getDownloadURL()
      cache.set(url, resolved)
      return resolved
    } catch (e) {
      // Surfacing the error to the caller — fallback to original URL
      // and let the Image's retry-on-error path handle it.
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
