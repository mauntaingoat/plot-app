import { Timestamp } from 'firebase/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import type { ContentItem } from '@/lib/types'
import type { CarouselDraft } from '../types'

export type PublishPhase = 'upload'
export type PublishProgress = (phase: PublishPhase, pct: number) => void

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

function newContentId() {
  return `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Photo carousel → uploads all photos to Firebase Storage, returns a
 * SINGLE ContentItem with `mediaUrls[]` containing all photo URLs.
 * The first photo's URL is also set as `mediaUrl` and `thumbnailUrl`
 * for backwards compatibility with views that only read the single URL.
 */
export async function publishCarouselPhotos(
  draft: CarouselDraft,
  pinId: string,
  onProgress?: PublishProgress,
): Promise<ContentItem[]> {
  const urls: string[] = []
  const total = draft.photos.length || 1
  for (let i = 0; i < draft.photos.length; i++) {
    const photo = draft.photos[i]
    const filename = `photo-${Date.now()}-${i}-${photo.file.name}`
    const url = await uploadFile({
      path: pinMediaPath(pinId, filename),
      file: photo.file,
      onProgress: (pct) => onProgress?.('upload', clamp01((i + pct / 100) / total)),
    })
    urls.push(url)
  }
  return [{
    id: newContentId(),
    type: 'photo',
    mediaUrl: urls[0] || '',
    mediaUrls: urls,
    thumbnailUrl: urls[0] || '',
    caption: '',
    createdAt: Timestamp.now(),
    views: 0,
    saves: 0,
    publishAt: null,
  }]
}
