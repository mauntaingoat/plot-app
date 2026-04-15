import type { TextOverlay, AspectRatio } from '@/features/content-editor/state/types'

export type CreateAspect = '9:16' | '1:1' | '4:5' | 'original'

export interface CarouselPhoto {
  id: string
  file: File
  previewUrl: string
  width: number
  height: number
  aspect: number
}

export interface CarouselDraft {
  id: string
  kind: 'carousel'
  photos: CarouselPhoto[]
  aspect: CreateAspect
}

/**
 * Video drafts flow through the existing editor store and renderComposition
 * pipeline. The Video Reel content kind drives the editor in simple mode
 * (Frame + Trim + Add clips only); on Continue we snapshot the editor state
 * into this shape.
 */
export interface EditorDraftKind {
  id: string
  kind: 'editor'
  clipFiles: File[]
  clipMeta: {
    trimIn: number
    trimOut: number
    speed: number
    adjustments: { brightness: number; contrast: number; saturation: number }
  }[]
  overlays: TextOverlay[]
  aspect: AspectRatio
  thumbnailUrl: string
}

export type ContentDraft = CarouselDraft | EditorDraftKind
