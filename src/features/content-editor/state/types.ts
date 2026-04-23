/**
 * Aspect ratio for the preview frame.
 *  - 'original' uses the source media's native aspect ratio (was 'free').
 */
export type AspectRatio = '9:16' | '16:9' | '1:1' | '3:4' | '4:3' | 'original'

export type ClipSpeed = 0.5 | 1 | 1.5 | 2

export interface Clip {
  id: string
  file: File
  sourceUrl: string         // object URL for <video>/<img>
  thumbnailUrl: string      // single representative frame (used for ambient glow)
  /**
   * Multiple frames extracted across the clip duration — used to render the
   * filmstrip on the timeline. Photos have a single frame. Empty while a
   * background extraction job is still running (placeholder state).
   */
  frames: string[]
  /** Native source aspect ratio (videoWidth/videoHeight) for 'original' mode. */
  nativeAspect: number
  type: 'video' | 'photo'
  duration: number          // seconds (photos default to 3)
  trimIn: number            // seconds, 0..duration
  trimOut: number           // seconds, trimIn..duration
  speed: ClipSpeed
  /** Per-clip color adjustments. Defaults to all zero. */
  adjustments: Adjustments
  /** True while frames are still being extracted in the background. */
  pending?: boolean
  /**
   * User-chosen display thumbnail, captured from the preview via the
   * "Thumbnail" overlay button. When set, this is what shows in the
   * draft scroller, content library, and on the map pin — but the
   * timeline (thumbnailUrl / frames) is NOT affected, so the editor
   * filmstrip still reflects the source video, not the chosen poster.
   */
  customThumbnailUrl?: string
}

/** Font key — maps to a Google Font in the FONT_OPTIONS table. */
export type FontKey =
  | 'outfit'
  | 'dm-serif'
  | 'playfair'
  | 'caveat'
  | 'pacifico'
  | 'bebas'
  | 'anton'
  | 'permanent-marker'
  | 'lobster'
  | 'bungee'
  | 'special-elite'
  | 'press-start'

export interface FontOption {
  key: FontKey
  label: string
  family: string          // CSS font-family value
  googleFontName: string  // for the Google Fonts API URL
  weight: number
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'outfit',           label: 'Outfit',     family: 'Outfit, sans-serif',          googleFontName: 'Outfit:wght@700',           weight: 700 },
  { key: 'dm-serif',         label: 'Editorial',  family: '"DM Serif Display", serif',   googleFontName: 'DM+Serif+Display',          weight: 400 },
  { key: 'playfair',         label: 'Playfair',   family: '"Playfair Display", serif',   googleFontName: 'Playfair+Display:wght@700', weight: 700 },
  { key: 'caveat',           label: 'Handwrite',  family: 'Caveat, cursive',             googleFontName: 'Caveat:wght@700',           weight: 700 },
  { key: 'pacifico',         label: 'Pacifico',   family: 'Pacifico, cursive',           googleFontName: 'Pacifico',                  weight: 400 },
  { key: 'bebas',            label: 'Bebas',      family: '"Bebas Neue", sans-serif',    googleFontName: 'Bebas+Neue',                weight: 400 },
  { key: 'anton',            label: 'Anton',      family: 'Anton, sans-serif',           googleFontName: 'Anton',                     weight: 400 },
  { key: 'permanent-marker', label: 'Marker',     family: '"Permanent Marker", cursive', googleFontName: 'Permanent+Marker',          weight: 400 },
  { key: 'lobster',          label: 'Lobster',    family: 'Lobster, cursive',            googleFontName: 'Lobster',                   weight: 400 },
  { key: 'bungee',           label: 'Bungee',     family: 'Bungee, sans-serif',          googleFontName: 'Bungee',                    weight: 400 },
  { key: 'special-elite',    label: 'Typewriter', family: '"Special Elite", monospace',  googleFontName: 'Special+Elite',             weight: 400 },
  { key: 'press-start',      label: 'Pixel',      family: '"Press Start 2P", monospace', googleFontName: 'Press+Start+2P',            weight: 400 },
]

/** 24 text size options — finer at the bottom, coarser at the top. */
export const TEXT_SIZES: number[] = [
  8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144, 160, 192, 224,
]

export interface TextOverlay {
  id: string
  text: string
  font: FontKey
  color: string
  size: number            // px
  position: { x: number; y: number } // 0..1 normalized
  start: number           // seconds on composed timeline
  end: number             // seconds on composed timeline
  /**
   * Max-width as a percentage of the preview width. Controls how much
   * the text wraps before going off-screen. 40 (very narrow) → 95 (almost
   * full width). Default 80.
   */
  maxWidthPercent: number
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
 *  - null       : main toolbar
 *  - 'crop'     : aspect chip strip
 *  - 'speed'    : per-clip speed chip strip (clip sub-tool)
 *  - 'text'     : inline preview text editor + text style strip
 *  - 'adjust'   : brightness/contrast/saturation slider strip
 *  - 'audio'    : voiceover stub strip (placeholder until V2)
 *  - 'filter'   : LUT filter scroller (placeholder until V2)
 *
 * Trim is no longer a "view" — handles are always visible on the selected
 * clip. Split / Replace / Delete are one-shot actions fired from the clip
 * sub-toolbar without changing view.
 */
export type EditorView = null | 'crop' | 'speed' | 'text' | 'adjust' | 'audio' | 'filter'

/** Legacy alias for backward-compat during migration. */
export type EditorTool = EditorView

export const ASPECT_OPTIONS: { id: AspectRatio; label: string; ratio: number | null; recommended?: boolean }[] = [
  { id: 'original', label: 'Original', ratio: null },
  { id: '9:16',     label: '9:16',     ratio: 9 / 16, recommended: true },
  { id: '1:1',      label: '1:1',      ratio: 1 },
  { id: '4:3',      label: '4:3',      ratio: 4 / 3 },
  { id: '3:4',      label: '3:4',      ratio: 3 / 4 },
  { id: '16:9',     label: '16:9',     ratio: 16 / 9 },
]
