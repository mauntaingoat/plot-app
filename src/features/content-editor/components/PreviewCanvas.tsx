import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Image as ImageIcon, FilmStrip as Film, CircleNotch as Loader2, Crop } from '@phosphor-icons/react'
import { useEditorStore } from '../state/editorStore'
import { ASPECT_OPTIONS, FONT_OPTIONS } from '../state/types'

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
  const setView = useEditorStore((s) => s.setView)
  const composedTime = useEditorStore((s) => s.composedTime)

  const selected = useMemo(() => clips.find((c) => c.id === selectedId) ?? clips[0], [clips, selectedId])

  const setClipThumbnail = useEditorStore((s) => s.setClipThumbnail)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [thumbSavedAt, setThumbSavedAt] = useState(0)
  // Auto-clear the "Thumbnail saved" pill after 1.6s.
  useEffect(() => {
    if (thumbSavedAt === 0) return
    const id = setTimeout(() => setThumbSavedAt(0), 1600)
    return () => clearTimeout(id)
  }, [thumbSavedAt])

  /** Capture the current video frame via createImageBitmap, which grabs
   *  the decoded frame directly from the video decoder — works paused,
   *  no poster interference. Falls back to drawImage if unavailable. */
  const captureThumbnail = useCallback(async () => {
    if (!selected || selected.type !== 'video') return
    const v = videoRef.current
    if (!v || v.videoWidth === 0) return

    const clipId = selected.id
    const TARGET_W = 480
    const w = v.videoWidth
    const h = v.videoHeight
    const canvasH = Math.round((TARGET_W * h) / w)
    const canvas = document.createElement('canvas')
    canvas.width = TARGET_W
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    try {
      const bitmap = await createImageBitmap(v)
      ctx.drawImage(bitmap, 0, 0, TARGET_W, canvasH)
      bitmap.close()
    } catch {
      try { ctx.drawImage(v, 0, 0, TARGET_W, canvasH) } catch { return }
    }

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      if (dataUrl && dataUrl.length > 500) {
        setClipThumbnail(clipId, dataUrl)
        setThumbSavedAt(Date.now())
      }
    } catch { /* tainted canvas — silent fail */ }
  }, [selected, setClipThumbnail])

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

  /* ─── playback sync: when the selected clip changes, seek the video
     element to the correct offset inside the master clock so audio
     resumes from the right spot. If the master clock is playing, fire
     play() on the new element. */
  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return

    // React updates the src prop but browsers don't always reload; force it
    // so the new clip's metadata becomes available.
    v.load()

    const onLoaded = () => {
      const state = useEditorStore.getState()
      // Translate composed time → this clip's source currentTime
      const inClip = Math.max(0, state.composedTime - composedClipStart)
      const target = selected.trimIn + inClip * selected.speed
      v.currentTime = Math.min(Math.max(target, selected.trimIn), selected.trimOut)
      if (state.playing) {
        v.play().catch(() => {})
      }
    }
    v.addEventListener('loadedmetadata', onLoaded, { once: true })
    v.addEventListener('canplay', onLoaded, { once: true })
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('canplay', onLoaded)
    }
  }, [selected?.id, selected?.sourceUrl, selected?.type, composedClipStart, selected?.trimIn, selected?.trimOut, selected?.speed])

  /* ─── master playing flag → drive video element ─── */
  const playing = useEditorStore((s) => s.playing)
  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    if (playing) {
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [playing, selected?.id, selected?.type])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    v.playbackRate = selected.speed
  }, [selected?.id, selected?.speed, selected?.type])

  /* ─── Click-to-toggle on the preview frame ─── */
  const togglePlay = () => {
    const state = useEditorStore.getState()
    // If at end of timeline, snap back to start before playing
    if (!state.playing) {
      const total = state.totalDuration()
      if (state.composedTime >= total - 0.05) {
        state.setComposedTime(0)
        const first = state.clips[0]
        if (first) state.selectClip(first.id)
      }
    }
    state.setPlaying(!state.playing)
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
  /* ─── Master playback clock ───
     A single rAF loop drives composedTime by wall-clock delta whenever
     `playing` is true. Video elements SYNC to the clock, not the other
     way around. This makes cross-clip transitions seamless (the clock
     keeps ticking while the next video element loads), photos just work,
     and the timer reflects total composed time across the whole edit. */
  useEffect(() => {
    let raf = 0
    const PX = 28
    let lastWall = 0
    let lastRealSync = 0

    const applyStrip = (composed: number) => {
      const state = useEditorStore.getState()
      const wrapper = state.timelineWrapperEl
      const strip = state.timelineStripEl
      if (!wrapper || !strip) return
      const halfWidth = wrapper.clientWidth / 2
      strip.style.transform = `translateX(${halfWidth - composed * PX}px)`
    }

    const tick = () => {
      const state = useEditorStore.getState()
      const total = state.totalDuration()

      if (state.playing && total > 0) {
        const nowWall = performance.now()
        if (lastWall === 0) lastWall = nowWall
        const dt = Math.min(0.1, (nowWall - lastWall) / 1000) // clamp to 100ms so tab-switch doesn't skip
        lastWall = nowWall

        let nextComposed = state.composedTime + dt

        // End of timeline — pause and snap.
        if (nextComposed >= total) {
          nextComposed = total
          state.setPlaying(false)
          lastWall = 0
        }

        // Find which clip contains nextComposed and update selection if needed.
        let acc = 0
        let activeId = state.clips[0]?.id ?? null
        let activeClipStart = 0
        for (const c of state.clips) {
          const eff = (c.trimOut - c.trimIn) / c.speed
          if (nextComposed < acc + eff + 0.0001) {
            activeId = c.id
            activeClipStart = acc
            break
          }
          acc += eff
        }
        if (activeId && activeId !== state.selectedClipId) {
          state.selectClip(activeId)
          // The selection effect will seek the new video to the right spot.
        }

        // For videos, periodically resync the video element's currentTime
        // to the master clock so audio stays in sync. Throttled to ~4Hz so
        // we don't cause seek-induced stutter.
        if (nowWall - lastRealSync > 250) {
          lastRealSync = nowWall
          const sel = state.clips.find((c) => c.id === (activeId ?? state.selectedClipId))
          if (sel?.type === 'video') {
            const v = document.querySelector<HTMLVideoElement>('.editor-stage video')
            if (v && !v.paused) {
              const inClip = Math.max(0, nextComposed - activeClipStart)
              const expected = sel.trimIn + inClip * sel.speed
              if (Math.abs(v.currentTime - expected) > 0.35) {
                v.currentTime = Math.min(Math.max(expected, sel.trimIn), sel.trimOut)
              }
            }
          }
        }

        state.setComposedTime(nextComposed)
        applyStrip(nextComposed)
      } else {
        lastWall = 0
        // When paused, still apply transform if composedTime changed (scrub)
        applyStrip(state.composedTime)
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

  // Smaller than before so the whole editor fits in one viewport on
  // typical laptops and phones without scrolling. Desktop never shrinks
  // when a context strip opens because the strip lives in the right
  // sidebar on desktop — shrinking would waste preview real estate.
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  const previewHeight = isDesktop
    ? 'min(48vh, 480px)'
    : stripActive
    ? 'min(30vh, 320px)'
    : 'min(44vh, 440px)'

  return (
    <div className="relative w-full flex items-center justify-center min-h-0">
      <div
        ref={frameRef}
        className="relative rounded-[16px] overflow-hidden ed-preview-bg"
        onDragOver={isEmpty ? onDragOver : undefined}
        onDragLeave={isEmpty ? onDragLeave : undefined}
        onDrop={isEmpty ? onDrop : undefined}
        style={{
          aspectRatio: String(ratio),
          height: previewHeight,
          minHeight: 200,
          width: 'auto',
          maxWidth: '100%',
          boxShadow: 'inset 0 0 0 1px rgba(var(--ed-fg), 0.10)',
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
                <Loader2 weight="bold" size={40} className="text-tangerine animate-spin" />
                <p className="ed-fg-85 text-[14px] font-semibold">Importing…</p>
              </>
            ) : (
              <>
                <div className="relative w-[72px] h-[64px]">
                  <div className="absolute left-0 top-0 w-[52px] h-[52px] rounded-[14px] border-[1.5px] ed-border-15 flex items-center justify-center ed-surface-04 rotate-[-6deg]">
                    <ImageIcon weight="light" size={22} className="ed-fg-85" />
                  </div>
                  <div className="absolute right-0 bottom-0 w-[52px] h-[52px] rounded-[14px] border-[1.5px] ed-border-15 flex items-center justify-center ed-surface-06 rotate-[6deg]">
                    <Film weight="light" size={22} className="ed-fg-85" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="ed-fg text-[15px] font-semibold tracking-tight">
                    Drop photos and videos here
                  </p>
                  <p className="ed-fg-45 text-[11px]">or pick from your device</p>
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
            <Loader2 weight="bold" size={11} className="text-tangerine animate-spin" />
            <span className="text-[10px] font-semibold ed-fg-85">Importing…</span>
          </div>
        )}

        {/* Set-thumbnail overlay — top-left. Only for video clips.
            Captures the currently-displayed frame as the clip's
            thumbnail (what shows on the map pin when this is the
            first content item). */}
        {!isEmpty && selected?.type === 'video' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void captureThumbnail()
            }}
            className="absolute top-3 left-3 z-30 h-9 px-3 rounded-full flex items-center gap-1.5 bg-black/55 text-white/95 text-[11px] font-semibold backdrop-blur-sm hover:bg-black/70 cursor-pointer transition-all active:scale-95"
            aria-label="Set thumbnail"
          >
            <ImageIcon weight="bold" size={13} />
            Thumbnail
          </button>
        )}

        {/* Saved confirmation pill — shows briefly after capture */}
        <AnimatePresence>
          {thumbSavedAt > 0 && (
            <motion.div
              key={thumbSavedAt}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 h-7 px-3 rounded-full bg-sold-green/95 text-white text-[10px] font-bold pointer-events-none"
            >
              <Check weight="bold" size={10} />
              Thumbnail saved
            </motion.div>
          )}
        </AnimatePresence>

        {/* Frame overlay button — always on top-right of the preview,
            icon-only, identical on mobile and desktop. Tapping toggles
            the crop context strip (mobile: below timeline; desktop:
            in the right sidebar). */}
        {!isEmpty && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setView(view === 'crop' ? null : 'crop')
            }}
            className={`absolute top-3 right-3 z-30 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
              view === 'crop'
                ? 'bg-tangerine text-white shadow-[0_4px_16px_rgba(255,107,61,0.55)]'
                : 'bg-black/55 text-white/90 backdrop-blur-sm hover:bg-black/70'
            }`}
            aria-label="Frame"
          >
            <Crop weight="bold" size={16} />
          </button>
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
            <Check weight="bold" size={13} />
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
            <X weight="bold" size={10} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
