import { motion } from 'framer-motion'
import { Play, Pause, Undo2, Redo2 } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Transport row. Reads playback state straight from the editor store —
 * a single master clock drives composedTime, which this bar displays as
 * the absolute timer across the whole multi-clip edit (video + photo,
 * continuous across clip boundaries).
 */
export function TransportBar() {
  const clips = useEditorStore((s) => s.clips)
  const playing = useEditorStore((s) => s.playing)
  const setPlaying = useEditorStore((s) => s.setPlaying)
  const composedTime = useEditorStore((s) => s.composedTime)
  const setComposedTime = useEditorStore((s) => s.setComposedTime)
  const selectClip = useEditorStore((s) => s.selectClip)
  const totalDuration = useEditorStore((s) => s.totalDuration())
  const hasContent = clips.length > 0
  // Undo/redo — subscribe to past/future length so the button states
  // re-render when history changes.
  const past = useEditorStore((s) => s.past)
  const future = useEditorStore((s) => s.future)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const togglePlay = () => {
    if (!hasContent) return
    // If stopped at end of timeline, snap back to start before resuming.
    if (!playing && composedTime >= totalDuration - 0.05) {
      setComposedTime(0)
      const first = clips[0]
      if (first) selectClip(first.id)
    }
    setPlaying(!playing)
  }

  return (
    <div className="relative flex items-center justify-between px-6 lg:px-12 h-[60px]">
      {/* Timecode (left) — composed time across the whole edit */}
      <span className="font-mono text-[13px] tabular-nums tracking-tight ed-fg-85">
        {fmt(composedTime)}
        <span className="ed-fg-30"> / {fmt(totalDuration)}</span>
      </span>

      {/* Play (center, big, tangerine, breathing on play) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.button
          whileTap={hasContent ? { scale: 0.92 } : undefined}
          onClick={togglePlay}
          disabled={!hasContent}
          animate={playing ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={
            playing
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.18 }
          }
          className={`relative w-[56px] h-[56px] rounded-full flex items-center justify-center transition-colors ${
            hasContent
              ? 'bg-tangerine cursor-pointer'
              : 'ed-surface-06 cursor-not-allowed'
          }`}
          style={{
            boxShadow: hasContent
              ? '0 0 0 1px rgba(255,107,61,0.45), 0 8px 30px rgba(255,107,61,0.35)'
              : undefined,
          }}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing
            ? <Pause size={22} className="text-white" fill="currentColor" />
            : <Play size={22} className="text-white ml-0.5" fill="currentColor" />}
        </motion.button>
      </div>

      {/* Undo / Redo (right) */}
      <div className="flex items-center gap-1">
        <button
          onClick={canUndo ? undo : undefined}
          disabled={!canUndo}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            canUndo
              ? 'ed-fg-85 hover:ed-fg hover:ed-surface-08 cursor-pointer'
              : 'ed-fg-22 cursor-not-allowed'
          }`}
          aria-label="Undo"
        >
          <Undo2 size={16} strokeWidth={2.2} />
        </button>
        <button
          onClick={canRedo ? redo : undefined}
          disabled={!canRedo}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            canRedo
              ? 'ed-fg-85 hover:ed-fg hover:ed-surface-08 cursor-pointer'
              : 'ed-fg-22 cursor-not-allowed'
          }`}
          aria-label="Redo"
        >
          <Redo2 size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
