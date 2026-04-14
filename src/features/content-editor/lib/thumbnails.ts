/**
 * Extract a thumbnail + duration from a video file via an offscreen <video>.
 * Seeks to 10% to avoid black opening frames.
 */
export function probeVideo(file: File): Promise<{ thumbnailUrl: string; duration: number }> {
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
      const canvas = document.createElement('canvas')
      const w = video.videoWidth || 320
      const h = video.videoHeight || 180
      canvas.width = 160
      canvas.height = Math.round((160 * h) / w)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        cleanup()
        reject(new Error('2d context unavailable'))
        return
      }
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
        resolve({ thumbnailUrl, duration })
      }, 'image/jpeg', 0.8)
    })

    video.addEventListener('error', () => {
      cleanup()
      reject(new Error('video probe failed'))
    })
  })
}

/** Photo thumbnail = the image itself (just a blob URL). Duration defaults to 3s. */
export function probePhoto(file: File): { thumbnailUrl: string; duration: number } {
  return { thumbnailUrl: URL.createObjectURL(file), duration: 3 }
}
