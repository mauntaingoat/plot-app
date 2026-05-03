import { useRef, useCallback, useMemo, useEffect, useLayoutEffect, useState } from 'react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import { Plus, TextAa as Type, MusicNote as Music2, CircleNotch as Loader2, Copy } from '@phosphor-icons/react'
import { useEditorStore } from '../state/editorStore'
import type { Clip, TextOverlay } from '../state/types'

const PX_PER_SECOND = 28
const CLIP_HEIGHT = 64
// CLIP_GAP was 6px which caused clip tiles to drift right of the ruler
// marks by 6px per clip boundary. Zeroed out so 1s of ruler = 1s of clip.
// Visual separation now comes from the tile's own outline/border.
const CLIP_GAP = 0
const REORDER_LONG_PRESS_MS = 380

// Trim bracket: small grip centered on the clip's vertical edge
const BRACKET_W = 10
const BRACKET_H = 28
const BRACKET_HIT_PAD = 12 // invisible padding around the bracket for easier grabbing

function tileWidth(clip: Clip): number {
  const effective = (clip.trimOut - clip.trimIn) / clip.speed
  // No min-width — the tile must map exactly 1s → PX_PER_SECOND so it
  // lines up with the ruler marks. Very short clips are allowed to be
  // small; the trim brackets have their own hit padding.
  return Math.round(effective * PX_PER_SECOND)
}
function effectiveDuration(clip: Clip): number {
  return (clip.trimOut - clip.trimIn) / clip.speed
}
function fmtRuler(t: number): string {
  if (t < 60) return `${Math.round(t)}s`
  const m = Math.floor(t / 60)
  const s = Math.round(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Anchored-playhead timeline. The first clip starts to the right of the
 * centered playhead at t=0 (achieved via paddingLeft = scrollerWidth/2),
 * and as playback advances the strip scrolls left so the playhead stays
 * visually centered.
 */
export function Timeline({ simpleMode = false }: { simpleMode?: boolean } = {}) {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const importFiles = useEditorStore((s) => s.importFiles)
  const selectClip = useEditorStore((s) => s.selectClip)
  const reorderClips = useEditorStore((s) => s.reorderClips)
  const setTrim = useEditorStore((s) => s.setTrim)
  const setComposedTime = useEditorStore((s) => s.setComposedTime)
  const overlays = useEditorStore((s) => s.overlays)
  const setView = useEditorStore((s) => s.setView)
  const total = useEditorStore((s) => s.totalDuration())
  const importingCount = useEditorStore((s) => s.importingCount)
  const composedTime = useEditorStore((s) => s.composedTime)

  const fileRef = useRef<HTMLInputElement>(null)
  const onFilesPicked = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    importFiles(e.target.files)
    e.target.value = ''
  }, [importFiles])

  // Transform-based positioning. The wrapper has overflow:hidden, the inner
  // strip is translated so its current-time point sits at the wrapper's
  // visual center. No native scroll, no padding measurement, no race.
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)
  const setTimelineEls = useEditorStore((s) => s.setTimelineEls)

  // Register both elements with the store so PreviewCanvas can write the
  // strip's transform directly on every video timeupdate. The wrapper +
  // strip are always rendered so the refs are stable from first mount.
  useEffect(() => {
    setTimelineEls(wrapperRef.current, stripRef.current)
    return () => setTimelineEls(null, null)
  }, [setTimelineEls])

  // Imperative helper — every code path that wants to move the strip
  // (drag, raf playback, mount, resize) calls this. composedTime React
  // state is intentionally NOT a dep of the layout effect: during
  // playback, the raf loop in PreviewCanvas owns the transform, and we
  // don't want React state changes to overwrite its smooth value with a
  // throttled stale one.
  const applyStripTransform = useCallback((composed: number) => {
    const wrapper = wrapperRef.current
    const strip = stripRef.current
    if (!wrapper || !strip) return
    const halfWidth = wrapper.clientWidth / 2
    strip.style.transform = `translateX(${halfWidth - composed * PX_PER_SECOND}px)`
  }, [])

  // On mount + when clips change, snap the strip to the current composedTime
  useLayoutEffect(() => {
    applyStripTransform(useEditorStore.getState().composedTime)
  }, [applyStripTransform, clips])

  // Re-apply transform on resize (window or container width changes).
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const apply = () => applyStripTransform(useEditorStore.getState().composedTime)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [applyStripTransform, clips.length])

  // Helper: given a composedTime, find which clip it falls into and
  // what currentTime within that clip's source corresponds to it.
  const decompose = useCallback((composed: number) => {
    const cs = useEditorStore.getState().clips
    let acc = 0
    for (const clip of cs) {
      const eff = (clip.trimOut - clip.trimIn) / clip.speed
      if (composed <= acc + eff + 0.001) {
        const offset = Math.max(0, composed - acc)
        return { clipId: clip.id, timeInClip: clip.trimIn + offset * clip.speed }
      }
      acc += eff
    }
    const last = cs[cs.length - 1]
    return last ? { clipId: last.id, timeInClip: last.trimOut } : null
  }, [])

  // Commit a composed-time delta to the store + DOM + video element.
  const commitScrub = useCallback((next: number) => {
    setComposedTime(next)
    applyStripTransform(next)
    const target = decompose(next)
    if (target) {
      if (target.clipId !== useEditorStore.getState().selectedClipId) {
        useEditorStore.getState().selectClip(target.clipId)
      }
      const v = document.querySelector<HTMLVideoElement>('.editor-stage video')
      if (v) v.currentTime = target.timeInClip
    }
  }, [setComposedTime, applyStripTransform, decompose])

  // Inertia scrolling state shared across pointer, wheel, and momentum raf.
  const momentumRaf = useRef<number | null>(null)
  const stopMomentum = useCallback(() => {
    if (momentumRaf.current !== null) {
      cancelAnimationFrame(momentumRaf.current)
      momentumRaf.current = null
    }
  }, [])

  // Pointer drag with velocity sampling → momentum decay on release.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button')) return

    // Kill any in-flight momentum from a previous flick, pause playback.
    stopMomentum()
    useEditorStore.getState().setPlaying(false)
    const videos = document.querySelectorAll<HTMLVideoElement>('.editor-stage video')
    videos.forEach((v) => { if (!v.paused) v.pause() })

    const startX = e.clientX
    const state0 = useEditorStore.getState()
    const startComposed = state0.composedTime
    const totalDur = state0.totalDuration()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    // Velocity tracking — keep last two samples so the release velocity
    // reflects the final flick, not the whole drag.
    let lastX = startX
    let lastT = performance.now()
    let velocityPxPerMs = 0

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const next = Math.max(0, Math.min(totalDur, startComposed - dx / PX_PER_SECOND))
      commitScrub(next)

      const now = performance.now()
      const dt = now - lastT
      if (dt > 0) {
        const instant = (ev.clientX - lastX) / dt
        // Low-pass filter so a single jittery sample doesn't dominate.
        velocityPxPerMs = velocityPxPerMs * 0.6 + instant * 0.4
      }
      lastX = ev.clientX
      lastT = now
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)

      // Below this threshold the flick was intentional-stop, not a throw.
      if (Math.abs(velocityPxPerMs) < 0.15) return

      // Momentum decay: each frame apply the velocity, then damp it.
      // Friction tuned so a firm flick travels ~12–16 clip-seconds before
      // coming to rest, which matches iOS scroll feel on a 28px/s ruler.
      const FRICTION = 0.94
      const MIN_V = 0.02
      let v = -velocityPxPerMs // screen +x → composed -t
      let lastFrameT = performance.now()

      const step = () => {
        const now = performance.now()
        const dt = now - lastFrameT
        lastFrameT = now
        // Velocity is in px/ms; convert to composed seconds/ms via PX_PER_SECOND.
        const composedDelta = (v * dt) / PX_PER_SECOND
        const currentComposed = useEditorStore.getState().composedTime
        const total = useEditorStore.getState().totalDuration()
        const next = Math.max(0, Math.min(total, currentComposed + composedDelta))
        commitScrub(next)

        // Hit a boundary → stop immediately.
        if (next === 0 || next === total) {
          momentumRaf.current = null
          return
        }
        v *= Math.pow(FRICTION, dt / 16.67) // frame-rate independent damping
        if (Math.abs(v) < MIN_V) {
          momentumRaf.current = null
          return
        }
        momentumRaf.current = requestAnimationFrame(step)
      }
      momentumRaf.current = requestAnimationFrame(step)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Trackpad horizontal scroll. ONLY reacts to `deltaX` (2-finger
  // horizontal swipe) so vertical page scrolling still works normally
  // when the pointer happens to be over the timeline. If the gesture is
  // predominantly vertical, let the browser handle it.
  const onWheel = (e: React.WheelEvent) => {
    if (clips.length === 0) return
    const dx = e.deltaX
    // Guard against mostly-vertical gestures (trackpads emit tiny deltaX
    // noise during vertical scrolls). Require deltaX to dominate.
    if (Math.abs(dx) < 1 || Math.abs(dx) <= Math.abs(e.deltaY)) return
    e.preventDefault()
    stopMomentum()
    useEditorStore.getState().setPlaying(false)
    const totalDur = useEditorStore.getState().totalDuration()
    const current = useEditorStore.getState().composedTime
    const next = Math.max(0, Math.min(totalDur, current + dx / PX_PER_SECOND))
    commitScrub(next)
  }

  // Stop any momentum when the component unmounts to avoid stray raf.
  useEffect(() => () => stopMomentum(), [stopMomentum])

  // Always-visible ruler
  const rulerMarks = useMemo(() => {
    const interval = total > 60 ? 10 : total > 30 ? 5 : total > 12 ? 3 : 2
    const upto = Math.max(12, Math.ceil(total + interval))
    const marks: number[] = []
    for (let t = 0; t <= upto; t += interval) marks.push(t)
    return { marks, interval }
  }, [total])

  return (
    <div className="relative px-4 lg:px-12">
      {/* Track wrapper — contains the moving element (ruler + strip) plus
          the fixed central playhead. Always rendered for ref stability. */}
      <div
        ref={wrapperRef}
        onPointerDown={clips.length > 0 ? onPointerDown : undefined}
        onWheel={clips.length > 0 ? onWheel : undefined}
        className={`relative overflow-hidden ${clips.length > 0 ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ height: CLIP_HEIGHT + 48, touchAction: 'pan-y' }}
      >
        {/* Empty placeholder — only when no clips */}
        {clips.length === 0 && (
          <div className="absolute inset-0 rounded-[14px] ed-surface-025 flex items-center justify-center ed-fg-45 text-[12px] font-medium pointer-events-none">
            {importingCount > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 weight="bold" size={12} className="text-tangerine animate-spin" />
                Loading clips…
              </span>
            ) : (
              'Your clips will appear here'
            )}
          </div>
        )}

        {/* The MOVING element — ruler + clip strip stacked, ONE transform
            applied to both so they stay perfectly in sync at 60fps */}
        <div
          ref={stripRef}
          className="absolute top-0 left-0"
          style={{ willChange: 'transform' }}
        >
          {clips.length > 0 && (
            <>
              {/* Ruler row — absolute-positioned labels so each mark
                  sits EXACTLY at `t * PX_PER_SECOND` regardless of the
                  flex layout. First mark is left-aligned so "0s" isn't
                  clipped off the edge; all other marks are center-aligned
                  on the pixel position they refer to. */}
              <div
                className="relative h-[14px] pointer-events-none"
                style={{
                  width: (rulerMarks.marks[rulerMarks.marks.length - 1] ?? 0) * PX_PER_SECOND + 40,
                }}
              >
                {rulerMarks.marks.map((t) => (
                  <span
                    key={t}
                    className="absolute bottom-0 font-mono text-[9px] ed-fg-45 tabular-nums whitespace-nowrap"
                    style={{
                      left: t * PX_PER_SECOND,
                      transform: t === 0 ? 'none' : 'translateX(-50%)',
                    }}
                  >
                    {fmtRuler(t)}
                  </span>
                ))}
              </div>

              {/* Clip strip row */}
              <div className="flex items-stretch mt-1" style={{ gap: CLIP_GAP }}>
                <Reorder.Group
                  axis="x"
                  values={clips}
                  onReorder={(next: Clip[]) => reorderClips(next.map((c) => c.id))}
                  className="flex items-stretch"
                  style={{ gap: CLIP_GAP }}
                >
                  <AnimatePresence initial={false}>
                    {clips.map((clip, idx) => (
                      <ClipTile
                        key={clip.id}
                        clip={clip}
                        active={clip.id === selectedId}
                        onTap={() => selectClip(clip.id)}
                        setTrim={setTrim}
                        canMoveLeft={idx > 0}
                        canMoveRight={idx < clips.length - 1}
                        onMoveLeft={() => {
                          const ids = clips.map((c) => c.id)
                          ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
                          reorderClips(ids)
                        }}
                        onMoveRight={() => {
                          const ids = clips.map((c) => c.id)
                          ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
                          reorderClips(ids)
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>

                <button
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-[10px] ed-surface-05 flex items-center justify-center ed-fg-65 hover:ed-fg hover:ed-surface-09 active:scale-[0.97] transition-all cursor-pointer"
                  style={{ width: 48, height: CLIP_HEIGHT }}
                  aria-label="Add clip"
                >
                  <Plus weight="bold" size={17} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Fixed central white playhead — only show when there are clips */}
        {clips.length > 0 && (
          <div
            aria-hidden
            className="absolute top-[14px] bottom-[2px] left-1/2 w-[2px] pointer-events-none z-10"
            style={{ background: 'rgb(var(--ed-fg))', boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 0 12px rgba(var(--ed-fg), 0.25)' }}
          >
            <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full" style={{ background: 'rgb(var(--ed-fg))' }} />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={onFilesPicked}
      />

      {/* Text track — draggable bars positioned by composed time */}
      {!simpleMode && clips.length > 0 && (
        <TextTrack wrapperRef={wrapperRef} clipsTotal={total} composedTime={composedTime} />
      )}

      {/* Audio track (stub) */}
      {!simpleMode && clips.length > 0 && (
        <button
          onClick={() => setView('audio')}
          className="mt-1.5 w-full flex items-center gap-2 h-[26px] px-3 rounded-[8px] ed-surface-025 hover:ed-surface-05 cursor-pointer transition-colors group"
        >
          <Music2 weight="bold" size={11} className="ed-fg-45 transition-colors" />
          <span className="text-[10px] font-semibold ed-fg-45 transition-colors tracking-tight">
            + Audio
          </span>
          <span className="text-[9px] ed-fg-30 ml-2">{overlays.length === 0 ? 'voiceover coming next' : ''}</span>
        </button>
      )}
    </div>
  )
}

/* ─────────── ClipTile (filmstrip + edge brackets, no width transition) ─────────── */

interface ClipTileProps {
  clip: Clip
  active: boolean
  onTap: () => void
  setTrim: (id: string, trimIn: number, trimOut: number) => void
  canMoveLeft: boolean
  canMoveRight: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
}

function ClipTile({ clip, active, onTap, setTrim, canMoveLeft, canMoveRight, onMoveLeft, onMoveRight }: ClipTileProps) {
  const [reorderEnabled, setReorderEnabled] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    longPressTimer.current = setTimeout(() => {
      setReorderEnabled(true)
    }, REORDER_LONG_PRESS_MS)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setReorderEnabled(false)
  }

  // Visible (trimmed) tile width
  const tileW = tileWidth(clip)
  const eff = effectiveDuration(clip)

  // Inner filmstrip is the FULL clip's frame strip at fixed pixel width.
  // The visible tile clips it via overflow:hidden + a translateX offset
  // that aligns the trim-in point to the tile's left edge.
  // Frames inside NEVER scale — trimming just slides the strip behind the window.
  const fullWidth = (clip.duration / clip.speed) * PX_PER_SECOND
  const filmstripOffset = -((clip.trimIn / clip.speed) * PX_PER_SECOND)
  const frameCount = Math.max(1, clip.frames.length)
  const perFrameW = fullWidth / frameCount

  return (
    <Reorder.Item
      value={clip}
      dragListener={reorderEnabled}
      onDragEnd={() => setReorderEnabled(false)}
      whileDrag={{ scale: 1.04, zIndex: 10 }}
      layout={reorderEnabled ? "position" : undefined}
      className="relative"
      style={{ overflow: 'visible' }}
    >
      {/* The visible window — width = trimmed duration. Frames inside are FIXED. */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onClick={onTap}
        className="relative shrink-0 cursor-pointer"
        style={{
          width: tileW,
          height: CLIP_HEIGHT,
          touchAction: 'pan-x',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#1A1D26',
          outline: active ? '2px solid #FFD93D' : '1px solid rgba(var(--ed-fg), 0.08)',
          outlineOffset: active ? 1 : 0,
          // Only animate the outline color — explicit so width never animates
          transition: 'outline-color 0.15s ease',
        }}
      >
        {clip.type === 'photo' ? (
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : clip.frames.length > 1 ? (
          /* Inner filmstrip — fixed full width, translated to align the trim window */
          <div
            className="absolute top-0 left-0 h-full flex"
            style={{
              width: fullWidth,
              transform: `translateX(${filmstripOffset}px)`,
              willChange: 'transform',
            }}
          >
            {clip.frames.map((src, i) => (
              <div
                key={i}
                className="h-full shrink-0 bg-cover bg-center"
                style={{
                  width: perFrameW,
                  backgroundImage: `url(${src})`,
                  boxShadow: i > 0 ? 'inset 1px 0 0 rgba(0,0,0,0.25)' : undefined,
                }}
              />
            ))}
          </div>
        ) : (
          /* Fallback when the filmstrip extractor couldn't produce real frames
             (common on iOS Safari). Renders the single thumbnail stretched
             across the FULL clip width with regular divider lines overlaid so
             the tile still reads as a framed strip. Desktop usually gets the
             real filmstrip above; this branch keeps mobile visually consistent. */
          (() => {
            const fakeCount = Math.max(4, Math.round(eff * 1.4))
            return (
              <div
                className="absolute top-0 left-0 h-full"
                style={{
                  width: fullWidth,
                  transform: `translateX(${filmstripOffset}px)`,
                  backgroundImage: `url(${clip.thumbnailUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  willChange: 'transform',
                }}
              >
                {/* Divider lines at segment boundaries */}
                {Array.from({ length: fakeCount - 1 }).map((_, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{
                      left: `${((i + 1) / fakeCount) * 100}%`,
                      width: 1,
                      background: 'rgba(0,0,0,0.45)',
                      boxShadow: '1px 0 0 rgba(255,255,255,0.06)',
                    }}
                  />
                ))}
              </div>
            )
          })()
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15 pointer-events-none" />

        <span className="absolute bottom-1 left-1.5 font-mono text-[8px] font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {eff.toFixed(1)}s
        </span>
        {clip.speed !== 1 && (
          <span className="absolute bottom-1 right-1.5 font-mono text-[8px] font-bold text-tangerine tabular-nums">
            {clip.speed}×
          </span>
        )}

        {/* (loading ring removed — filmstrip extraction failures fall
            through to the single-thumbnail render below, no spinner) */}

        {/* Trim brackets render OUTSIDE the overflow:hidden so they don't get clipped.
            Wait — they need to be siblings of the tile, not children. */}
      </div>

      {/* Brackets are SIBLINGS of the tile so they're not clipped by overflow:hidden.
          Videos get both brackets. Photos get a single right bracket (drag to
          extend display duration up to clip.duration, the configured max). */}
      {active && (
        <CenteredBrackets
          clip={clip}
          setTrim={setTrim}
          tileW={tileW}
          rightOnly={clip.type === 'photo'}
        />
      )}

      {active && (canMoveLeft || canMoveRight) && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ top: CLIP_HEIGHT + 6 }}>
          {canMoveLeft && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveLeft() }}
              className="w-6 h-6 rounded-full bg-[#FFD93D] flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6.5 2L3.5 5L6.5 8" stroke="#1A1D26" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {canMoveRight && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveRight() }}
              className="w-6 h-6 rounded-full bg-[#FFD93D] flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L6.5 5L3.5 8" stroke="#1A1D26" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      )}
    </Reorder.Item>
  )
}

/* ─────────── CenteredBrackets — small grip centered on each edge ─────────── */

function CenteredBrackets({
  clip,
  setTrim,
  tileW,
  rightOnly = false,
}: {
  clip: Clip
  setTrim: (id: string, trimIn: number, trimOut: number) => void
  tileW: number
  rightOnly?: boolean
}) {
  const onDown = (edge: 'in' | 'out') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    // Capture history ONCE at drag start so the entire trim gesture
    // rolls back as a single undo step (not dozens of per-pixel entries).
    useEditorStore.getState().markHistory()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const startX = e.clientX
    const startTrimIn = clip.trimIn
    const startTrimOut = clip.trimOut
    // Pixel-to-source-second conversion, accounting for speed
    const secPerPx = (clip.duration / clip.speed) / ((clip.duration / clip.speed) * PX_PER_SECOND) * clip.speed
    // = clip.speed / PX_PER_SECOND  — each pixel of drag = (1/PX_PER_SECOND * speed) source seconds

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dt = dx * secPerPx
      if (edge === 'in') {
        const next = Math.max(0, Math.min(startTrimOut - 0.3, startTrimIn + dt))
        setTrim(clip.id, next, startTrimOut)
      } else {
        const next = Math.max(startTrimIn + 0.3, Math.min(clip.duration, startTrimOut + dt))
        setTrim(clip.id, startTrimIn, next)
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Both bracket hit areas sit ENTIRELY OUTSIDE the tile (left of the
  // left edge, right of the right edge) so they never overlap regardless
  // of how narrow the user trims the clip. The visible yellow grip hugs
  // the tile edge from outside.
  const HIT_W = BRACKET_W + BRACKET_HIT_PAD * 2
  return (
    <>
      {/* LEFT bracket (hidden in rightOnly mode — photos don't trim in) */}
      {!rightOnly && (
      <div
        onPointerDown={onDown('in')}
        className="absolute cursor-ew-resize z-30"
        style={{
          left: -HIT_W,
          top: 0,
          height: CLIP_HEIGHT,
          width: HIT_W,
          touchAction: 'none',
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: BRACKET_W,
            height: BRACKET_H,
            background: '#FFD93D',
            borderRadius: 4,
            boxShadow: '0 0 12px rgba(255,217,61,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="w-[2px] h-[12px] bg-black/60 rounded-full" />
        </div>
      </div>
      )}

      {/* RIGHT bracket */}
      <div
        onPointerDown={onDown('out')}
        className="absolute cursor-ew-resize z-30"
        style={{
          left: tileW,
          top: 0,
          height: CLIP_HEIGHT,
          width: HIT_W,
          touchAction: 'none',
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: BRACKET_W,
            height: BRACKET_H,
            background: '#FFD93D',
            borderRadius: 4,
            boxShadow: '0 0 12px rgba(255,217,61,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="w-[2px] h-[12px] bg-black/60 rounded-full" />
        </div>
      </div>
    </>
  )
}

/* ─────────── TextTrack — draggable text bars positioned by composed time ─────────── */

interface TextTrackProps {
  wrapperRef: React.RefObject<HTMLDivElement | null>
  clipsTotal: number
  composedTime: number
}

function TextTrack({ wrapperRef, clipsTotal, composedTime }: TextTrackProps) {
  const overlays = useEditorStore((s) => s.overlays)
  const updateOverlay = useEditorStore((s) => s.updateOverlay)
  const addOverlayAtPlayhead = useEditorStore((s) => s.addOverlayAtPlayhead)
  const setView = useEditorStore((s) => s.setView)

  if (overlays.length === 0) {
    return (
      <button
        onClick={() => {
          addOverlayAtPlayhead()
          setView('text')
        }}
        className="mt-2 w-full flex items-center gap-2 h-[26px] px-3 rounded-[8px] ed-surface-025 hover:ed-surface-05 cursor-pointer transition-colors group"
      >
        <Type weight="bold" size={11} className="ed-fg-45 transition-colors" />
        <span className="text-[10px] font-semibold ed-fg-45 transition-colors tracking-tight">
          + Text
        </span>
      </button>
    )
  }

  // Same transform model as the clip strip — text bars share the same
  // coordinate space, translated by the same amount so they stay aligned
  // with the clips above them.
  const halfWidth = (wrapperRef.current?.clientWidth ?? 0) / 2
  const translateX = halfWidth - composedTime * PX_PER_SECOND

  return (
    <div className="mt-2 relative h-[24px] overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full"
        style={{
          width: Math.max(clipsTotal * PX_PER_SECOND + 60, 200),
          transform: `translateX(${translateX}px)`,
          willChange: 'transform',
        }}
      >
        {overlays.map((o) => (
          <TextBar
            key={o.id}
            overlay={o}
            updateOverlay={updateOverlay}
            clipsTotal={clipsTotal}
            onSelect={() => setView('text')}
          />
        ))}
      </div>
    </div>
  )
}

interface TextBarProps {
  overlay: TextOverlay
  updateOverlay: (id: string, patch: Partial<TextOverlay>) => void
  clipsTotal: number
  onSelect: () => void
}

function TextBar({ overlay, updateOverlay, clipsTotal, onSelect }: TextBarProps) {
  const start = Math.max(0, overlay.start)
  const end = Math.min(clipsTotal || overlay.end, overlay.end)
  const left = start * PX_PER_SECOND
  const width = Math.max(20, (end - start) * PX_PER_SECOND)

  const dragMode = useRef<'move' | 'left' | 'right' | null>(null)

  const onDown = (mode: 'move' | 'left' | 'right') => (e: React.PointerEvent) => {
    e.stopPropagation()
    dragMode.current = mode
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const startX = e.clientX
    const startStart = overlay.start
    const startEnd = overlay.end
    const dur = startEnd - startStart

    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - startX) / PX_PER_SECOND
      if (dragMode.current === 'move') {
        const newStart = Math.max(0, Math.min((clipsTotal || dur) - dur, startStart + dt))
        updateOverlay(overlay.id, { start: newStart, end: newStart + dur })
      } else if (dragMode.current === 'left') {
        const newStart = Math.max(0, Math.min(startEnd - 0.4, startStart + dt))
        updateOverlay(overlay.id, { start: newStart })
      } else if (dragMode.current === 'right') {
        const newEnd = Math.max(startStart + 0.4, Math.min(clipsTotal || startEnd, startEnd + dt))
        updateOverlay(overlay.id, { end: newEnd })
      }
    }
    const up = () => {
      dragMode.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const addOverlayAtPlayhead = useEditorStore((s) => s.addOverlayAtPlayhead)
  const onDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    addOverlayAtPlayhead()
  }

  return (
    <div
      className="absolute top-1 h-[18px] flex items-center"
      style={{ left, width }}
      onClick={onSelect}
    >
      {/* Body — drag to move */}
      <div
        onPointerDown={onDown('move')}
        className="relative flex-1 h-full px-2 rounded-md flex items-center gap-1 cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          background: 'rgba(255,107,61,0.22)',
          boxShadow: 'inset 0 0 0 1px rgba(255,107,61,0.5)',
          touchAction: 'none',
        }}
      >
        <Type size={9} className="text-tangerine shrink-0" />
        <span className="text-[9px] font-semibold text-white/95 truncate">
          {overlay.text || 'Text'}
        </span>
      </div>

      {/* Left edge handle */}
      <div
        onPointerDown={onDown('left')}
        className="absolute left-0 top-0 h-full w-[8px] cursor-ew-resize"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[10px] bg-tangerine/85 rounded-full" />
      </div>

      {/* Right edge handle */}
      <div
        onPointerDown={onDown('right')}
        className="absolute right-0 top-0 h-full w-[8px] cursor-ew-resize"
        style={{ touchAction: 'none' }}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-[10px] bg-tangerine/85 rounded-full" />
      </div>

      {/* Duplicate button — outside the bar, on the right */}
      <button
        onClick={onDuplicate}
        className="absolute -right-5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full bg-tangerine/14 hover:bg-tangerine/25 flex items-center justify-center cursor-pointer"
        aria-label="Duplicate text layer"
      >
        <Copy weight="bold" size={8} className="text-tangerine" />
      </button>
    </div>
  )
}
