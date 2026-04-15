import { motion } from 'framer-motion'
import { PreviewCanvas } from './components/PreviewCanvas'
import { TransportBar } from './components/TransportBar'
import { Timeline } from './components/Timeline'
import { ContextStrip } from './components/ContextStrip'
import { BottomToolbar } from './components/BottomToolbar'
import { EditorErrorBoundary } from './components/EditorErrorBoundary'
import { useEditorStore } from './state/editorStore'

interface EditorStepProps {
  direction: number
  /** When true, hides Text/Audio/Filter/Adjust/Speed/Split and keeps only
   *  Frame + Trim handles + Add clip + Replace/Delete. Used by the simple
   *  Video Reel flow. */
  simpleMode?: boolean
}

/**
 * Viewport-locked editor step. Nothing here scrolls the page; each
 * section gets its allocated flex space and overflows internally.
 *
 * Desktop (lg+): two-column grid
 *   ┌──────────────────┬─────────────┐
 *   │  PREVIEW         │  EDIT TOOLS │
 *   │  TRANSPORT       │  (vertical  │
 *   │  TIMELINE        │   column)   │
 *   │  CONTEXT STRIP   │             │
 *   └──────────────────┴─────────────┘
 *
 * Mobile: single column with dynamic preview shrink
 *   - Default: preview ~58vh, transport, timeline, toolbar at bottom
 *   - When a tool strip is open: preview shrinks to ~36vh, strip slides
 *     into the gap between timeline and toolbar
 */
export function EditorStep({ direction, simpleMode = false }: EditorStepProps) {
  const view = useEditorStore((s) => s.view)
  const reset = useEditorStore((s) => s.reset)
  const stripActive = view === 'adjust' || view === 'crop' || view === 'speed'
                   || view === 'audio' || view === 'filter' || view === 'text'

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
      className="editor-stage"
      data-strip-active={stripActive ? 'true' : 'false'}
    >
      {/* Faint noise so the dark canvas doesn't read as flat */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.02] mix-blend-overlay z-0"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' /%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'url(%23n)\' opacity=\'0.4\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Single instance of every component — CSS-only responsive layout.
          Previously we rendered two complete copies (one for desktop, one
          for mobile) which caused the store refs + querySelector to find
          the wrong element on each platform. Now there's exactly ONE of
          PreviewCanvas, Timeline, etc., and Tailwind classes change the
          layout. */}
      <EditorErrorBoundary onReset={reset}>
        <div className="relative lg:grid lg:gap-6 lg:items-stretch flex flex-col gap-3" style={{ gridTemplateColumns: '1fr 160px' }}>
          {/* Main column on desktop / stacked on mobile */}
          <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
            <PreviewCanvas />
            <TransportBar />
            <Timeline simpleMode={simpleMode} />
            <ContextStrip />
          </div>

          {/* Toolbar — right column on desktop, bottom on mobile */}
          <div className="lg:flex lg:items-start lg:justify-center lg:pt-2">
            <BottomToolbar simpleMode={simpleMode} />
          </div>
        </div>
      </EditorErrorBoundary>
    </motion.div>
  )
}
