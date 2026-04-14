import { getFFmpeg } from './ffmpegClient'
import { createMuxAsset, clipsToMuxInputs } from './mux'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import type { Adjustments, AspectRatio, Clip, TextOverlay } from '../state/types'

/**
 * Render pipeline for the content editor.
 *
 * Two paths:
 *
 *   A. FAST PATH (Mux-only) — simple concat + trim, no per-clip effects.
 *      Upload each clip to Firebase Storage, then hand URLs to Mux which
 *      concatenates and transcodes server-side. No ffmpeg load.
 *
 *   B. FFMPEG PATH (Mux delivery) — any advanced edit present (speed,
 *      crop, adjustments, text overlay). ffmpeg.wasm bakes the edits into
 *      a single MP4 locally, uploads it to Firebase Storage, then hands
 *      that single URL to Mux for transcoding + delivery.
 *
 * Either way, final delivery is Mux (CDN, adaptive HLS, thumbnails).
 */

const TARGET_W: Record<AspectRatio, number> = {
  '9:16': 720,  '16:9': 1280, '1:1': 720,
  '3:4':  720,  '4:3':  960,  'free': 720,
}
const TARGET_H: Record<AspectRatio, number> = {
  '9:16': 1280, '16:9': 720,  '1:1': 720,
  '3:4':  960,  '4:3':  720,  'free': 1280,
}

export interface RenderArgs {
  clips: Clip[]
  aspect: AspectRatio
  adjustments: Adjustments
  overlays: TextOverlay[]
  pinId: string
  contentId: string
  caption?: string
  onProgress?: (phase: RenderPhase, pct: number) => void
}

export type RenderPhase = 'preprocess' | 'upload' | 'queue'

export interface RenderResult {
  muxAssetId: string
  muxPlaybackId: string
  mp4Url: string
  hlsUrl: string
}

function needsFFmpegPreprocess(args: Pick<RenderArgs, 'clips' | 'adjustments' | 'overlays' | 'aspect'>): boolean {
  const { clips, adjustments, overlays, aspect } = args
  if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) return true
  if (overlays.length > 0) return true
  if (aspect !== '9:16' && aspect !== 'free') return true
  if (clips.some((c) => c.speed !== 1)) return true
  return false
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

/* ─────────── Mux fast path ─────────── */

async function renderMuxFastPath(args: RenderArgs): Promise<RenderResult> {
  const { clips, pinId, contentId, caption, onProgress } = args
  const storageUrls: string[] = []

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const ext = clip.file.name.split('.').pop() || 'bin'
    const url = await uploadFile({
      path: pinMediaPath(pinId, `${contentId}-clip-${i}-${Date.now()}.${ext}`),
      file: clip.file,
      onProgress: (pct) => onProgress?.('upload', (i + pct / 100) / clips.length),
    })
    storageUrls.push(url)
  }

  onProgress?.('queue', 0)
  const inputs = clipsToMuxInputs(clips, storageUrls)
  const result = await createMuxAsset({ pinId, contentId, clips: inputs, caption })
  onProgress?.('queue', 1)

  return {
    muxAssetId: result.assetId,
    muxPlaybackId: result.playbackId,
    mp4Url: result.mp4Url,
    hlsUrl: result.hlsUrl,
  }
}

/* ─────────── ffmpeg preprocess path ─────────── */

function buildFilter(aspect: AspectRatio, adjustments: Adjustments, speed: number): string {
  const w = TARGET_W[aspect]
  const h = TARGET_H[aspect]
  const scale = `scale=${w}:${h}:force_original_aspect_ratio=increase`
  const crop  = `crop=${w}:${h}`
  const b = adjustments.brightness / 100
  const c = 1 + adjustments.contrast / 100
  const s = 1 + adjustments.saturation / 100
  const eq = `eq=brightness=${b.toFixed(3)}:contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}`
  const pts = speed === 1 ? '' : `,setpts=${(1 / speed).toFixed(4)}*PTS`
  return `${scale},${crop},${eq}${pts}`
}

async function encodeSegment(
  clip: Clip,
  idx: number,
  aspect: AspectRatio,
  adjustments: Adjustments,
  onProgress?: (v: number) => void,
): Promise<string> {
  const ff = await getFFmpeg()
  const inputName  = `in_${idx}.${clip.file.name.split('.').pop()?.toLowerCase() || 'bin'}`
  const outputName = `seg_${idx}.mp4`
  await ff.writeFile(inputName, new Uint8Array(await clip.file.arrayBuffer()))
  const vf = buildFilter(aspect, adjustments, clip.speed)

  const args = clip.type === 'video'
    ? [
        '-ss', clip.trimIn.toFixed(3),
        '-i', inputName,
        '-t', (clip.trimOut - clip.trimIn).toFixed(3),
        '-vf', vf, '-an',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        outputName,
      ]
    : [
        '-loop', '1', '-i', inputName, '-t', '3',
        '-vf', vf, '-r', '30',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        outputName,
      ]

  ff.on('progress', (e: { progress: number }) => onProgress?.(clamp01(e.progress)))
  await ff.exec(args)
  await ff.deleteFile(inputName)
  return outputName
}

async function renderFFmpegPath(args: RenderArgs): Promise<RenderResult> {
  const { clips, aspect, adjustments, pinId, contentId, caption, onProgress } = args
  const ff = await getFFmpeg()

  const segments: string[] = []
  for (let i = 0; i < clips.length; i++) {
    const frac = (v: number) => (i + v) / (clips.length + 1)
    const name = await encodeSegment(clips[i], i, aspect, adjustments, (v) => onProgress?.('preprocess', frac(v)))
    segments.push(name)
  }

  const listName = 'concat.txt'
  await ff.writeFile(listName, new TextEncoder().encode(segments.map((s) => `file '${s}'`).join('\n')))
  await ff.exec([
    '-f', 'concat', '-safe', '0', '-i', listName,
    '-c', 'copy', '-movflags', '+faststart', 'out.mp4',
  ])
  onProgress?.('preprocess', 1)

  const data = await ff.readFile('out.mp4')
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  const composed = new File(
    [bytes as unknown as BlobPart],
    `reelst-edit-${Date.now()}.mp4`,
    { type: 'video/mp4' },
  )

  // Cleanup
  for (const s of segments) { try { await ff.deleteFile(s) } catch { /* noop */ } }
  try { await ff.deleteFile(listName) } catch { /* noop */ }
  try { await ff.deleteFile('out.mp4') } catch { /* noop */ }

  // Upload the single baked mp4
  onProgress?.('upload', 0)
  const url = await uploadFile({
    path: pinMediaPath(pinId, `${contentId}-baked-${Date.now()}.mp4`),
    file: composed,
    onProgress: (pct) => onProgress?.('upload', pct / 100),
  })

  onProgress?.('queue', 0)
  const result = await createMuxAsset({
    pinId,
    contentId,
    clips: [{ url }],
    caption,
  })
  onProgress?.('queue', 1)

  return {
    muxAssetId: result.assetId,
    muxPlaybackId: result.playbackId,
    mp4Url: result.mp4Url,
    hlsUrl: result.hlsUrl,
  }
}

/* ─────────── Entry point ─────────── */

export async function renderComposition(args: RenderArgs): Promise<RenderResult> {
  if (needsFFmpegPreprocess(args)) {
    return renderFFmpegPath(args)
  }
  return renderMuxFastPath(args)
}
