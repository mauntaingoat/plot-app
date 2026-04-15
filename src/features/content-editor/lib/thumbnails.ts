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

/**
 * Photos resolve synchronously with no real probe — image dims are read via
 * an off-screen `<img>`. The returned `duration` is the MAX allowed display
 * length (10s). The caller seeds `trimOut` to the default visible length
 * (3s). Users drag the right trim handle to extend up to `duration`.
 */
const PHOTO_MAX_DURATION = 10

export function probePhoto(file: File): Promise<PhotoProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    let settled = false
    const done = (nativeAspect: number) => {
      if (settled) return
      settled = true
      resolve({ thumbnailUrl: url, duration: PHOTO_MAX_DURATION, nativeAspect })
    }
    img.onload = () => done(img.width && img.height ? img.width / img.height : 9 / 16)
    img.onerror = () => done(9 / 16)
    img.src = url
    // Never reject — fall back to defaults after 5s so slow decodes don't
    // surface as "upload failed".
    setTimeout(() => done(9 / 16), 5000)
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
/** Is this browser an iOS/iPadOS Safari or webkit wrapper? */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
}

/**
 * Extract N evenly-spaced frames using the DOM `<video>` element.
 * Works on desktop Chrome/Firefox where seek+drawImage is reliable.
 * Returns [] on iOS Safari where this approach produces blank frames.
 */
async function extractViaSeekDraw(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.setAttribute('webkit-playsinline', 'true')
  video.src = url

  const cleanup = () => {
    try { video.pause() } catch { /* noop */ }
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }

  const waitReady = (): Promise<void> => new Promise((resolve, reject) => {
    if (video.readyState >= 2) return resolve()
    const onReady = () => { cleanupListeners(); resolve() }
    const onErr = () => { cleanupListeners(); reject(new Error('metadata failed')) }
    const cleanupListeners = () => {
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('canplay', onReady)
      video.removeEventListener('error', onErr)
    }
    video.addEventListener('loadedmetadata', onReady)
    video.addEventListener('canplay', onReady)
    video.addEventListener('error', onErr)
  })

  try {
    await waitReady()
  } catch {
    cleanup()
    return []
  }

  const duration = isFinite(video.duration) ? video.duration : 0
  if (duration <= 0) {
    cleanup()
    return []
  }

  const count = frameCountForDuration(duration)
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

  const frames: string[] = []
  const seekTo = (t: number): Promise<void> => new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      video.removeEventListener('seeked', done)
      resolve()
    }
    video.addEventListener('seeked', done, { once: true })
    video.currentTime = t
    setTimeout(done, 400)
  })

  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * duration
    try {
      await seekTo(Math.min(t, duration - 0.05))
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
      // Reject obviously-blank frames (<1KB JPEGs from unpainted canvases).
      if (blob && blob.size > 1024) frames.push(URL.createObjectURL(blob))
    } catch { /* skip this frame */ }
  }

  cleanup()
  // If more than half came back blank, treat as total failure so the
  // caller can fall back to ffmpeg or the tiled-thumbnail fallback.
  if (frames.length < Math.max(2, Math.floor(count / 2))) {
    for (const f of frames) URL.revokeObjectURL(f)
    return []
  }
  return frames
}

/**
 * Extract N frames via ffmpeg.wasm. This is the ONLY reliable path on
 * iOS Safari where drawImage(video) returns blank frames. ffmpeg runs in
 * a worker and produces real JPEG bytes regardless of platform.
 */
async function extractViaFFmpeg(file: File): Promise<string[]> {
  const { getFFmpeg } = await import('./ffmpegClient')
  const ff = await getFFmpeg()

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const inputName = `probe_in_${Date.now()}.${ext}`
  await ff.writeFile(inputName, new Uint8Array(await file.arrayBuffer()))

  // Probe duration via a no-op decode. ffmpeg doesn't expose duration
  // directly via writeFile, so we use a <video> element for metadata only.
  const duration = await new Promise<number>((resolve) => {
    const v = document.createElement('video')
    const u = URL.createObjectURL(file)
    v.preload = 'metadata'
    v.src = u
    v.addEventListener('loadedmetadata', () => {
      resolve(isFinite(v.duration) ? v.duration : 0)
      v.removeAttribute('src'); v.load(); URL.revokeObjectURL(u)
    }, { once: true })
    v.addEventListener('error', () => { resolve(0); URL.revokeObjectURL(u) }, { once: true })
    setTimeout(() => resolve(0), 3000)
  })

  if (duration <= 0) {
    try { await ff.deleteFile(inputName) } catch { /* noop */ }
    return []
  }

  const count = frameCountForDuration(duration)
  // fps = count frames spread over duration. ffmpeg's `fps` filter takes
  // a rate; to get `count` frames total we ask for count/duration fps.
  const fps = Math.max(0.1, count / duration)
  const pattern = `probe_frame_%03d.jpg`

  try {
    await ff.exec([
      '-i', inputName,
      '-vf', `fps=${fps.toFixed(3)},scale=${FILMSTRIP_FRAME_W}:-1`,
      '-q:v', '5',
      '-frames:v', String(count),
      pattern,
    ])
  } catch (err) {
    try { await ff.deleteFile(inputName) } catch { /* noop */ }
    throw err
  }

  const frames: string[] = []
  for (let i = 1; i <= count; i++) {
    const name = `probe_frame_${String(i).padStart(3, '0')}.jpg`
    try {
      const data = await ff.readFile(name)
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' })
      frames.push(URL.createObjectURL(blob))
      try { await ff.deleteFile(name) } catch { /* noop */ }
    } catch { /* missing frame — skip */ }
  }

  try { await ff.deleteFile(inputName) } catch { /* noop */ }
  return frames
}

/** Mobile touch-device heuristic (mobile Safari AND Android Chrome). */
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document)
}

/**
 * Primary filmstrip extractor.
 *
 * Desktop: uses the fast DOM-based seek+drawImage path. If that fails
 * (rare), falls back to ffmpeg.wasm.
 *
 * Mobile: goes straight to ffmpeg.wasm. Both iOS Safari and Android
 * Chrome have issues with drawImage(video) — iOS returns blank frames,
 * Android produces inconsistent results depending on the device.
 * ffmpeg is the only way to get real frames cross-platform.
 */
export async function extractFilmstrip(file: File): Promise<string[]> {
  if (!isMobile()) {
    const frames = await extractViaSeekDraw(file)
    if (frames.length > 0) return frames
    try { return await extractViaFFmpeg(file) } catch { return [] }
  }

  // Mobile: ffmpeg first. If ffmpeg fails (e.g. CDN timeout), fall back
  // to an empty array so the tiled-thumbnail fallback renders instead
  // of committing blank frames.
  try {
    const frames = await extractViaFFmpeg(file)
    if (frames.length > 0) return frames
  } catch (err) {
    console.warn('ffmpeg filmstrip extraction failed', err)
  }
  return []
}
