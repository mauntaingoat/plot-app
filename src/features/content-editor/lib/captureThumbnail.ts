import { useEditorStore } from '../state/editorStore'

/** Capture the currently-displayed preview frame as the cover thumbnail
 *  for the selected clip. Works for any clip type:
 *    - video: grabs the current frame off the <video> element (waits on
 *      `seeked` + one rVFC tick so the post-seek frame is the one we
 *      read, not the previous one).
 *    - photo: rasterizes the <img> element so single-photo content
 *      and photo clips inside multi-clip reels both work.
 *
 *  Resolves with the data URL on success, null otherwise (no source
 *  element, source not yet decoded, tainted canvas). */
export async function captureCurrentFrameAsThumbnail(): Promise<string | null> {
  const state = useEditorStore.getState()
  const selected = state.clips.find((c) => c.id === state.selectedClipId) ?? state.clips[0]
  if (!selected) return null

  const TARGET_W = 480
  let sourceW = 0
  let sourceH = 0
  let drawSource: CanvasImageSource | null = null
  let bitmap: ImageBitmap | null = null

  if (selected.type === 'video') {
    const v = document.querySelector<HTMLVideoElement>('.editor-stage video')
    if (!v || v.videoWidth === 0) return null
    if (v.seeking) {
      await new Promise<void>((resolve) => {
        const done = () => { v.removeEventListener('seeked', done); resolve() }
        v.addEventListener('seeked', done, { once: true })
      })
    }
    // Only wait for `requestVideoFrameCallback` if the video is actively
    // playing — when paused, no new frame is presented and the callback
    // never fires (which used to leave this function hung forever and
    // the Thumbnail tap silently no-op'd). Race it against a 120ms
    // safety timeout regardless.
    const rvfc = (v as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback
    if (typeof rvfc === 'function' && !v.paused) {
      await new Promise<void>((resolve) => {
        let resolved = false
        const finish = () => { if (!resolved) { resolved = true; resolve() } }
        rvfc.call(v, finish)
        setTimeout(finish, 120)
      })
    }
    sourceW = v.videoWidth
    sourceH = v.videoHeight
    try { bitmap = await createImageBitmap(v); drawSource = bitmap } catch { drawSource = v }
  } else {
    const img = document.querySelector<HTMLImageElement>('.editor-stage img')
    if (!img || !img.complete || img.naturalWidth === 0) return null
    sourceW = img.naturalWidth
    sourceH = img.naturalHeight
    try { bitmap = await createImageBitmap(img); drawSource = bitmap } catch { drawSource = img }
  }

  const canvasH = Math.round((TARGET_W * sourceH) / sourceW)
  const canvas = document.createElement('canvas')
  canvas.width = TARGET_W
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  try {
    ctx.drawImage(drawSource, 0, 0, TARGET_W, canvasH)
  } catch {
    return null
  } finally {
    bitmap?.close()
  }

  let dataUrl: string
  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.88)
  } catch {
    return null
  }
  if (!dataUrl || dataUrl.length <= 500) return null

  state.setClipThumbnail(selected.id, dataUrl)
  return dataUrl
}
