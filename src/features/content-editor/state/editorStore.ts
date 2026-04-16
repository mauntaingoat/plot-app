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

/**
 * Undoable snapshot of the editor. Only fields that users can edit are
 * tracked — playback state, DOM refs, importing counters, etc. are
 * intentionally excluded so undo doesn't jolt the preview.
 */
interface EditorSnapshot {
  clips: Clip[]
  selectedClipId: string | null
  aspect: AspectRatio
  overlays: TextOverlay[]
}

interface EditorState {
  clips: Clip[]
  selectedClipId: string | null
  aspect: AspectRatio
  overlays: TextOverlay[]
  view: EditorView

  /** Undo/redo history. Past contains older snapshots (most recent last),
   *  future contains redo-able snapshots (next redo first). */
  past: EditorSnapshot[]
  future: EditorSnapshot[]
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  /** Capture a history snapshot NOW. Call this at the START of a
   *  continuous edit (trim drag, slider drag, overlay drag) so undo
   *  rolls the whole drag back as a single step. Discrete one-shot
   *  mutations push history internally and don't need this. */
  markHistory: () => void

  /** Allow overriding a clip's thumbnail (e.g. from a captured frame). */
  setClipThumbnail: (clipId: string, url: string) => void

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

/**
 * Schedule filmstrip extraction lazily. The clip appears in the timeline
 * immediately with its single probe thumbnail (stretched across the tile).
 * The real filmstrip fills in afterwards, scheduled via
 * `requestIdleCallback` so it doesn't block the main thread or interfere
 * with user interaction (taps, drags, playback) right after import.
 *
 * Long-clip imports (>2 minutes) skip filmstrip extraction entirely —
 * the tile just uses the single thumbnail with divider lines. Extraction
 * for very long clips is too slow to be worth the wait.
 */
function startFilmstripExtraction(
  clipId: string,
  file: File,
  duration: number,
  set: (fn: (state: EditorState) => Partial<EditorState>) => void,
) {
  if (!isVideoFile(file)) return

  // Skip extraction for very long clips — not worth the wait. The clip
  // tile will render with the single-thumbnail fallback.
  if (duration > 120) {
    set((state) => ({
      clips: state.clips.map((c) => (c.id === clipId ? { ...c, pending: false } : c)),
    }))
    return
  }

  const run = () => {
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

  // `requestIdleCallback` lets the browser run extraction when it has
  // nothing better to do. Falls back to setTimeout on Safari.
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  }).requestIdleCallback
  if (typeof ric === 'function') ric(run, { timeout: 2000 })
  else setTimeout(run, 120)
}

/**
 * Captures the current undoable state into a snapshot, pushes it to the
 * history stack, and clears any redo future. Called at the START of any
 * mutation that should be undoable.
 *
 * History is capped at 50 entries to keep memory predictable; older
 * entries are dropped from the front.
 */
const HISTORY_LIMIT = 50
function pushHistory(set: (fn: (state: EditorState) => Partial<EditorState>) => void) {
  set((state) => {
    const snapshot: EditorSnapshot = {
      clips: state.clips,
      selectedClipId: state.selectedClipId,
      aspect: state.aspect,
      overlays: state.overlays,
    }
    const past = [...state.past, snapshot].slice(-HISTORY_LIMIT)
    return { past, future: [] }
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
  past: [],
  future: [],
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  undo: () => set((state) => {
    if (state.past.length === 0) return {}
    const past = [...state.past]
    const prev = past.pop()!
    const current: EditorSnapshot = {
      clips: state.clips,
      selectedClipId: state.selectedClipId,
      aspect: state.aspect,
      overlays: state.overlays,
    }
    return {
      past,
      future: [current, ...state.future].slice(0, HISTORY_LIMIT),
      clips: prev.clips,
      selectedClipId: prev.selectedClipId,
      aspect: prev.aspect,
      overlays: prev.overlays,
    }
  }),
  redo: () => set((state) => {
    if (state.future.length === 0) return {}
    const [next, ...future] = state.future
    const current: EditorSnapshot = {
      clips: state.clips,
      selectedClipId: state.selectedClipId,
      aspect: state.aspect,
      overlays: state.overlays,
    }
    return {
      past: [...state.past, current].slice(-HISTORY_LIMIT),
      future,
      clips: next.clips,
      selectedClipId: next.selectedClipId,
      aspect: next.aspect,
      overlays: next.overlays,
    }
  }),
  markHistory: () => pushHistory(set),
  /**
   * Store the user-chosen display thumbnail for a clip. This writes to
   * `customThumbnailUrl` (NOT `thumbnailUrl`) so the timeline filmstrip
   * and video poster stay pinned to the source video; only the draft
   * scroller / content library / map pin read the custom value.
   */
  setClipThumbnail: (clipId, url) => {
    pushHistory(set)
    set((state) => ({
      clips: state.clips.map((c) => (c.id === clipId ? { ...c, customThumbnailUrl: url } : c)),
    }))
  },
  timelineWrapperEl: null,
  timelineStripEl: null,
  setTimelineEls: (wrapper, strip) => set({ timelineWrapperEl: wrapper, timelineStripEl: strip }),

  importFiles: async (files) => {
    const arr = Array.from(files)
    pushHistory(set)
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
        startFilmstripExtraction(clip.id, clip.file, clip.duration, set)
      }
    }
  },

  selectClip: (id) => set({ selectedClipId: id }),

  removeClip: (id) => {
    pushHistory(set)
    set((state) => {
    const clip = state.clips.find((c) => c.id === id)
    if (clip) {
      // Don't revoke any blob URLs — undo/redo snapshots reference old
      // clips by object identity and their URLs must stay alive for the
      // preview/timeline to render after an undo.
    }
    const clips = state.clips.filter((c) => c.id !== id)
    const selectedClipId = state.selectedClipId === id ? (clips[0]?.id ?? null) : state.selectedClipId
    return { clips, selectedClipId }
    })
  },

  reorderClips: (ids) => {
    pushHistory(set)
    set((state) => {
    const byId = new Map(state.clips.map((c) => [c.id, c]))
    const next = ids.map((id) => byId.get(id)).filter(Boolean) as Clip[]
    for (const c of state.clips) if (!ids.includes(c.id)) next.push(c)
    return { clips: next }
    })
  },

  setTrim: (id, trimIn, trimOut) => set((state) => ({
    clips: state.clips.map((c) =>
      c.id === id
        ? { ...c, trimIn: Math.max(0, Math.min(trimIn, c.duration)), trimOut: Math.max(trimIn, Math.min(trimOut, c.duration)) }
        : c,
    ),
  })),

  setSpeed: (id, speed) => {
    pushHistory(set)
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, speed } : c)),
    }))
  },

  replaceClip: async (id, file) => {
    pushHistory(set)
    set((state) => ({ importingCount: state.importingCount + 1 }))
    try {
      const isVideo = isVideoFile(file)
      const probed = isVideo ? await probeVideo(file) : await probePhoto(file)
      set((state) => {
        const clips = state.clips.map((c) => {
          if (c.id !== id) return c
          // Don't revoke — undo/redo snapshots may reference old URLs.
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
      if (isVideo) startFilmstripExtraction(id, file, probed.duration, set)
    } finally {
      set((state) => ({ importingCount: Math.max(0, state.importingCount - 1) }))
    }
  },

  splitClipAtCurrent: () => {
    pushHistory(set)
    return set((state) => {
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
    })
  },

  setAspect: (aspect) => {
    pushHistory(set)
    set({ aspect })
  },

  setClipAdjustment: (clipId, key, value) => set((state) => ({
    clips: state.clips.map((c) =>
      c.id === clipId
        ? { ...c, adjustments: { ...c.adjustments, [key]: value } }
        : c,
    ),
  })),

  resetClipAdjustments: (clipId) => {
    pushHistory(set)
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === clipId ? { ...c, adjustments: { ...DEFAULT_ADJUSTMENTS } } : c,
      ),
    }))
  },

  addOverlay: (overlay) => {
    pushHistory(set)
    const id = makeId()
    set((state) => ({ overlays: [...state.overlays, { ...overlay, id }] }))
    return id
  },

  addOverlayAtPlayhead: () => {
    pushHistory(set)
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

  removeOverlay: (id) => {
    pushHistory(set)
    set((state) => ({
      overlays: state.overlays.filter((o) => o.id !== id),
    }))
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setComposedTime: (t) => set({ composedTime: t }),

  setView: (view) => set({ view }),

  reset: () => {
    const { clips } = get()
    // Intentionally do NOT revoke any blob URLs — they back the undo
    // history, draft thumbnails, and may still be referenced from the
    // Publish step scroller. The GC collects them after navigation.
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
      past: [],
      future: [],
    })
  },

  totalDuration: () => {
    const { clips } = get()
    return clips.reduce((sum, c) => sum + (c.trimOut - c.trimIn) / c.speed, 0)
  },
}))
