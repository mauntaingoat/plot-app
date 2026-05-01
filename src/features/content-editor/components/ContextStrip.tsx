import { AnimatePresence, motion } from 'framer-motion'
import { ArrowCounterClockwise as RotateCcw, Sparkle as Sparkles, Microphone as Mic } from '@phosphor-icons/react'
import { useEditorStore } from '../state/editorStore'
import { ASPECT_OPTIONS, FONT_OPTIONS, TEXT_SIZES } from '../state/types'
import type { Adjustments, ClipSpeed, FontKey, TextOverlay } from '../state/types'

const SLIDERS: { key: keyof Adjustments; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast',   label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
]

const SPEEDS: ClipSpeed[] = [0.5, 1, 1.5, 2]
const TEXT_COLORS = ['#FFFFFF', '#FF6B3D', '#FFD93D', '#4ADE80', '#60A5FA', '#F472B6', '#0A0E17']

const stripMotion = {
  initial: { y: 18, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 18, opacity: 0 },
  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
}

export function ContextStrip() {
  const view = useEditorStore((s) => s.view)

  return (
    <div className="relative px-4 lg:px-0 min-h-[8px]">
      <AnimatePresence mode="wait" initial={false}>
        {view === 'adjust' && <AdjustStrip key="adjust" />}
        {view === 'crop'   && <CropStrip   key="crop" />}
        {view === 'speed'  && <SpeedStrip  key="speed" />}
        {view === 'audio'  && <AudioStub   key="audio" />}
        {view === 'filter' && <FilterStub  key="filter" />}
        {view === 'text'   && <TextStrip   key="text" />}
      </AnimatePresence>
    </div>
  )
}

/* ─────────── Adjust (per-clip) ─────────── */

function AdjustStrip() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const setClipAdjustment = useEditorStore((s) => s.setClipAdjustment)
  const resetClipAdjustments = useEditorStore((s) => s.resetClipAdjustments)
  const clip = clips.find((c) => c.id === selectedId) ?? clips[0]

  if (!clip) {
    return (
      <motion.div {...stripMotion} className="max-w-md mx-auto">
        <p className="text-[11px] text-white/55 text-center py-2">Select a clip to adjust its color.</p>
      </motion.div>
    )
  }

  return (
    <motion.div {...stripMotion} className="space-y-2.5 max-w-md mx-auto">
      {SLIDERS.map(({ key, label }) => {
        const value = clip.adjustments[key]
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-semibold text-white/65 tracking-wide uppercase">{label}</span>
              <span className={`font-mono text-[10px] tabular-nums ${value === 0 ? 'text-white/30' : 'text-tangerine'}`}>
                {value > 0 ? '+' : ''}{value}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={value}
              onChange={(e) => setClipAdjustment(clip.id, key, parseInt(e.target.value, 10))}
              className="adjust-slider w-full"
              style={{ '--fill': `${((value + 100) / 200) * 100}%`, '--track': 'rgba(255,255,255,0.10)' } as React.CSSProperties}
            />
          </div>
        )
      })}
      <button
        onClick={() => resetClipAdjustments(clip.id)}
        className="flex items-center gap-1.5 text-[11px] text-white/45 hover:text-white/85 cursor-pointer transition-colors"
      >
        <RotateCcw size={11} />
        Reset
      </button>
    </motion.div>
  )
}

/* ─────────── Crop / Frame ─────────── */

function CropStrip() {
  const aspect = useEditorStore((s) => s.aspect)
  const setAspect = useEditorStore((s) => s.setAspect)

  return (
    <motion.div {...stripMotion} className="max-w-md mx-auto w-full">
      {/* Mobile ContextStrip is rendered full-width below the timeline
          (6 cols); desktop ContextStrip lives in the ~180px sidebar
          (2 cols stacked). Tailwind's lg: breakpoint maps cleanly because
          the desktop instance only exists above lg. */}
      <div className="grid grid-cols-6 lg:grid-cols-2 gap-1.5">
        {ASPECT_OPTIONS.map((opt) => {
          const active = aspect === opt.id
          const ratio = opt.ratio
          // Original = source aspect → show a circle icon. Otherwise show a rect.
          const isOriginal = opt.id === 'original'
          const thumbStyle: React.CSSProperties = isOriginal
            ? { width: 22, height: 22, borderRadius: '50%' }
            : ratio
            ? { width: ratio >= 1 ? 22 : 22 * ratio, height: ratio >= 1 ? 22 / ratio : 22 }
            : { width: 22, height: 22 }
          return (
            <button
              key={opt.id}
              onClick={() => setAspect(opt.id)}
              className="relative flex flex-col items-center justify-center gap-1 h-[60px] rounded-[10px] cursor-pointer transition-all"
              style={{
                background: active ? 'rgba(255,107,61,0.14)' : 'rgba(var(--ed-fg), 0.05)',
                boxShadow: active ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
              }}
            >
              <div
                className="border"
                style={{
                  borderColor: active ? '#FF6B3D' : 'rgba(var(--ed-fg), 0.55)',
                  ...thumbStyle,
                  borderRadius: isOriginal ? '50%' : 2,
                }}
              />
              <span
                className="font-mono text-[9px] font-bold tracking-wider uppercase"
                style={{ color: active ? '#FF6B3D' : 'rgba(var(--ed-fg), 0.65)' }}
              >
                {opt.label}
              </span>
              {(opt as any).recommended && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] font-bold text-white bg-tangerine px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap shadow-sm">Recommended</span>
              )}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ─────────── Speed ─────────── */

function SpeedStrip() {
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const setSpeed = useEditorStore((s) => s.setSpeed)
  const clip = clips.find((c) => c.id === selectedId)

  return (
    <motion.div {...stripMotion} className="max-w-md mx-auto">
      {!clip ? (
        <p className="text-[11px] text-white/55 text-center">Select a clip to change its speed.</p>
      ) : clip.type === 'photo' ? (
        <p className="text-[11px] text-white/55 leading-snug text-center">Photos don’t have a playback speed.</p>
      ) : (
        <div className="flex gap-1.5">
          {SPEEDS.map((speed) => {
            const active = clip.speed === speed
            return (
              <button
                key={speed}
                onClick={() => setSpeed(clip.id, speed)}
                className="flex-1 h-11 rounded-[12px] font-mono text-[12px] font-bold transition-all cursor-pointer"
                style={{
                  background: active ? 'rgba(255,107,61,0.14)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#FF6B3D' : 'rgba(255,255,255,0.7)',
                  boxShadow: active ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
                }}
              >
                {speed}×
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

/* ─────────── Audio stub ─────────── */

function AudioStub() {
  return (
    <motion.div {...stripMotion} className="max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-white/[0.04]">
        <div className="w-9 h-9 rounded-full bg-tangerine/14 flex items-center justify-center shrink-0">
          <Mic size={15} className="text-tangerine" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/85">Voiceover</p>
          <p className="text-[10px] text-white/40 leading-snug">Record your own narration. Coming next session.</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────── Filter stub ─────────── */

function FilterStub() {
  return (
    <motion.div {...stripMotion} className="max-w-md mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-white/[0.04]">
        <div className="w-9 h-9 rounded-full bg-tangerine/14 flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-tangerine" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/85">Filters</p>
          <p className="text-[10px] text-white/40 leading-snug">LUT-style color grades. Coming next session.</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────── Text strip — fonts + sizes + colors + width ─────────── */

function TextStrip() {
  const overlays = useEditorStore((s) => s.overlays)
  const addOverlayAtPlayhead = useEditorStore((s) => s.addOverlayAtPlayhead)
  const updateOverlay = useEditorStore((s) => s.updateOverlay)
  const removeOverlay = useEditorStore((s) => s.removeOverlay)
  const active = overlays[overlays.length - 1]

  const handleAdd = () => {
    addOverlayAtPlayhead()
  }

  if (!active) {
    return (
      <motion.div {...stripMotion} className="max-w-md mx-auto">
        <button
          onClick={handleAdd}
          className="w-full h-10 rounded-[12px] text-tangerine text-[12px] font-bold cursor-pointer transition-colors"
          style={{
            background: 'rgba(255,107,61,0.12)',
            boxShadow: '0 0 0 1.5px rgba(255,107,61,0.55) inset',
          }}
        >
          + Add text layer
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div {...stripMotion} className="space-y-2.5 max-w-2xl mx-auto">
      {/* Row: fonts horizontal scroller */}
      <div>
        <p className="text-[9px] font-semibold text-white/45 uppercase tracking-wider mb-1">Font</p>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {FONT_OPTIONS.map((f) => {
            const on = active.font === f.key
            return (
              <button
                key={f.key}
                onClick={() => updateOverlay(active.id, { font: f.key })}
                className="shrink-0 h-9 px-3 rounded-full text-[12px] cursor-pointer transition-colors"
                style={{
                  background: on ? 'rgba(255,107,61,0.14)' : 'rgba(255,255,255,0.04)',
                  color: on ? '#FF6B3D' : 'rgba(255,255,255,0.85)',
                  boxShadow: on ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
                  fontFamily: f.family,
                  fontWeight: f.weight,
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row: sizes horizontal scroller (24 options) */}
      <div>
        <p className="text-[9px] font-semibold text-white/45 uppercase tracking-wider mb-1">Size</p>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {TEXT_SIZES.map((s) => {
            const on = active.size === s
            return (
              <button
                key={s}
                onClick={() => updateOverlay(active.id, { size: s })}
                className="shrink-0 h-8 min-w-[40px] px-2 rounded-full font-mono text-[10px] font-bold cursor-pointer transition-colors"
                style={{
                  background: on ? 'rgba(255,107,61,0.14)' : 'rgba(255,255,255,0.04)',
                  color: on ? '#FF6B3D' : 'rgba(255,255,255,0.65)',
                  boxShadow: on ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
                }}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row: width slider — controls text box max-width as % of preview */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] font-semibold text-white/45 uppercase tracking-wider">Width</span>
          <span className="font-mono text-[10px] tabular-nums text-tangerine">{active.maxWidthPercent}%</span>
        </div>
        <input
          type="range"
          min={40}
          max={95}
          step={5}
          value={active.maxWidthPercent}
          onChange={(e) => updateOverlay(active.id, { maxWidthPercent: parseInt(e.target.value, 10) })}
          className="adjust-slider w-full"
          style={{
            '--fill': `${((active.maxWidthPercent - 40) / 55) * 100}%`,
            '--track': 'rgba(255,255,255,0.10)',
          } as React.CSSProperties}
        />
      </div>

      {/* Row: colors + actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TEXT_COLORS.map((c) => {
          const on = active.color.toLowerCase() === c.toLowerCase()
          return (
            <button
              key={c}
              onClick={() => updateOverlay(active.id, { color: c })}
              className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                on ? 'border-tangerine scale-110' : 'border-white/15 hover:border-white/45'
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          )
        })}
        <div className="flex-1" />
        <button
          onClick={handleAdd}
          className="h-8 px-3 rounded-full text-[11px] font-bold text-tangerine cursor-pointer"
          style={{ background: 'rgba(255,107,61,0.12)' }}
        >
          + New
        </button>
        <button
          onClick={() => removeOverlay(active.id)}
          className="h-8 px-3 rounded-full text-[11px] font-bold text-live-red hover:text-live-red/80 cursor-pointer"
        >
          Remove
        </button>
      </div>
    </motion.div>
  )
}
