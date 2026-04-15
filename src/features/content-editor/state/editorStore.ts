import { create } from 'zustand'
import type { Adjustments, AspectRatio, Clip, ClipSpeed, EditorView, TextOverlay } from './types'
import { DEFAULT_ADJUSTMENTS } from './types'
import { extractFilmstrip, probePhoto, probeVideo } from '../lib/thumbnails'

const makeId = () => Math.random().toString(36).slice(2, 10)

/**
 * Detect whether a File is a video. Some mobile uploads (especially iOS
 * screen recordings or files reshared through messaging apps) come through
 * with empty or non-standard MIME types — fall back to the file extension.
 */
function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video')) return true
  if (/\.(mp4|mov|m4v|webm|mkv|avi|3gp|3gpp|qt|hevc)$/i.test(file.name)) return true
  return false
}

interface EditorState {
  clips: Clip[]
  selectedClipId: string | null
  aspect: AspectRatio
  overlays: TextOverlay[]
  view: EditorView

  /** Playhead position in the SELECTED clip (source seconds). Published by PreviewCanvas. */
  currentTime: number

  /** Composed timeline position (after trim + speed). Drives the timeline scroll. */
  composedTime: number

  /** Number of imports currently in flight; drives loading indicators. */
  importingCount: number

  /**
   * Master playback flag. The raf loop in PreviewCanvas advances
   * `composedTime` by wall-clock delta while this is true — a single clock
   * that drives both photos and videos. Video elements sync to the clock,
   * not the other way around, so cross-clip transitions never hiccup.
   */
  playing: boolean
  setPlaying: (v: boolean) => void

  /**
   * Direct DOM ref slots for the Timeline. PreviewCanvas writes the strip's
   * transform directly on every video timeupdate, bypassing React entirely.
   *
   * - timelineWrapperEl: outer overflow:hidden container, used to measure width
   * - timelineStripEl:   inner flex strip whose transform we update each tick
   */
  timelineWrapperEl: HTMLDivElement | null
  timelineStripEl: HTMLDivElement | null
  setTimelineEls: (wrapper: HTMLDivElement | null, strip: HTMLDivElement | null) => void

  importFiles: (files: FileList | File[]) => Promise<void>
  selectClip: (id: string | null) => void
  removeClip: (id: string) => void
  reorderClips: (ids: string[]) => void
  setTrim: (id: string, trimIn: number, trimOut: number) => void
  setSpeed: (id: string, speed: ClipSpeed) => void
  splitClipAtCurrent: () => void
  replaceClip: (id: string, file: File) => Promise<void>

  setAspect: (aspect: AspectRatio) => void

  /** Per-clip adjustment setters — operate on the SELECTED clip. */
  setClipAdjustment: (clipId: string, key: keyof Adjustments, value: number) => void
  resetClipAdjustments: (clipId: string) => void

  addOverlay: (overlay: Omit<TextOverlay, 'id'>) => string
  /** Smart add: defaults position to playhead, duration to 3s clamped to total. */
  addOverlayAtPlayhead: () => string
  updateOverlay: (id: string, patch: Partial<TextOverlay>) => void
  removeOverlay: (id: string) => void

  setCurrentTime: (t: number) => void
  setComposedTime: (t: number) => void
  setView: (view: EditorView) => void
  reset: () => void

  // Derived
  totalDuration: () => number
}

function startFilmstripExtraction(
  clipId: string,
  file: File,
  set: (fn: (state: EditorState) => Partial<EditorState>) => void,
) {
  if (!isVideoFile(file)) return
  extractFilmstrip(file)
    .then((frames) => {
      set((state) => ({
        clips: state.clips.map((c) =>
          c.id === clipId ? { ...c, frames, pending: false } : c,
        ),
      }))
    })
    .catch((err) => {
      console.warn('filmstrip extraction failed', err)
      set((state) => ({
        clips: state.clips.map((c) => (c.id === clipId ? { ...c, pending: false } : c)),
      }))
    })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  clips: [],
  selectedClipId: null,
  aspect: '9:16',
  overlays: [],
  view: null,
  currentTime: 0,
  composedTime: 0,
  importingCount: 0,
  playing: false,
  setPlaying: (v) => set({ playing: v }),
  timelineWrapperEl: null,
  timelineStripEl: null,
  setTimelineEls: (wrapper, strip) => set({ timelineWrapperEl: wrapper, timelineStripEl: strip }),

  importFiles: async (files) => {
    const arr = Array.from(files)
    set((state) => ({ importingCount: state.importingCount + arr.length }))

    const settled = await Promise.allSettled(
      arr.map(async (file) => {
        const isVideo = isVideoFile(file)
        const probed = isVideo ? await probeVideo(file) : await probePhoto(file)
        const clip: Clip = {
          id: makeId(),
          file,
          sourceUrl: URL.createObjectURL(file),
          thumbnailUrl: probed.thumbnailUrl,
          frames: isVideo ? [] : [probed.thumbnailUrl],
          nativeAspect: probed.nativeAspect,
          type: isVideo ? 'video' : 'photo',
          // For photos, `duration` is the MAX extensible length (10s from
          // probePhoto). The visible length defaults to 3s; user can drag
          // the right trim handle to extend up to `duration`.
          duration: probed.duration,
          trimIn: 0,
          trimOut: isVideo ? probed.duration : 3,
          speed: 1,
          adjustments: { ...DEFAULT_ADJUSTMENTS },
          pending: isVideo,
        }
        return clip
      }),
    )
    const next: Clip[] = []
    for (const r of settled) {
      if (r.status === 'fulfilled') next.push(r.value)
      else console.warn('clip import failed', r.reason)
    }

    set((state) => {
      const clips = [...state.clips, ...next]
      return {
        clips,
        selectedClipId: state.selectedClipId ?? clips[0]?.id ?? null,
        importingCount: Math.max(0, state.importingCount - arr.length),
      }
    })

    for (const clip of next) {
      if (clip.type === 'video') {
        startFilmstripExtraction(clip.id, clip.file, set)
      }
    }
  },

  selectClip: (id) => set({ selectedClipId: id }),

  removeClip: (id) => set((state) => {
    const clip = state.clips.find((c) => c.id === id)
    if (clip) {
      URL.revokeObjectURL(clip.sourceUrl)
      URL.revokeObjectURL(clip.thumbnailUrl)
      for (const f of clip.frames) URL.revokeObjectURL(f)
    }
    const clips = state.clips.filter((c) => c.id !== id)
    const selectedClipId = state.selectedClipId === id ? (clips[0]?.id ?? null) : state.selectedClipId
    return { clips, selectedClipId }
  }),

  reorderClips: (ids) => set((state) => {
    const byId = new Map(state.clips.map((c) => [c.id, c]))
    const next = ids.map((id) => byId.get(id)).filter(Boolean) as Clip[]
    for (const c of state.clips) if (!ids.includes(c.id)) next.push(c)
    return { clips: next }
  }),

  setTrim: (id, trimIn, trimOut) => set((state) => ({
    clips: state.clips.map((c) =>
      c.id === id
        ? { ...c, trimIn: Math.max(0, Math.min(trimIn, c.duration)), trimOut: Math.max(trimIn, Math.min(trimOut, c.duration)) }
        : c,
    ),
  })),

  setSpeed: (id, speed) => set((state) => ({
    clips: state.clips.map((c) => (c.id === id ? { ...c, speed } : c)),
  })),

  replaceClip: async (id, file) => {
    set((state) => ({ importingCount: state.importingCount + 1 }))
    try {
      const isVideo = isVideoFile(file)
      const probed = isVideo ? await probeVideo(file) : await probePhoto(file)
      set((state) => {
        const clips = state.clips.map((c) => {
          if (c.id !== id) return c
          URL.revokeObjectURL(c.sourceUrl)
          URL.revokeObjectURL(c.thumbnailUrl)
          for (const f of c.frames) URL.revokeObjectURL(f)
          return {
            ...c,
            file,
            sourceUrl: URL.createObjectURL(file),
            thumbnailUrl: probed.thumbnailUrl,
            frames: isVideo ? [] : [probed.thumbnailUrl],
            nativeAspect: probed.nativeAspect,
            type: (isVideo ? 'video' : 'photo') as Clip['type'],
            duration: probed.duration,
            trimIn: 0,
            trimOut: probed.duration,
            speed: c.speed,
            adjustments: c.adjustments,
            pending: isVideo,
          }
        })
        return { clips }
      })
      if (isVideo) startFilmstripExtraction(id, file, set)
    } finally {
      set((state) => ({ importingCount: Math.max(0, state.importingCount - 1) }))
    }
  },

  splitClipAtCurrent: () => set((state) => {
    const selected = state.clips.find((c) => c.id === state.selectedClipId)
    if (!selected || selected.type !== 'video') return state
    const t = state.currentTime
    if (t <= selected.trimIn + 0.1 || t >= selected.trimOut - 0.1) return state

    const left: Clip = { ...selected, trimOut: t }
    const right: Clip = {
      ...selected,
      id: makeId(),
      trimIn: t,
      trimOut: selected.trimOut,
      adjustments: { ...selected.adjustments },
    }
    const idx = state.clips.findIndex((c) => c.id === selected.id)
    const next = [...state.clips]
    next.splice(idx, 1, left, right)
    return { clips: next, selectedClipId: left.id }
  }),

  setAspect: (aspect) => set({ aspect }),

  setClipAdjustment: (clipId, key, value) => set((state) => ({
    clips: state.clips.map((c) =>
      c.id === clipId
        ? { ...c, adjustments: { ...c.adjustments, [key]: value } }
        : c,
    ),
  })),

  resetClipAdjustments: (clipId) => set((state) => ({
    clips: state.clips.map((c) =>
      c.id === clipId ? { ...c, adjustments: { ...DEFAULT_ADJUSTMENTS } } : c,
    ),
  })),

  addOverlay: (overlay) => {
    const id = makeId()
    set((state) => ({ overlays: [...state.overlays, { ...overlay, id }] }))
    return id
  },

  addOverlayAtPlayhead: () => {
    const state = get()
    const id = makeId()
    const total = state.totalDuration()
    const start = Math.max(0, Math.min(state.composedTime, Math.max(0, total - 0.5)))
    const end = Math.min(total || start + 3, start + 3)
    // Stack new overlays vertically below existing ones so they don't pile
    // on top of each other. Wraps back to top when reaching the bottom.
    const baseY = 0.5
    const offsetCount = state.overlays.length
    const y = ((baseY + offsetCount * 0.1) % 0.85) + 0.08
    set((state) => ({
      overlays: [
        ...state.overlays,
        {
          id,
          text: 'Your text',
          font: 'outfit',
          color: '#FFFFFF',
          size: 16,
          position: { x: 0.5, y },
          start,
          end,
          maxWidthPercent: 80,
        },
      ],
    }))
    return id
  },

  updateOverlay: (id, patch) => set((state) => ({
    overlays: state.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  })),

  removeOverlay: (id) => set((state) => ({
    overlays: state.overlays.filter((o) => o.id !== id),
  })),

  setCurrentTime: (t) => set({ currentTime: t }),
  setComposedTime: (t) => set({ composedTime: t }),

  setView: (view) => set({ view }),

  reset: () => {
    const { clips } = get()
    for (const c of clips) {
      URL.revokeObjectURL(c.sourceUrl)
      URL.revokeObjectURL(c.thumbnailUrl)
      for (const f of c.frames) URL.revokeObjectURL(f)
    }
    set({
      clips: [],
      selectedClipId: null,
      aspect: '9:16',
      overlays: [],
      view: null,
      currentTime: 0,
      composedTime: 0,
      importingCount: 0,
      playing: false,
    })
  },

  totalDuration: () => {
    const { clips } = get()
    return clips.reduce((sum, c) => sum + (c.trimOut - c.trimIn) / c.speed, 0)
  },
}))
