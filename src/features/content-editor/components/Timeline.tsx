import { useRef, useCallback, useMemo } from 'react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import { Plus, Film, Image as ImageIcon } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import type { Clip } from '../state/types'

const PX_PER_SECOND = 26
const CLIP_HEIGHT = 64

function tileWidth(clip: Clip): number {
  const effective = (clip.trimOut - clip.trimIn) / clip.speed
  return Math.max(46, Math.round(effective * PX_PER_SECOND))
}

function effectiveDuration(clip: Clip): number {
  return (clip.trimOut - clip.trimIn) / clip.speed
}

function fmtRuler(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Theme-aware timeline: ruler + duration-scaled clip track + fixed central
 * tangerine playhead. Uses outline (not border) for active state so tiles
 * don't shift by a pixel when selection changes.
 */
export function Timeline() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const importFiles = useEditorStore((s) => s.importFiles)
  const selectClip = useEditorStore((s) => s.selectClip)
  const reorderClips = useEditorStore((s) => s.reorderClips)
  const setTrim = useEditorStore((s) => s.setTrim)
  const view = useEditorStore((s) => s.view)
  const total = useEditorStore((s) => s.totalDuration())
  const trimMode = view === 'trim'

  const fileRef = useRef<HTMLInputElement>(null)
  const onFilesPicked = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    importFiles(e.target.files)
    e.target.value = ''
  }, [importFiles])

  const rulerMarks = useMemo(() => {
    const interval = total > 30 ? 5 : total > 12 ? 3 : 2
    const upto = Math.max(12, Math.ceil(total + interval))
    const marks: number[] = []
    for (let t = 0; t <= upto; t += interval) marks.push(t)
    return { marks, interval }
  }, [total])

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full bg-tangerine" />
          <span className="text-[10px] font-bold text-smoke uppercase tracking-[0.12em]">Timeline</span>
        </div>
        {clips.length > 0 && (
          <span className="font-mono text-[10px] text-ash tabular-nums">
            {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
          </span>
        )}
      </div>

      {/* Ruler */}
      {clips.length > 0 && (
        <div className="relative h-[14px] overflow-hidden mb-1">
          <div className="absolute inset-0 flex items-center">
            {rulerMarks.marks.map((t, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center"
                style={{ width: i === 0 ? 0 : PX_PER_SECOND * rulerMarks.interval }}
              >
                <span className="font-mono text-[9px] text-ash tabular-nums -ml-3">
                  {fmtRuler(t)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Track */}
      <div className="relative">
        {clips.length === 0 ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-[84px] rounded-[14px] bg-pearl flex items-center justify-center gap-3 text-smoke hover:text-ink active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-tangerine/15 flex items-center justify-center">
              <Plus size={16} className="text-tangerine" strokeWidth={2.4} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-ink">Import photos or videos</p>
              <p className="text-[11px] text-smoke">Tap to pick from your library</p>
            </div>
          </button>
        ) : (
          <div className="relative">
            <div
              className="flex items-stretch gap-1.5 overflow-x-auto scrollbar-none py-0.5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <Reorder.Group
                axis="x"
                values={clips}
                onReorder={(next: Clip[]) => reorderClips(next.map((c) => c.id))}
                className="flex items-stretch gap-1.5"
              >
                <AnimatePresence initial={false}>
                  {clips.map((clip) => {
                    const active = clip.id === selectedId
                    const w = tileWidth(clip)
                    const eff = effectiveDuration(clip)
                    return (
                      <Reorder.Item
                        key={clip.id}
                        value={clip}
                        dragListener={!trimMode}
                        whileDrag={{ scale: 1.04, zIndex: 10 }}
                        className="relative"
                      >
                        <motion.button
                          onClick={() => selectClip(clip.id)}
                          whileTap={{ scale: 0.97 }}
                          className="relative rounded-[10px] overflow-hidden shrink-0 bg-charcoal"
                          style={{
                            width: w,
                            height: CLIP_HEIGHT,
                            touchAction: 'none',
                            outline: active ? '2px solid #FF6B3D' : '1px solid var(--color-border-light)',
                            outlineOffset: active ? 1 : 0,
                            transition: 'outline-color 0.15s ease, outline-offset 0.15s ease',
                          }}
                        >
                          <img
                            src={clip.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15 pointer-events-none" />

                          <div className="absolute top-1 left-1 w-[14px] h-[14px] rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            {clip.type === 'video'
                              ? <Film size={7} className="text-white/95" strokeWidth={2.5} />
                              : <ImageIcon size={7} className="text-white/95" strokeWidth={2.5} />}
                          </div>

                          <span className="absolute bottom-1 left-1 font-mono text-[8px] font-bold text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                            {eff.toFixed(1)}s
                          </span>
                          {clip.speed !== 1 && (
                            <span className="absolute bottom-1 right-1 font-mono text-[8px] font-bold text-tangerine tabular-nums">
                              {clip.speed}×
                            </span>
                          )}

                          {trimMode && active && clip.type === 'video' && (
                            <TrimHandles clip={clip} setTrim={setTrim} />
                          )}
                        </motion.button>
                      </Reorder.Item>
                    )
                  })}
                </AnimatePresence>
              </Reorder.Group>

              <button
                onClick={() => fileRef.current?.click()}
                className="shrink-0 rounded-[10px] bg-pearl flex items-center justify-center text-smoke hover:text-ink hover:bg-pearl active:scale-[0.97] transition-all cursor-pointer"
                style={{ width: 46, height: CLIP_HEIGHT }}
                aria-label="Add clip"
              >
                <Plus size={17} strokeWidth={2.2} />
              </button>
            </div>

            {/* Fixed central playhead (tangerine) */}
            <div
              aria-hidden
              className="absolute top-[-3px] bottom-[-1px] left-1/2 w-[2px] bg-tangerine pointer-events-none"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.3), 0 0 10px rgba(255,107,61,0.5)' }}
            >
              <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-tangerine" />
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onFilesPicked}
        />
      </div>
    </div>
  )
}

/* ─────────── Inline trim handles ─────────── */

function TrimHandles({ clip, setTrim }: { clip: Clip; setTrim: (id: string, trimIn: number, trimOut: number) => void }) {
  const onDown = (edge: 'in' | 'out') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const host = (e.currentTarget as HTMLElement).parentElement as HTMLElement
    const rect = host.getBoundingClientRect()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      const t = ratio * clip.duration
      if (edge === 'in') setTrim(clip.id, Math.min(t, clip.trimOut - 0.3), clip.trimOut)
      else setTrim(clip.id, clip.trimIn, Math.max(t, clip.trimIn + 0.3))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const inPct  = (clip.trimIn  / Math.max(0.01, clip.duration)) * 100
  const outPct = (clip.trimOut / Math.max(0.01, clip.duration)) * 100

  return (
    <div className="absolute inset-0">
      <div className="absolute top-0 bottom-0 bg-black/55 pointer-events-none" style={{ left: 0, width: `${inPct}%` }} />
      <div className="absolute top-0 bottom-0 bg-black/55 pointer-events-none" style={{ right: 0, width: `${100 - outPct}%` }} />
      <div
        onPointerDown={onDown('in')}
        className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        style={{ left: `calc(${inPct}% - 6px)`, touchAction: 'none' }}
      >
        <div className="w-[4px] h-full bg-tangerine rounded-sm shadow-[0_0_10px_rgba(255,107,61,0.75)]" />
      </div>
      <div
        onPointerDown={onDown('out')}
        className="absolute top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
        style={{ left: `calc(${outPct}% - 6px)`, touchAction: 'none' }}
      >
        <div className="w-[4px] h-full bg-tangerine rounded-sm shadow-[0_0_10px_rgba(255,107,61,0.75)]" />
      </div>
    </div>
  )
}
