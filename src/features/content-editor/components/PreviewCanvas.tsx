import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Image as ImageIcon, Film, Loader2 } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import { ASPECT_OPTIONS, FONT_OPTIONS } from '../state/types'

const TIMEUPDATE_THROTTLE_MS = 67 // ~15fps

/**
 * Floating preview. No surrounding card. Adapts height when a context
 * strip is active on mobile. Text editing happens INLINE on the preview
 * via contentEditable — the preview frame uses position: fixed during
 * edit so the keyboard popping up doesn't push it around.
 */
export function PreviewCanvas() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const aspect = useEditorStore((s) => s.aspect)
  const overlays = useEditorStore((s) => s.overlays)
  const updateOverlay = useEditorStore((s) => s.updateOverlay)
  const removeOverlay = useEditorStore((s) => s.removeOverlay)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const setComposedTime = useEditorStore((s) => s.setComposedTime)
  const importFiles = useEditorStore((s) => s.importFiles)
  const importingCount = useEditorStore((s) => s.importingCount)
  const view = useEditorStore((s) => s.view)
  const composedTime = useEditorStore((s) => s.composedTime)

  const selected = useMemo(() => clips.find((c) => c.id === selectedId) ?? clips[0], [clips, selectedId])

  const frameRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const lastTimeUpdate = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [, setLocalTick] = useState(0)
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const stripActive = view === 'adjust' || view === 'crop' || view === 'speed'
                   || view === 'audio' || view === 'filter' || view === 'text'

  // Compute composed time offset for the selected clip — used so the
  // playhead in the timeline stays in sync with playback.
  const composedClipStart = useMemo(() => {
    let acc = 0
    for (const c of clips) {
      if (c.id === selected?.id) return acc
      acc += (c.trimOut - c.trimIn) / c.speed
    }
    return acc
  }, [clips, selected?.id])

  /* ─── playback state ─── */
  useEffect(() => {
    setPlaying(false)
    setCurrentTime(selected?.trimIn ?? 0)
    setComposedTime(composedClipStart)
    const v = videoRef.current
    if (v && selected?.type === 'video') v.currentTime = selected.trimIn
  }, [selected?.id, selected?.trimIn, selected?.type, setCurrentTime, setComposedTime, composedClipStart])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    v.playbackRate = selected.speed
  }, [selected?.id, selected?.speed, selected?.type])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    const onTime = () => {
      const inClip = Math.max(0, v.currentTime - selected.trimIn)
      const composed = composedClipStart + inClip / selected.speed
      const PX = 28
      const state = useEditorStore.getState()
      const wrapper = state.timelineWrapperEl
      const strip = state.timelineStripEl
      // Always write the transform here — guaranteed-to-fire fallback
      // for the raf loop. Also runs on browsers where rAF is throttled.
      if (wrapper && strip) {
        const halfWidth = wrapper.clientWidth / 2
        strip.style.transform = `translateX(${halfWidth - composed * PX}px)`
      }

      // ─── React state path ─── throttled to ~15fps for the timecode chrome
      const now = performance.now()
      if (now - lastTimeUpdate.current < TIMEUPDATE_THROTTLE_MS) {
        if (v.currentTime >= selected.trimOut) {
          v.pause()
          v.currentTime = selected.trimIn
          setPlaying(false)
        }
        return
      }
      lastTimeUpdate.current = now
      setLocalTick((t) => t + 1)
      setCurrentTime(v.currentTime)
      setComposedTime(composed)
      if (v.currentTime >= selected.trimOut) {
        v.pause()
        v.currentTime = selected.trimIn
        setPlaying(false)
      }
    }
    v.addEventListener('timeupdate', onTime)
    return () => v.removeEventListener('timeupdate', onTime)
  }, [selected, setCurrentTime, setComposedTime, composedClipStart])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    if (v.paused) {
      if (v.currentTime >= selected.trimOut - 0.05) v.currentTime = selected.trimIn
      v.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  /**
   * Continuous requestAnimationFrame loop. Runs once on mount and ticks
   * forever (until unmount). Reads everything fresh from the DOM + store
   * each frame — no React deps, no closure issues. Smooths the strip
   * position during playback to 60fps.
   *
   * Uses querySelector for the video element instead of React's videoRef
   * so we don't depend on render-timing for the ref to be set.
   */
  useEffect(() => {
    let raf = 0
    const PX = 28

    const tick = () => {
      const v = document.querySelector<HTMLVideoElement>('.editor-stage video')
      if (v && !v.paused) {
        const state = useEditorStore.getState()
        const wrapper = state.timelineWrapperEl
        const strip = state.timelineStripEl
        // Recompute composed time inline from current state
        const sel = state.clips.find((c) => c.id === state.selectedClipId) ?? state.clips[0]
        if (sel && wrapper && strip) {
          // Walk clips to find the cumulative offset for the selected clip
          let acc = 0
          for (const c of state.clips) {
            if (c.id === sel.id) break
            acc += (c.trimOut - c.trimIn) / c.speed
          }
          const inClip = Math.max(0, v.currentTime - sel.trimIn)
          const composed = acc + inClip / sel.speed
          const halfWidth = wrapper.clientWidth / 2
          strip.style.transform = `translateX(${halfWidth - composed * PX}px)`
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ─── drop zone handlers ─── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return
    importFiles(e.dataTransfer.files)
  }, [importFiles])
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), [])
  const onFilesPicked = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    importFiles(e.target.files)
    e.target.value = ''
  }, [importFiles])

  // Per-clip CSS filter
  const filter = useMemo(() => {
    if (!selected) return undefined
    const a = selected.adjustments
    return `brightness(${1 + a.brightness / 100}) contrast(${1 + a.contrast / 100}) saturate(${1 + a.saturation / 100})`
  }, [selected])

  // Aspect ratio resolution
  const ratio = useMemo(() => {
    const opt = ASPECT_OPTIONS.find((o) => o.id === aspect)
    if (opt?.ratio != null) return opt.ratio
    return selected?.nativeAspect ?? 9 / 16
  }, [aspect, selected?.nativeAspect])

  // Time-bound visibility — only show overlays whose [start,end] contains composed time
  const visibleOverlays = useMemo(
    () => overlays.filter((o) => composedTime >= o.start && composedTime <= o.end),
    [overlays, composedTime],
  )

  const isEmpty = clips.length === 0
  const editingOverlay = overlays.find((o) => o.id === editingOverlayId) ?? null
  const isTextEditing = !!editingOverlay

  // Tap-outside-to-commit: close text editing if user taps outside the text node
  useEffect(() => {
    if (!isTextEditing) return
    const onDocPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-text-overlay]') || target.closest('[data-text-done]')) return
      setEditingOverlayId(null)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [isTextEditing])

  const previewHeight = stripActive ? 'min(36vh, 380px)' : 'min(58vh, 620px)'

  return (
    <div className="relative w-full flex items-center justify-center min-h-0">
      <div
        ref={frameRef}
        className="relative rounded-[16px] overflow-hidden"
        onDragOver={isEmpty ? onDragOver : undefined}
        onDragLeave={isEmpty ? onDragLeave : undefined}
        onDrop={isEmpty ? onDrop : undefined}
        style={{
          aspectRatio: String(ratio),
          height: previewHeight,
          minHeight: 200,
          width: 'auto',
          maxWidth: '100%',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.045)',
          transition:
            'aspect-ratio 0.32s cubic-bezier(0.32, 0.72, 0, 1), height 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {isEmpty ? (
          <button
            type="button"
            onClick={openFilePicker}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-4 cursor-pointer group"
            style={{
              background: dragOver
                ? 'linear-gradient(180deg, rgba(255,107,61,0.10) 0%, rgba(255,107,61,0.04) 100%)'
                : 'transparent',
              outline: dragOver ? '2px dashed rgba(255,107,61,0.55)' : 'none',
              outlineOffset: -10,
              transition: 'background 0.18s ease, outline-color 0.18s ease',
            }}
          >
            {importingCount > 0 ? (
              <>
                <Loader2 size={40} className="text-tangerine animate-spin" strokeWidth={2.2} />
                <p className="text-white/85 text-[14px] font-semibold">Importing…</p>
              </>
            ) : (
              <>
                <div className="relative w-[72px] h-[64px]">
                  <div className="absolute left-0 top-0 w-[52px] h-[52px] rounded-[14px] border-[1.5px] border-white/65 flex items-center justify-center bg-white/[0.02] rotate-[-6deg]">
                    <ImageIcon size={22} strokeWidth={1.7} className="text-white/85" />
                  </div>
                  <div className="absolute right-0 bottom-0 w-[52px] h-[52px] rounded-[14px] border-[1.5px] border-white/65 flex items-center justify-center bg-white/[0.04] rotate-[6deg]">
                    <Film size={22} strokeWidth={1.7} className="text-white/85" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-white text-[15px] font-semibold tracking-tight">
                    Drop photos and videos here
                  </p>
                  <p className="text-white/45 text-[11px]">or pick from your device</p>
                </div>
                <span className="mt-2 inline-flex items-center justify-center h-10 px-5 rounded-full bg-tangerine text-white text-[12px] font-bold shadow-[0_8px_24px_rgba(255,107,61,0.45),0_0_0_1px_rgba(255,107,61,0.55)] group-active:scale-[0.97] transition-transform">
                  Select from device
                </span>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={onFilesPicked}
            />
          </button>
        ) : selected?.type === 'video' ? (
          <video
            ref={videoRef}
            src={selected.sourceUrl}
            poster={selected.thumbnailUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter }}
            playsInline
            muted
            preload="auto"
            onClick={togglePlay}
          />
        ) : (
          <img
            src={selected?.sourceUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter }}
          />
        )}

        {/* Text overlays — visible only when composed time is inside their range */}
        {selected && visibleOverlays.map((o) => (
          <TextOverlayNode
            key={o.id}
            overlay={o}
            frameRef={frameRef}
            editing={editingOverlayId === o.id}
            onStartEdit={() => setEditingOverlayId(o.id)}
            onChange={(patch) => updateOverlay(o.id, patch)}
            onRemove={() => { removeOverlay(o.id); setEditingOverlayId(null) }}
          />
        ))}

        {/* Importing badge */}
        {importingCount > 0 && !isEmpty && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-sm">
            <Loader2 size={11} className="text-tangerine animate-spin" strokeWidth={2.4} />
            <span className="text-[10px] font-semibold text-white/85">Importing…</span>
          </div>
        )}
      </div>

      {/* Done pill — appears at top while text is being edited */}
      <AnimatePresence>
        {isTextEditing && (
          <motion.button
            data-text-done
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => setEditingOverlayId(null)}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 h-9 px-4 rounded-full bg-tangerine text-white text-[12px] font-bold shadow-[0_8px_24px_rgba(255,107,61,0.55)] cursor-pointer"
          >
            <Check size={13} strokeWidth={2.6} />
            Done
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────── TextOverlayNode — inline contentEditable ─────────── */

interface TextOverlayNodeProps {
  overlay: import('../state/types').TextOverlay
  frameRef: React.RefObject<HTMLDivElement | null>
  editing: boolean
  onStartEdit: () => void
  onChange: (patch: Partial<import('../state/types').TextOverlay>) => void
  onRemove: () => void
}

function TextOverlayNode({ overlay, frameRef, editing, onStartEdit, onChange, onRemove }: TextOverlayNodeProps) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; frameW: number; frameH: number } | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize textarea on text/size changes (no scrollbar, height matches content)
  useLayoutEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [overlay.text, overlay.size, overlay.font, overlay.maxWidthPercent])

  // Focus when entering edit mode
  useEffect(() => {
    if (!editing) return
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    // Place caret at end
    const len = ta.value.length
    ta.setSelectionRange(len, len)
  }, [editing])

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX: overlay.position.x, origY: overlay.position.y,
      frameW: rect.width, frameH: rect.height,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current
    if (!d) return
    const dx = (e.clientX - d.startX) / d.frameW
    const dy = (e.clientY - d.startY) / d.frameH
    const x = Math.max(0.02, Math.min(0.98, d.origX + dx))
    const y = Math.max(0.04, Math.min(0.96, d.origY + dy))
    onChange({ position: { x, y } })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current = null
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const fontDef = FONT_OPTIONS.find((f) => f.key === overlay.font) ?? FONT_OPTIONS[0]

  // Common text styles shared by the textarea (edit mode) and the display div (view mode)
  const textStyles: React.CSSProperties = {
    fontFamily: fontDef.family,
    fontSize: overlay.size,
    color: overlay.color,
    fontWeight: fontDef.weight,
    lineHeight: 1.15,
    textAlign: 'center',
    textShadow: '0 2px 14px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.85)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }

  return (
    <motion.div
      data-text-overlay
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.16 }}
      className="absolute select-none"
      style={{
        left: `${overlay.position.x * 100}%`,
        top: `${overlay.position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        touchAction: 'none',
        width: `${overlay.maxWidthPercent}%`,
        maxWidth: `${overlay.maxWidthPercent}%`,
      }}
    >
      <div className="relative">
        {editing ? (
          /* Textarea controlled by React — no caret bugs because React's
             native textarea handling preserves selection across re-renders. */
          <textarea
            ref={taRef}
            value={overlay.text}
            onChange={(e) => onChange({ text: e.target.value.slice(0, 200) })}
            rows={1}
            className="w-full bg-transparent border-none outline-none resize-none overflow-hidden px-1 py-0.5 rounded-md"
            style={{
              ...textStyles,
              caretColor: '#FF6B3D',
            }}
          />
        ) : (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onStartEdit}
            className="cursor-move px-1 py-0.5 rounded-md"
            style={textStyles}
          >
            {overlay.text || 'Your text'}
          </div>
        )}
        {!editing && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center text-white/90 hover:bg-tangerine cursor-pointer"
            data-text-overlay
          >
            <X size={10} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
