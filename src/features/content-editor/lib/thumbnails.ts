/**
 * Video thumbnail + filmstrip frame extraction.
 *
 * Two flavors:
 *   - probeVideo()         — fast first-pass: just metadata + a single
 *                            representative frame. Used for instant import
 *                            so the clip is in the timeline immediately.
 *   - extractFilmstrip()   — slower second pass: pulls N frames evenly
 *                            spaced across the duration so the timeline tile
 *                            renders as a real filmstrip instead of one
 *                            stretched thumbnail. Runs in the background.
 */

interface VideoProbe {
  thumbnailUrl: string
  duration: number
  nativeAspect: number
}

const TARGET_W = 480

/** Single-frame fast probe — first pass. */
export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }

    video.addEventListener('loadedmetadata', () => {
      const duration = isFinite(video.duration) ? video.duration : 0
      video.currentTime = Math.min(Math.max(duration * 0.1, 0.1), duration || 0.1)
    })

    video.addEventListener('seeked', () => {
      const w = video.videoWidth || 320
      const h = video.videoHeight || 180
      const nativeAspect = w / h
      const canvas = document.createElement('canvas')
      canvas.width = TARGET_W
      canvas.height = Math.round((TARGET_W * h) / w)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        reject(new Error('2d context unavailable'))
        return
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) {
          cleanup()
          reject(new Error('thumbnail blob null'))
          return
        }
        const thumbnailUrl = URL.createObjectURL(blob)
        const duration = isFinite(video.duration) ? video.duration : 0
        cleanup()
        resolve({ thumbnailUrl, duration, nativeAspect })
      }, 'image/jpeg', 0.88)
    })

    video.addEventListener('error', () => {
      cleanup()
      reject(new Error('video probe failed'))
    })
  })
}

interface PhotoProbe {
  thumbnailUrl: string
  duration: number
  nativeAspect: number
}

/** Photos resolve synchronously with no real probe — image dims are read on-demand. */
export function probePhoto(file: File): Promise<PhotoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const nativeAspect = img.width && img.height ? img.width / img.height : 9 / 16
      resolve({ thumbnailUrl: url, duration: 3, nativeAspect })
    }
    img.onerror = () => {
      // Fall back to default aspect if the image fails to decode for sizing
      resolve({ thumbnailUrl: url, duration: 3, nativeAspect: 9 / 16 })
    }
    img.src = url
    // Fail fast after 5s
    setTimeout(() => reject(new Error('photo probe timeout')), 5000)
  })
}

/**
 * Adaptive frame count for the timeline filmstrip.
 * Denser for short clips so a 3-second tile doesn't look sparse.
 *
 *  - Short clips (≤8s):    2 frames per second, min 6
 *  - Medium clips (≤30s):  1 frame per second, capped 14
 *  - Long clips:           16 frames total, evenly spaced
 */
function frameCountForDuration(duration: number): number {
  if (duration <= 8) return Math.max(6, Math.ceil(duration * 2))
  if (duration <= 30) return Math.min(14, Math.ceil(duration))
  return 16
}

const FILMSTRIP_FRAME_W = 160 // wide enough to read clearly when 80–100px is visible

/**
 * Extract N evenly-spaced frames across the clip and return their object URLs.
 * Sequentially seeks because parallel seeks on the same <video> element fight.
 * Runs in the background after probeVideo, so latency is acceptable.
 */
export async function extractFilmstrip(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url

  const cleanup = () => {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }

  // Wait for metadata
  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('extractFilmstrip metadata failed')), { once: true })
  })

  const duration = isFinite(video.duration) ? video.duration : 0
  if (duration <= 0) {
    cleanup()
    return []
  }

  const count = frameCountForDuration(duration)
  const frames: string[] = []
  const w = video.videoWidth || 320
  const h = video.videoHeight || 180
  const canvas = document.createElement('canvas')
  canvas.width = FILMSTRIP_FRAME_W
  canvas.height = Math.round((FILMSTRIP_FRAME_W * h) / w)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    cleanup()
    return []
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  for (let i = 0; i < count; i++) {
    // Pick a time slightly inset from the absolute start/end so we don't get black frames
    const t = ((i + 0.5) / count) * duration
    try {
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked)
          resolve()
        }
        const onErr = () => {
          video.removeEventListener('error', onErr)
          reject(new Error('seek failed'))
        }
        video.addEventListener('seeked', onSeeked, { once: true })
        video.addEventListener('error', onErr, { once: true })
        video.currentTime = Math.min(t, duration - 0.05)
      })
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
      if (blob) frames.push(URL.createObjectURL(blob))
    } catch {
      // Skip this frame; continue with the rest
      continue
    }
  }

  cleanup()
  return frames
}
