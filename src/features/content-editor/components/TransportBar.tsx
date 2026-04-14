import { motion } from 'framer-motion'
import { Play, Pause, Undo2, Redo2, Maximize2 } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { useEditorStore } from '../state/editorStore'

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Slim transport row: timecode · play · placeholders. Fully theme-aware.
 */
export function TransportBar() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const currentTime = useEditorStore((s) => s.currentTime)
  const totalDuration = useEditorStore((s) => s.totalDuration())
  const [playing, setPlaying] = useState(false)

  const selected = useMemo(() => clips.find((c) => c.id === selectedId) ?? clips[0], [clips, selectedId])

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
    <div className="flex items-center justify-between h-[44px]">
      <span className="font-mono text-[11px] tabular-nums text-ink tracking-tight">
        {fmt(relTime)}<span className="text-ash"> / {fmt(totalDuration)}</span>
      </span>

      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={togglePlay}
        disabled={!selected}
        className="w-10 h-10 rounded-full bg-ink text-warm-white disabled:opacity-30 cursor-pointer flex items-center justify-center shadow-[0_4px_14px_rgba(10,14,23,0.22)] hover:brightness-110 transition-all"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing
          ? <Pause size={16} fill="currentColor" />
          : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </motion.button>

      <div className="flex items-center gap-1">
        <button disabled className="w-7 h-7 flex items-center justify-center text-ash cursor-not-allowed" aria-label="Undo">
          <Undo2 size={14} strokeWidth={2.2} />
        </button>
        <button disabled className="w-7 h-7 flex items-center justify-center text-ash cursor-not-allowed" aria-label="Redo">
          <Redo2 size={14} strokeWidth={2.2} />
        </button>
        <button disabled className="w-7 h-7 flex items-center justify-center text-ash cursor-not-allowed" aria-label="Fullscreen">
          <Maximize2 size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
