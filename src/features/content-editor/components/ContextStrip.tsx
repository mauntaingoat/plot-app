import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import { ASPECT_OPTIONS } from '../state/types'
import type { Adjustments, ClipSpeed, TextOverlay } from '../state/types'

const SLIDERS: { key: keyof Adjustments; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast',   label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
]

const SPEEDS: ClipSpeed[] = [0.5, 1, 1.5, 2]
const TEXT_COLORS = ['#FFFFFF', '#FF6B3D', '#FFD93D', '#4ADE80', '#60A5FA', '#F472B6', '#0A0E17']
const TEXT_SIZES = [18, 24, 32, 44]

/**
 * Theme-aware inline strip that renders above the bottom toolbar when a
 * tool needs additional controls (Adjust, Crop, Speed, Text). Pure flow
 * element — takes no space when no strip is active.
 */
export function ContextStrip() {
  const view = useEditorStore((s) => s.view)

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {view === 'adjust' && <AdjustStrip key="adjust" />}
        {view === 'crop'   && <CropStrip   key="crop" />}
        {view === 'speed'  && <SpeedStrip  key="speed" />}
        {view === 'text'   && <TextStrip   key="text" />}
      </AnimatePresence>
    </div>
  )
}

/* ─────────── Adjust ─────────── */

function AdjustStrip() {
  const adjustments = useEditorStore((s) => s.adjustments)
  const setAdjustment = useEditorStore((s) => s.setAdjustment)
  const resetAdjustments = useEditorStore((s) => s.resetAdjustments)

  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 14, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-3"
    >
      {SLIDERS.map(({ key, label }) => {
        const value = adjustments[key]
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-graphite tracking-wide">{label}</span>
              <span className={`font-mono text-[10px] tabular-nums ${value === 0 ? 'text-ash' : 'text-tangerine'}`}>
                {value > 0 ? '+' : ''}{value}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={value}
              onChange={(e) => setAdjustment(key, parseInt(e.target.value, 10))}
              className="adjust-slider w-full"
              style={{ '--fill': `${((value + 100) / 200) * 100}%` } as React.CSSProperties}
            />
          </div>
        )
      })}
      <button
        onClick={resetAdjustments}
        className="flex items-center gap-1.5 text-[11px] text-smoke hover:text-ink cursor-pointer transition-colors"
      >
        <RotateCcw size={11} />
        Reset
      </button>
    </motion.div>
  )
}

/* ─────────── Crop ─────────── */

function CropStrip() {
  const aspect = useEditorStore((s) => s.aspect)
  const setAspect = useEditorStore((s) => s.setAspect)

  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 14, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {ASPECT_OPTIONS.map((opt) => {
          const active = aspect === opt.id
          const ratio = opt.ratio
          const thumbStyle: React.CSSProperties = ratio
            ? { width: ratio >= 1 ? 24 : 24 * ratio, height: ratio >= 1 ? 24 / ratio : 24 }
            : { width: 18, height: 18, transform: 'rotate(45deg)' }
          return (
            <button
              key={opt.id}
              onClick={() => setAspect(opt.id)}
              className={`relative flex flex-col items-center justify-center gap-1 h-[62px] rounded-[12px] transition-all ${
                active
                  ? 'bg-tangerine/12 text-tangerine'
                  : 'bg-pearl text-graphite hover:text-ink cursor-pointer'
              }`}
              style={{
                boxShadow: active ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
              }}
            >
              <div className={`rounded-[2px] border ${active ? 'border-tangerine' : 'border-current'}`} style={thumbStyle} />
              <span className="font-mono text-[9px] font-bold tracking-wider uppercase">{opt.label}</span>
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
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 14, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {!clip ? null : clip.type === 'photo' ? (
        <p className="text-[11px] text-smoke leading-snug">Photos don’t have a playback speed.</p>
      ) : (
        <div className="flex gap-1.5">
          {SPEEDS.map((speed) => {
            const active = clip.speed === speed
            return (
              <button
                key={speed}
                onClick={() => setSpeed(clip.id, speed)}
                className={`flex-1 h-11 rounded-[12px] font-mono text-[12px] font-bold transition-all ${
                  active
                    ? 'bg-tangerine/12 text-tangerine'
                    : 'bg-pearl text-graphite hover:text-ink cursor-pointer'
                }`}
                style={{
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

/* ─────────── Text ─────────── */

function TextStrip() {
  const overlays = useEditorStore((s) => s.overlays)
  const addOverlay = useEditorStore((s) => s.addOverlay)
  const updateOverlay = useEditorStore((s) => s.updateOverlay)
  const removeOverlay = useEditorStore((s) => s.removeOverlay)
  const active = overlays[overlays.length - 1]

  const handleAdd = () => {
    addOverlay({
      text: 'Your text',
      font: 'display' as TextOverlay['font'],
      color: '#FFFFFF',
      size: 32,
      position: { x: 0.5, y: 0.5 },
      start: 0,
      end: 9999,
    })
  }

  return (
    <motion.div
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 14, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-2.5"
    >
      {!active ? (
        <button
          onClick={handleAdd}
          className="w-full h-11 rounded-[12px] bg-tangerine/12 text-tangerine text-[12px] font-bold cursor-pointer hover:bg-tangerine/20 transition-colors"
          style={{ boxShadow: '0 0 0 1.5px rgba(255,107,61,0.55) inset' }}
        >
          + Add text layer
        </button>
      ) : (
        <>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={handleAdd}
              className="shrink-0 h-9 px-3 rounded-full bg-tangerine/12 text-tangerine text-[11px] font-bold cursor-pointer hover:bg-tangerine/20 transition-colors"
            >
              + New
            </button>
            <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-none">
              {TEXT_SIZES.map((s) => {
                const on = active.size === s
                return (
                  <button
                    key={s}
                    onClick={() => updateOverlay(active.id, { size: s })}
                    className={`shrink-0 h-9 px-3 rounded-full font-mono text-[10px] font-bold transition-colors ${
                      on ? 'bg-tangerine/12 text-tangerine' : 'bg-pearl text-graphite hover:text-ink cursor-pointer'
                    }`}
                    style={{ boxShadow: on ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined }}
                  >
                    {s}px
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {TEXT_COLORS.map((c) => {
              const on = active.color.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  onClick={() => updateOverlay(active.id, { color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    on ? 'border-tangerine scale-110' : 'border-border-light hover:border-smoke'
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              )
            })}
            <div className="flex-1" />
            <button
              onClick={() => removeOverlay(active.id)}
              className="text-[11px] text-live-red hover:text-ember-deep cursor-pointer font-semibold"
            >
              Remove
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}
