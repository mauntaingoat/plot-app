import { Timestamp } from 'firebase/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { renderComposition, uploadCustomThumbnail, type RenderPhase } from '@/features/content-editor/lib/render'
import { publishCarouselPhotos } from '@/features/content-create/lib/publish'
import type { ContentDraft } from '@/features/content-create/types'
import type { ContentItem } from '@/lib/types'

/**
 * Background-publish helper. Pulled out of PinCreate so the upload
 * queue (src/stores/uploadStore.ts) can run the same work asynchronously
 * after the user has already navigated to /dashboard.
 *
 * The function does NOT create the pin doc — that happens up front in
 * PinCreate so the pin is visible in My Pins immediately. This helper
 * handles the slow tail: photo uploads, reel/carousel rendering, and
 * pin activation. As steps complete it patches the pin doc, so the
 * dashboard subscription picks up media + content as they land.
 */

export type PublishPhase =
  | { step: 'photos'; index: number; total: number; pct: number }
  | { step: 'content'; index: number; total: number; phase: RenderPhase; pct: number }
  | { step: 'activating' }

export interface PublishInput {
  pinId: string
  pinType: 'for_sale' | 'sold' | 'spotlight' | 'video' | 'live'
  photos: File[]
  contentDrafts: ContentDraft[]
  /** Pre-generated stable IDs for each draft so the rendered items
   *  line up with whatever the editor session was holding. */
  placeholderIds: string[]
}

export interface PublishResult {
  activated: boolean
  contentArray: ContentItem[]
  photoUrls: string[]
  /** Set when setPinEnabled rejects (active-pin cap). The pin is
   *  saved as a draft; the caller surfaces an upsell sheet. */
  paywall?: { reason: string; upgradeTo?: 'pro' }
}

/** Map per-step progress into a single 0–1 number so the UploadBar
 *  can render one bar across the whole job. Roughly: photos = 25%,
 *  content = 70%, activating = 5%. */
export function overallProgress(
  step: PublishPhase['step'],
  index: number,
  total: number,
  pct: number,
): number {
  if (step === 'photos') {
    if (total === 0) return 0.25
    return ((index + pct) / total) * 0.25
  }
  if (step === 'content') {
    if (total === 0) return 0.95
    return 0.25 + ((index + pct) / total) * 0.7
  }
  return 0.95
}

export async function publishPinAssets(
  input: PublishInput,
  onPhase: (phase: PublishPhase) => void,
): Promise<PublishResult> {
  const { pinId, pinType, photos, contentDrafts, placeholderIds } = input
  const photoUrls: string[] = []

  // ── 1. Listing photos ──
  if (photos.length > 0 && (pinType === 'for_sale' || pinType === 'sold')) {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      onPhase({ step: 'photos', index: i, total: photos.length, pct: 0 })
      const url = await uploadFile({
        path: pinMediaPath(pinId, photo.name),
        file: photo,
        onProgress: (pct) =>
          onPhase({ step: 'photos', index: i, total: photos.length, pct: pct / 100 }),
      })
      photoUrls.push(url)
    }
    const { updatePin } = await import('@/lib/firestore')
    await updatePin(pinId, {
      photos: photoUrls,
      heroPhotoUrl: photoUrls[0] || '',
    } as Partial<{ photos: string[]; heroPhotoUrl: string }>)
  }

  // ── 2. Content drafts ──
  const contentArray: ContentItem[] = []
  for (let i = 0; i < contentDrafts.length; i++) {
    const draft = contentDrafts[i]
    const contentId = placeholderIds[i]

    if (draft.kind === 'carousel') {
      const items = await publishCarouselPhotos(draft, pinId, (phase, pct) => {
        // PublishCarousel emits 'upload' | 'crop'. Fold both into the
        // current 'content' step so the bar moves smoothly.
        onPhase({ step: 'content', index: i, total: contentDrafts.length, phase: phase === 'crop' ? 'queue' : 'upload', pct })
      })
      items.forEach((it, idx) => {
        if (idx === 0) it.caption = draft.caption ?? ''
        contentArray.push(it)
      })
    } else {
      const draftClips = draft.clipFiles.map((file, idx) => ({
        id: `${draft.id}-${idx}`,
        file,
        sourceUrl: '',
        thumbnailUrl: '',
        frames: [],
        nativeAspect: 9 / 16,
        type: file.type.startsWith('video') ? ('video' as const) : ('photo' as const),
        duration: 0,
        trimIn: draft.clipMeta[idx]?.trimIn ?? 0,
        trimOut: draft.clipMeta[idx]?.trimOut ?? 0,
        speed: (draft.clipMeta[idx]?.speed ?? 1) as 0.5 | 1 | 1.5 | 2,
        adjustments: draft.clipMeta[idx]?.adjustments ?? { brightness: 0, contrast: 0, saturation: 0 },
      }))

      const result = await renderComposition({
        clips: draftClips as never,
        aspect: draft.aspect,
        overlays: draft.overlays,
        pinId,
        contentId,
        caption: draft.caption ?? '',
        onProgress: (phase, pct) =>
          onPhase({ step: 'content', index: i, total: contentDrafts.length, phase, pct }),
      })

      const customThumbUrl = await uploadCustomThumbnail(draft.thumbnailUrl, pinId, contentId)
      const draftThumbFallback = draft.thumbnailUrl?.startsWith('data:') ? '' : (draft.thumbnailUrl || '')

      contentArray.push({
        id: contentId,
        type: 'reel',
        mediaUrl: result.processedUrl || result.storageUrl || '',
        sourceUrl: result.storageUrl || '',
        sourceUrls: result.storageUrls,
        mp4Url: result.mp4Url,
        thumbnailUrl: customThumbUrl || result.thumbnailUrl || draftThumbFallback,
        caption: draft.caption ?? '',
        muxAssetId: result.muxAssetId,
        muxPlaybackId: result.muxPlaybackId,
        status: 'ready',
        aspect: draft.aspect,
        createdAt: Timestamp.now(),
        views: 0,
        saves: 0,
        publishAt: null,
      } as ContentItem)
    }
  }

  // ── 3. Persist content array ──
  if (contentArray.length > 0) {
    const now = Date.now()
    const future = contentArray
      .map((c) => c.publishAt?.toMillis?.() ?? null)
      .filter((ms): ms is number => ms != null && ms > now)
    const nextPublishAt = future.length > 0 ? Timestamp.fromMillis(Math.min(...future)) : null
    const { updatePin } = await import('@/lib/firestore')
    const { serverTimestamp } = await import('firebase/firestore')
    // Bump contentLastAddedAt — this function is the publish-new-
    // content path, so anything written here counts as an add for
    // digest-detection purposes.
    await updatePin(pinId, {
      content: contentArray,
      nextPublishAt,
      contentLastAddedAt: serverTimestamp(),
    } as Partial<{ content: ContentItem[]; nextPublishAt: Timestamp | null; contentLastAddedAt: Timestamp }>)
  }

  // ── 4. Activate ──
  onPhase({ step: 'activating' })
  let activated = true
  let paywall: PublishResult['paywall']
  try {
    const { setPinEnabled } = await import('@/lib/firestore')
    await setPinEnabled(pinId, true)
  } catch (err) {
    const e = err as { message?: string; details?: { upgradeTo?: 'pro' } }
    const reason = e?.message || "You're at your active-pin cap. The pin is saved as a draft — archive an active pin or upgrade to publish it."
    paywall = { reason, upgradeTo: e?.details?.upgradeTo }
    activated = false
  }

  return { activated, contentArray, photoUrls, paywall }
}
