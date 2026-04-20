import { Timestamp } from 'firebase/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { cropPhotosServer } from './crop'
import type { ContentItem } from '@/lib/types'
import type { CarouselDraft } from '../types'

export type PublishPhase = 'upload' | 'crop'
export type PublishProgress = (phase: PublishPhase, pct: number) => void

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

function newContentId() {
  return `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Photo carousel → uploads raw photos to Firebase Storage, then calls
 * the cropPhotos Cloud Function for server-side cropping to the target
 * aspect ratio. Returns a SINGLE ContentItem with `mediaUrls[]`
 * containing all cropped photo URLs + `sourceUrls[]` with the originals.
 */
export async function publishCarouselPhotos(
  draft: CarouselDraft,
  pinId: string,
  onProgress?: PublishProgress,
): Promise<ContentItem[]> {
  const contentId = newContentId()
  const rawUrls: string[] = []
  const total = draft.photos.length || 1

  for (let i = 0; i < draft.photos.length; i++) {
    const photo = draft.photos[i]
    const filename = `photo-${Date.now()}-${i}-${photo.file.name}`
    const url = await uploadFile({
      path: pinMediaPath(pinId, filename),
      file: photo.file,
      onProgress: (pct) => onProgress?.('upload', clamp01((i + pct / 100) / total)),
    })
    rawUrls.push(url)
  }

  let finalUrls = rawUrls
  const aspect = draft.aspect || '4:5'

  if (aspect !== 'original') {
    onProgress?.('crop', 0)
    try {
      finalUrls = await cropPhotosServer({
        urls: rawUrls,
        aspect,
        pinId,
        contentId,
      })
    } catch (err) {
      console.warn('[publish] server crop failed, using raw uploads', err)
    }
    onProgress?.('crop', 1)
  }

  return [{
    id: contentId,
    type: 'photo',
    mediaUrl: finalUrls[0] || '',
    mediaUrls: finalUrls,
    thumbnailUrl: finalUrls[0] || '',
    sourceUrl: rawUrls[0] || '',
    sourceUrls: rawUrls,
    caption: '',
    aspect,
    status: 'ready',
    createdAt: Timestamp.now(),
    views: 0,
    saves: 0,
    publishAt: null,
  }]
}
