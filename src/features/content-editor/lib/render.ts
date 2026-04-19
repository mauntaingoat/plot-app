import { createMuxAsset, type MuxClipInput } from './mux'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import type { Clip } from '../state/types'

/**
 * Render pipeline — fully server-side.
 *
 * Client uploads raw files to Firebase Storage, then calls the
 * createMuxAsset Cloud Function with clip URLs + processing
 * instructions (type, trim, speed). The Cloud Function runs native
 * FFmpeg server-side for any preprocessing (photo→video, trim,
 * speed) then hands clean URLs to Mux for transcoding/delivery.
 *
 * No browser-side ffmpeg.wasm — matches the architecture used by
 * TikTok, Instagram, and Snapchat.
 */

export interface RenderArgs {
  clips: Clip[]
  aspect: string
  overlays: unknown[]
  pinId: string
  contentId: string
  caption?: string
  onProgress?: (phase: RenderPhase, pct: number) => void
}

export type RenderPhase = 'upload' | 'queue'

export interface RenderResult {
  muxAssetId: string
  muxPlaybackId: string
  mp4Url: string
  hlsUrl: string
  storageUrl?: string
}

export async function renderComposition(args: RenderArgs): Promise<RenderResult> {
  const { clips, pinId, contentId, caption, onProgress } = args
  const storageUrls: string[] = []

  // 1. Upload each raw clip to Firebase Storage.
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

  // 2. Build clip instructions for the Cloud Function.
  // The function handles all preprocessing server-side (photo→video,
  // trim, speed) via native FFmpeg before handing to Mux.
  const muxClips: MuxClipInput[] = clips.map((clip, idx) => {
    const input: MuxClipInput = { url: storageUrls[idx] }
    if (clip.type === 'photo') {
      input.type = 'photo'
      input.photoDuration = clip.trimOut - clip.trimIn || 3
    } else {
      input.type = 'video'
      if (clip.trimIn > 0.05) input.startTime = clip.trimIn
      if (clip.trimOut > 0 && clip.duration > 0 && Math.abs(clip.trimOut - clip.duration) > 0.05) {
        input.endTime = clip.trimOut
      }
    }
    if (clip.speed !== 1) input.speed = clip.speed
    return input
  })

  // 3. Call the Cloud Function — it preprocesses + creates Mux asset.
  onProgress?.('queue', 0)
  const result = await createMuxAsset({ pinId, contentId, clips: muxClips, caption })
  onProgress?.('queue', 1)

  return {
    muxAssetId: result.assetId,
    muxPlaybackId: result.playbackId,
    mp4Url: result.mp4Url,
    hlsUrl: result.hlsUrl,
    storageUrl: storageUrls[0],
  }
}
