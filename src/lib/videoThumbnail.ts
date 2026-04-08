/**
 * Generate a thumbnail from a video file's first frame using canvas.
 * Returns a Blob (JPEG) that can be uploaded to Firebase Storage.
 */
export function generateVideoThumbnail(
  videoFile: File,
  options: { width?: number; height?: number; seekTo?: number; quality?: number } = {}
): Promise<Blob> {
  const { width = 400, height = 700, seekTo = 1, quality = 0.85 } = options

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(videoFile)
    video.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.onloadedmetadata = () => {
      // Seek to the specified time (default 1 second in)
      video.currentTime = Math.min(seekTo, video.duration * 0.1)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) { cleanup(); reject(new Error('Canvas context unavailable')); return }

        // Calculate cover-fit dimensions (like object-fit: cover)
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = width / height
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight

        if (videoAspect > canvasAspect) {
          // Video is wider — crop sides
          sw = video.videoHeight * canvasAspect
          sx = (video.videoWidth - sw) / 2
        } else {
          // Video is taller — crop top/bottom
          sh = video.videoWidth / canvasAspect
          sy = (video.videoHeight - sh) / 2
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            cleanup()
            if (blob) resolve(blob)
            else reject(new Error('Failed to generate thumbnail blob'))
          },
          'image/jpeg',
          quality
        )
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Failed to load video for thumbnail'))
    }

    // Timeout fallback — don't hang forever
    setTimeout(() => {
      cleanup()
      reject(new Error('Thumbnail generation timed out'))
    }, 10000)
  })
}
