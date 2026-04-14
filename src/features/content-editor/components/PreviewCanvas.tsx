import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, X, Check } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import { ASPECT_OPTIONS } from '../state/types'

/**
 * Inline preview frame. Always-dark surface (video reads best on black)
 * even when the dashboard theme is light. Sized by aspect ratio, capped
 * by a max-height so the rest of the editor fits the viewport on mobile.
 */
export function PreviewCanvas() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const aspect = useEditorStore((s) => s.aspect)
  const adjustments = useEditorStore((s) => s.adjustments)
  const overlays = useEditorStore((s) => s.overlays)
  const updateOverlay = useEditorStore((s) => s.updateOverlay)
  const removeOverlay = useEditorStore((s) => s.removeOverlay)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const view = useEditorStore((s) => s.view)

  const selected = useMemo(() => clips.find((c) => c.id === selectedId) ?? clips[0], [clips, selectedId])

  const frameRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [, setLocalTick] = useState(0)
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null)

  useEffect(() => {
    setPlaying(false)
    setCurrentTime(selected?.trimIn ?? 0)
    const v = videoRef.current
    if (v && selected?.type === 'video') v.currentTime = selected.trimIn
  }, [selected?.id, selected?.trimIn, selected?.type, setCurrentTime])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    v.playbackRate = selected.speed
  }, [selected?.id, selected?.speed, selected?.type])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !selected || selected.type !== 'video') return
    const onTime = () => {
      setLocalTick((t) => t + 1)
      setCurrentTime(v.currentTime)
      if (v.currentTime >= selected.trimOut) {
        v.pause()
        v.currentTime = selected.trimIn
        setPlaying(false)
      }
    }
    v.addEventListener('timeupdate', onTime)
    return () => v.removeEventListener('timeupdate', onTime)
  }, [selected, setCurrentTime])

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

  const filter = `brightness(${1 + adjustments.brightness / 100}) contrast(${1 + adjustments.contrast / 100}) saturate(${1 + adjustments.saturation / 100})`

  const ratio = ASPECT_OPTIONS.find((o) => o.id === aspect)?.ratio ?? 9 / 16
  const isTextEditing = view === 'text' && !!editingOverlayId

  return (
    <div className="editor-stage relative w-full flex items-center justify-center">
      {/* Frame — always dark, rounded, subtle hairline */}
      <div
        ref={frameRef}
        className="relative rounded-[22px] overflow-hidden border border-border-light shadow-[0_12px_40px_rgba(10,14,23,0.18)]"
        style={{
          aspectRatio: String(ratio),
          width: ratio < 1 ? 'auto' : '100%',
          height: ratio < 1 ? '100%' : 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          background: '#05070B',
          transition: 'aspect-ratio 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        {!selected ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <Play size={22} className="text-tangerine ml-0.5" fill="currentColor" />
            </div>
            <p className="text-white/85 text-[13px] font-semibold">Your canvas</p>
            <p className="text-white/45 text-[11px] max-w-[220px] leading-snug">
              Tap the + tile on the timeline to import photos or videos.
            </p>
          </div>
        ) : selected.type === 'video' ? (
          <video
            ref={videoRef}
            src={selected.sourceUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter }}
            playsInline
            muted
            onClick={togglePlay}
          />
        ) : (
          <img src={selected.sourceUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter }} />
        )}

        {/* Text overlays */}
        {selected && overlays.map((o) => (
          <TextOverlayNode
            key={o.id}
            overlay={o}
            frameRef={frameRef}
            editing={editingOverlayId === o.id}
            onStartEdit={() => setEditingOverlayId(o.id)}
            onEndEdit={() => setEditingOverlayId(null)}
            onChange={(patch) => updateOverlay(o.id, patch)}
            onRemove={() => { removeOverlay(o.id); setEditingOverlayId(null) }}
          />
        ))}

        {/* Center play button */}
        {selected?.type === 'video' && !playing && !isTextEditing && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div className="w-[58px] h-[58px] rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center group-active:scale-95 transition-transform duration-150">
              <Play size={24} className="text-white ml-0.5" fill="currentColor" />
            </div>
          </button>
        )}
      </div>

      {isTextEditing && (
        <button
          onClick={() => setEditingOverlayId(null)}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 h-8 px-4 rounded-full bg-tangerine text-white text-[12px] font-bold shadow-[0_6px_20px_rgba(255,107,61,0.5)] cursor-pointer"
        >
          <Check size={13} strokeWidth={2.6} />
          Done
        </button>
      )}
    </div>
  )
}

/* ─────────── TextOverlayNode ─────────── */

interface TextOverlayNodeProps {
  overlay: import('../state/types').TextOverlay
  frameRef: React.RefObject<HTMLDivElement | null>
  editing: boolean
  onStartEdit: () => void
  onEndEdit: () => void
  onChange: (patch: Partial<import('../state/types').TextOverlay>) => void
  onRemove: () => void
}

function TextOverlayNode({ overlay, frameRef, editing, onStartEdit, onChange, onRemove }: TextOverlayNodeProps) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; frameW: number; frameH: number } | null>(null)
  const [localText, setLocalText] = useState(overlay.text)

  useEffect(() => { setLocalText(overlay.text) }, [overlay.text])

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: overlay.position.x,
      origY: overlay.position.y,
      frameW: rect.width,
      frameH: rect.height,
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

  const fontFamily = overlay.font === 'mono' ? 'var(--font-mono)' : 'var(--font-display)'

  return (
    <motion.div
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
      }}
    >
      <div className="relative">
        {editing ? (
          <input
            autoFocus
            value={localText}
            onChange={(e) => { setLocalText(e.target.value); onChange({ text: e.target.value }) }}
            className="bg-black/55 backdrop-blur-sm rounded-md px-2.5 py-1 outline-none text-center"
            style={{
              fontFamily,
              fontSize: overlay.size,
              color: overlay.color,
              minWidth: '80px',
              maxWidth: '80%',
              caretColor: '#FF6B3D',
            }}
          />
        ) : (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onStartEdit}
            className="cursor-move px-2.5 py-1 rounded-md"
            style={{
              fontFamily,
              fontSize: overlay.size,
              color: overlay.color,
              fontWeight: 700,
              whiteSpace: 'pre',
              textShadow: '0 2px 14px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.8)',
              lineHeight: 1.1,
            }}
          >
            {overlay.text || 'Your text'}
          </div>
        )}

        {!editing && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center text-white/90 hover:bg-tangerine cursor-pointer"
          >
            <X size={10} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
