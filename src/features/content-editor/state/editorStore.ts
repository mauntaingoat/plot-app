import { create } from 'zustand'
import type { Adjustments, AspectRatio, Clip, ClipSpeed, EditorView, TextOverlay } from './types'
import { DEFAULT_ADJUSTMENTS } from './types'
import { probePhoto, probeVideo } from '../lib/thumbnails'

const makeId = () => Math.random().toString(36).slice(2, 10)

interface EditorState {
  clips: Clip[]
  selectedClipId: string | null
  aspect: AspectRatio
  adjustments: Adjustments
  overlays: TextOverlay[]
  view: EditorView

  /** Playhead position in the SELECTED clip (source seconds). Published by PreviewCanvas. */
  currentTime: number

  importFiles: (files: FileList | File[]) => Promise<void>
  selectClip: (id: string | null) => void
  removeClip: (id: string) => void
  reorderClips: (ids: string[]) => void
  setTrim: (id: string, trimIn: number, trimOut: number) => void
  setSpeed: (id: string, speed: ClipSpeed) => void
  splitClipAtCurrent: () => void

  setAspect: (aspect: AspectRatio) => void
  setAdjustment: (key: keyof Adjustments, value: number) => void
  resetAdjustments: () => void

  addOverlay: (overlay: Omit<TextOverlay, 'id'>) => string
  updateOverlay: (id: string, patch: Partial<TextOverlay>) => void
  removeOverlay: (id: string) => void

  setCurrentTime: (t: number) => void
  setView: (view: EditorView) => void
  reset: () => void

  // Derived
  totalDuration: () => number
}

export const useEditorStore = create<EditorState>((set, get) => ({
  clips: [],
  selectedClipId: null,
  aspect: '9:16',
  adjustments: DEFAULT_ADJUSTMENTS,
  overlays: [],
  view: null,
  currentTime: 0,

  importFiles: async (files) => {
    const arr = Array.from(files)
    const next: Clip[] = []
    for (const file of arr) {
      try {
        const isVideo = file.type.startsWith('video')
        const probed = isVideo ? await probeVideo(file) : probePhoto(file)
        const clip: Clip = {
          id: makeId(),
          file,
          sourceUrl: URL.createObjectURL(file),
          thumbnailUrl: probed.thumbnailUrl,
          type: isVideo ? 'video' : 'photo',
          duration: probed.duration,
          trimIn: 0,
          trimOut: probed.duration,
          speed: 1,
        }
        next.push(clip)
      } catch (err) {
        console.warn('clip import failed', err)
      }
    }
    set((state) => {
      const clips = [...state.clips, ...next]
      return {
        clips,
        selectedClipId: state.selectedClipId ?? clips[0]?.id ?? null,
      }
    })
  },

  selectClip: (id) => set({ selectedClipId: id }),

  removeClip: (id) => set((state) => {
    const clip = state.clips.find((c) => c.id === id)
    if (clip) {
      URL.revokeObjectURL(clip.sourceUrl)
      URL.revokeObjectURL(clip.thumbnailUrl)
    }
    const clips = state.clips.filter((c) => c.id !== id)
    const selectedClipId = state.selectedClipId === id ? (clips[0]?.id ?? null) : state.selectedClipId
    return { clips, selectedClipId }
  }),

  reorderClips: (ids) => set((state) => {
    const byId = new Map(state.clips.map((c) => [c.id, c]))
    const next = ids.map((id) => byId.get(id)).filter(Boolean) as Clip[]
    // Append any missing to the end (safety)
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

  splitClipAtCurrent: () => set((state) => {
    const selected = state.clips.find((c) => c.id === state.selectedClipId)
    if (!selected || selected.type !== 'video') return state
    const t = state.currentTime
    // Only split if playhead is strictly inside the trimmed range
    if (t <= selected.trimIn + 0.1 || t >= selected.trimOut - 0.1) return state

    const left: Clip = { ...selected, trimOut: t }
    const right: Clip = {
      ...selected,
      id: Math.random().toString(36).slice(2, 10),
      trimIn: t,
      trimOut: selected.trimOut,
    }
    const idx = state.clips.findIndex((c) => c.id === selected.id)
    const next = [...state.clips]
    next.splice(idx, 1, left, right)
    return { clips: next, selectedClipId: left.id }
  }),

  setAspect: (aspect) => set({ aspect }),

  setAdjustment: (key, value) => set((state) => ({
    adjustments: { ...state.adjustments, [key]: value },
  })),

  resetAdjustments: () => set({ adjustments: DEFAULT_ADJUSTMENTS }),

  addOverlay: (overlay) => {
    const id = makeId()
    set((state) => ({ overlays: [...state.overlays, { ...overlay, id }] }))
    return id
  },

  updateOverlay: (id, patch) => set((state) => ({
    overlays: state.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  })),

  removeOverlay: (id) => set((state) => ({
    overlays: state.overlays.filter((o) => o.id !== id),
  })),

  setCurrentTime: (t) => set({ currentTime: t }),

  setView: (view) => set({ view }),

  reset: () => {
    const { clips } = get()
    for (const c of clips) {
      URL.revokeObjectURL(c.sourceUrl)
      URL.revokeObjectURL(c.thumbnailUrl)
    }
    set({
      clips: [],
      selectedClipId: null,
      aspect: '9:16',
      adjustments: DEFAULT_ADJUSTMENTS,
      overlays: [],
      view: null,
      currentTime: 0,
    })
  },

  totalDuration: () => {
    const { clips } = get()
    return clips.reduce((sum, c) => sum + (c.trimOut - c.trimIn) / c.speed, 0)
  },
}))
