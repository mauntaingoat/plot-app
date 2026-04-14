import { motion } from 'framer-motion'
import { PreviewCanvas } from './components/PreviewCanvas'
import { TransportBar } from './components/TransportBar'
import { Timeline } from './components/Timeline'
import { ContextStrip } from './components/ContextStrip'
import { BottomToolbar } from './components/BottomToolbar'
import { useEditorStore } from './state/editorStore'

interface EditorStepProps {
  direction: number
}

/**
 * Inline editor step that lives inside PinCreate. Uses the same heading
 * pattern as the other steps (title + smoke subtitle). Responsive grid:
 * single column on mobile, 2-col side-by-side on desktop.
 */
export function EditorStep({ direction }: EditorStepProps) {
  const clips = useEditorStore((s) => s.clips)
  const view = useEditorStore((s) => s.view)
  const stripActive = view === 'adjust' || view === 'crop' || view === 'speed' || view === 'text'

  return (
    <motion.div
      key="edit"
      custom={direction}
      variants={{
        enter: (d: number) => ({ opacity: 0, x: 20 * d }),
        center: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: -20 * d }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Craft your reel</h2>
      <p className="text-[14px] text-smoke mb-5">Trim, style, and polish each clip before you publish.</p>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:items-start">
        {/* ── Preview card ── */}
        <section className="bg-cream rounded-[22px] p-3 sm:p-4 mb-4 lg:mb-0">
          <div
            className="w-full flex items-center justify-center"
            style={{ maxHeight: 'min(56vh, 560px)', minHeight: 240, height: 'min(56vh, 560px)' }}
          >
            <PreviewCanvas />
          </div>
          {clips.length === 0 && (
            <p className="text-[11px] text-ash text-center mt-3">
              Start by importing from the timeline below.
            </p>
          )}
        </section>

        {/* ── Controls card ── */}
        <section className="bg-cream rounded-[22px] p-4 flex flex-col">
          {/* Transport */}
          <TransportBar />

          {/* Timeline */}
          <div className="mt-3">
            <Timeline />
          </div>

          {/* Context strip (only when active) */}
          {stripActive && (
            <div className="mt-4 pt-4 border-t border-border-light">
              <ContextStrip />
            </div>
          )}

          {/* Bottom toolbar — sits at the end of the controls card */}
          <div className="mt-3 pt-2 border-t border-border-light">
            <BottomToolbar />
          </div>
        </section>
      </div>
    </motion.div>
  )
}
