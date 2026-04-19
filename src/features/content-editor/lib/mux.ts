/**
 * Mux client helpers. The browser NEVER talks to the Mux API directly —
 * it calls our Cloud Function (`createMuxAsset`), which holds the secret
 * and relays the request server-side.
 */
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebase'
import type { Clip } from '../state/types'

export interface MuxClipInput {
  url: string
  startTime?: number
  endTime?: number
}

export interface CreateMuxAssetArgs {
  pinId: string
  contentId: string
  clips: MuxClipInput[]
  caption?: string
}

export interface CreateMuxAssetResult {
  assetId: string
  playbackId: string
  mp4Url: string
  hlsUrl: string
}

/**
 * Ask our Cloud Function to build a Mux asset from the given Storage URLs.
 * The function returns stream URLs immediately, but the asset is still
 * `preparing` — playback won't work until the Mux webhook fires and the
 * pin doc gets patched with mediaUrl. UI should show a "processing" state
 * during this window.
 */
export async function createMuxAsset(args: CreateMuxAssetArgs): Promise<CreateMuxAssetResult> {
  const functions = getFunctions(app ?? undefined)
  const fn = httpsCallable<CreateMuxAssetArgs, CreateMuxAssetResult>(functions, 'createMuxAsset')
  const res = await fn(args)
  return res.data
}

/**
 * Build the ClipInput array for Mux from editor clips.
 * Note: Mux input-array concat applies trim via start_time/end_time but
 * does NOT support per-clip speed, crop, or color adjustments. When those
 * are present, the caller must pre-bake with ffmpeg first.
 */
export function clipsToMuxInputs(clips: Clip[], storageUrls: string[]): MuxClipInput[] {
  // Don't send startTime/endTime — Mux can only clip its own assets,
  // not external Firebase Storage URLs. Trimming is handled by ffmpeg
  // before upload (needsFFmpegPreprocess routes trimmed clips through
  // the ffmpeg path which bakes the trim into the file).
  return clips.map((_, idx) => ({ url: storageUrls[idx] }))
}
