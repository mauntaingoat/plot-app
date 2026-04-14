import { motion } from 'framer-motion'
import { Play, Pause, Undo2, Redo2 } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useEditorStore } from '../state/editorStore'

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Transport row with real hierarchy: timecode left, big tangerine play
 * button center, ghost undo/redo right (only colored when there's history).
 *
 * The play button is the single largest interactive element in the
 * transport — it's the action the user returns to most.
 */
export function TransportBar() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const currentTime = useEditorStore((s) => s.currentTime)
  const totalDuration = useEditorStore((s) => s.totalDuration())
  const [playing, setPlaying] = useState(false)

  const selected = useMemo(() => clips.find((c) => c.id === selectedId) ?? clips[0], [clips, selectedId])
  const hasContent = clips.length > 0

  useEffect(() => {
    const id = setInterval(() => {
      const videos = document.querySelectorAll<HTMLVideoElement>('.editor-stage video')
      let anyPlaying = false
      videos.forEach((v) => { if (!v.paused) anyPlaying = true })
      setPlaying(anyPlaying)
    }, 160)
    return () => clearInterval(id)
  }, [])

  const togglePlay = () => {
    const videos = document.querySelectorAll<HTMLVideoElement>('.editor-stage video')
    if (videos.length === 0) return
    const first = videos[0]
    if (first.paused) first.play().catch(() => {})
    else videos.forEach((v) => v.pause())
  }

  const relTime = selected ? Math.max(0, (currentTime - selected.trimIn) / selected.speed) : 0

  return (
    <div className="relative flex items-center justify-between px-6 lg:px-12 h-[60px]">
      {/* Timecode (left) */}
      <span className="font-mono text-[13px] tabular-nums tracking-tight text-white/85">
        {fmt(relTime)}
        <span className="text-white/30"> / {fmt(totalDuration)}</span>
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
              : 'bg-white/[0.06] cursor-not-allowed'
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

      {/* Undo / Redo (right, ghost) */}
      <div className="flex items-center gap-1">
        <button
          disabled
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/22 cursor-not-allowed"
          aria-label="Undo"
        >
          <Undo2 size={16} strokeWidth={2.2} />
        </button>
        <button
          disabled
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/22 cursor-not-allowed"
          aria-label="Redo"
        >
          <Redo2 size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
