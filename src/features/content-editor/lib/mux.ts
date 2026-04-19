/**
 * Mux client helpers. The browser NEVER talks to the Mux API directly —
 * it calls our Cloud Function (`createMuxAsset`), which handles all
 * preprocessing (photo→video, trim, speed) server-side via native FFmpeg
 * before handing clean URLs to Mux.
 */
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebase'

export interface MuxClipInput {
  url: string
  type?: string
  startTime?: number
  endTime?: number
  photoDuration?: number
  speed?: number
}

export interface CreateMuxAssetArgs {
  pinId: string
  contentId: string
  clips: MuxClipInput[]
  caption?: string
  /** Target aspect ratio from the editor (e.g. '9:16', '1:1', '4:5').
   *  The Cloud Function applies this as a crop/scale via FFmpeg. */
  aspect?: string
}

export interface CreateMuxAssetResult {
  assetId: string
  playbackId: string
  mp4Url: string
  hlsUrl: string
}

export async function createMuxAsset(args: CreateMuxAssetArgs): Promise<CreateMuxAssetResult> {
  const functions = getFunctions(app ?? undefined)
  const fn = httpsCallable<CreateMuxAssetArgs, CreateMuxAssetResult>(functions, 'createMuxAsset')
  const res = await fn(args)
  return res.data
}
