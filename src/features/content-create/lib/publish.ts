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
 * Photo carousel → one Firebase Storage upload per photo, one ContentItem
 * per photo. Mux is not involved (video-only service).
 */
export async function publishCarouselPhotos(
  draft: CarouselDraft,
  pinId: string,
  onProgress?: PublishProgress,
): Promise<ContentItem[]> {
  const items: ContentItem[] = []
  const total = draft.photos.length || 1
  for (let i = 0; i < draft.photos.length; i++) {
    const photo = draft.photos[i]
    const filename = `photo-${Date.now()}-${i}-${photo.file.name}`
    const url = await uploadFile({
      path: pinMediaPath(pinId, filename),
      file: photo.file,
      onProgress: (pct) => onProgress?.('upload', clamp01((i + pct / 100) / total)),
    })
    items.push({
      id: newContentId(),
      type: 'photo',
      mediaUrl: url,
      thumbnailUrl: url,
      caption: '',
      createdAt: Timestamp.now(),
      views: 0,
      saves: 0,
      publishAt: null,
    })
  }
  return items
}
