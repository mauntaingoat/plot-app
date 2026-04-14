export type AspectRatio = '9:16' | '16:9' | '1:1' | '3:4' | '4:3' | 'free'

export type ClipSpeed = 0.5 | 1 | 1.5 | 2

export interface Clip {
  id: string
  file: File
  sourceUrl: string       // object URL for <video>/<img>
  thumbnailUrl: string    // first-frame / photo thumbnail
  type: 'video' | 'photo'
  duration: number        // seconds (photos default to 3)
  trimIn: number          // seconds, 0..duration
  trimOut: number         // seconds, trimIn..duration
  speed: ClipSpeed
}

export interface TextOverlay {
  id: string
  text: string
  font: 'display' | 'mono'
  color: string
  size: number            // px
  position: { x: number; y: number } // 0..1 normalized
  start: number           // seconds on composed timeline
  end: number             // seconds on composed timeline
}

export interface Adjustments {
  brightness: number      // -100..100
  contrast: number        // -100..100
  saturation: number      // -100..100
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
}

/**
 * Navigation state for the bottom toolbar / inline strip.
 *  - null       : main toolbar [Edit, Text, Adjust]
 *  - 'edit'     : Edit sub-group [Trim, Split, Delete, Speed, Crop]
 *  - 'trim'     : timeline trim mode (handles render inline on track)
 *  - 'crop'     : aspect chip strip above toolbar
 *  - 'speed'    : per-clip speed chip strip above toolbar
 *  - 'text'     : inline preview text editor
 *  - 'adjust'   : brightness/contrast/saturation slider strip
 *
 * 'split' and 'delete' are one-shot actions; after firing they
 * drop back to 'edit'.
 */
export type EditorView = null | 'edit' | 'trim' | 'crop' | 'speed' | 'text' | 'adjust'

/** Legacy alias for backward-compat during migration. */
export type EditorTool = EditorView

export const ASPECT_OPTIONS: { id: AspectRatio; label: string; ratio: number | null }[] = [
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '1:1',  label: '1:1',  ratio: 1 },
  { id: '4:3',  label: '4:3',  ratio: 4 / 3 },
  { id: '3:4',  label: '3:4',  ratio: 3 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: 'free', label: 'Free', ratio: null },
]
