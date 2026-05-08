/* ════════════════════════════════════════════════════════════════
   IMAGE RESIZE
   ────────────────────────────────────────────────────────────────
   Canvas-based client-side resize. Used before uploading
   user-supplied imagery (custom profile backgrounds, etc.) so the
   public profile doesn't pay the cost of a 6MB DSLR photo to render
   a card surface. Aspect ratio is preserved; only the longest edge
   is clamped, so a vertical phone shot still uploads as vertical.
   ──────────────────────────────────────────────────────────────── */

export interface ResizeOptions {
  /** Largest allowed dimension in pixels — applied to the longer
   *  edge so the aspect ratio is preserved. Images smaller than
   *  this on both edges pass through untouched (still re-encoded
   *  to JPEG for size savings). */
  maxEdge?: number
  /** JPEG quality, 0–1. */
  quality?: number
  /** Output mime type. JPEG strips transparency — use 'image/png'
   *  if alpha matters (it doesn't for opaque backgrounds). */
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

const DEFAULT_OPTS: Required<ResizeOptions> = {
  maxEdge: 1600,
  quality: 0.85,
  mimeType: 'image/jpeg',
}

/** Resize an image File to a Blob within the given constraints.
 *  Throws if the file isn't a parseable image (corrupt, wrong type,
 *  etc.) — caller should surface a user-facing error. */
export async function resizeImage(file: File, opts: ResizeOptions = {}): Promise<Blob> {
  const { maxEdge, quality, mimeType } = { ...DEFAULT_OPTS, ...opts }

  const bitmap = await loadBitmap(file)
  const { width: srcW, height: srcH } = bitmap

  const longest = Math.max(srcW, srcH)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  const dstW = Math.round(srcW * scale)
  const dstH = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = dstW
  canvas.height = dstH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, dstW, dstH)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Image encode failed'))
      },
      mimeType,
      quality,
    )
  })
}

/** Cross-browser image decode. Prefers `createImageBitmap` (fast,
 *  off-thread on supported browsers) and falls back to an
 *  HTMLImageElement when not available (older Safari). */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to <img> path on rare decode failures
    }
  }
  return loadImageElement(file)
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}
