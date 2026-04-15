/**
 * Lightweight media probes for the simplified create flows.
 * No filmstrip extraction — just dimensions, duration, and a single thumbnail.
 */

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|3gp|3gpp|qt|hevc)$/i

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video')) return true
  return VIDEO_EXT.test(file.name)
}

export interface PhotoProbeResult {
  previewUrl: string
  width: number
  height: number
  aspect: number
}

export function probePhoto(file: File): Promise<PhotoProbeResult> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file)
    const img = new Image()
    let done = false
    const finish = (result?: PhotoProbeResult, err?: Error) => {
      if (done) return
      done = true
      if (result) resolve(result)
      else reject(err ?? new Error('probePhoto failed'))
    }
    img.onload = () => {
      const width = img.naturalWidth || img.width || 1
      const height = img.naturalHeight || img.height || 1
      finish({ previewUrl, width, height, aspect: width / height })
    }
    img.onerror = () => finish(undefined, new Error('probePhoto decode failed'))
    img.src = previewUrl
    setTimeout(() => finish(undefined, new Error('probePhoto timeout')), 8000)
  })
}

export interface VideoProbeResult {
  previewUrl: string
  thumbnailUrl: string
  duration: number
  width: number
  height: number
  aspect: number
}

const THUMB_MAX_W = 480

export function probeVideo(file: File): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    // Use a second URL for the off-screen probe so revoking it later
    // doesn't kill the live preview URL the caller keeps.
    const probeUrl = URL.createObjectURL(file)
    video.src = probeUrl

    let resolved = false
    const cleanup = () => {
      try { video.removeAttribute('src'); video.load() } catch { /* noop */ }
      URL.revokeObjectURL(probeUrl)
    }

    const fail = (err: Error) => {
      if (resolved) return
      resolved = true
      cleanup()
      try { URL.revokeObjectURL(previewUrl) } catch { /* noop */ }
      reject(err)
    }

    video.addEventListener('loadedmetadata', () => {
      const duration = isFinite(video.duration) ? video.duration : 0
      const seekTo = Math.min(Math.max(duration * 0.05, 0.1), Math.max(duration - 0.05, 0.1))
      try {
        video.currentTime = seekTo
      } catch {
        fail(new Error('probeVideo seek failed'))
      }
    })

    video.addEventListener('seeked', () => {
      try {
        const w = video.videoWidth || 720
        const h = video.videoHeight || 1280
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, THUMB_MAX_W / w)
        canvas.width = Math.max(1, Math.round(w * scale))
        canvas.height = Math.max(1, Math.round(h * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) { fail(new Error('probeVideo 2d context unavailable')); return }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (!blob) { fail(new Error('probeVideo thumbnail blob null')); return }
          const thumbnailUrl = URL.createObjectURL(blob)
          resolved = true
          cleanup()
          resolve({
            previewUrl,
            thumbnailUrl,
            duration: isFinite(video.duration) ? video.duration : 0,
            width: w,
            height: h,
            aspect: w / h,
          })
        }, 'image/jpeg', 0.85)
      } catch (err) {
        fail(err instanceof Error ? err : new Error('probeVideo draw failed'))
      }
    })

    video.addEventListener('error', () => fail(new Error('probeVideo load failed')))
    setTimeout(() => fail(new Error('probeVideo timeout')), 15000)
  })
}
