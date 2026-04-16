import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { PreviewCanvas } from './components/PreviewCanvas'
import { TransportBar } from './components/TransportBar'
import { Timeline } from './components/Timeline'
import { ContextStrip } from './components/ContextStrip'
import { BottomToolbar } from './components/BottomToolbar'
import { EditorErrorBoundary } from './components/EditorErrorBoundary'
import { useEditorStore } from './state/editorStore'
import { useThemeStore } from '@/stores/themeStore'

interface EditorStepProps {
  direction: number
  /** When true, hides Text/Audio/Filter/Adjust/Speed/Split and keeps only
   *  Frame + Trim handles + Add clip + Replace/Delete. Used by the simple
   *  Video Reel flow. */
  simpleMode?: boolean
  /** Back/Continue row. Rendered INSIDE the main column on desktop so the
   *  buttons share the same width as the preview/timeline; rendered below
   *  the editor on mobile as part of the stacked flow. */
  footer?: ReactNode
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
export function EditorStep({ direction, simpleMode = false, footer }: EditorStepProps) {
  const view = useEditorStore((s) => s.view)
  const reset = useEditorStore((s) => s.reset)
  const resolvedTheme = useThemeStore((s) => s.resolved)
  const isLight = resolvedTheme === 'light'
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
      className={`editor-stage ${isLight ? 'editor-light' : ''}`}
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
        {/*
          Desktop layout:
            - Main column is `max-w-2xl mx-auto` so it sits centered at
              the viewport midline — preview, timeline, and back/
              continue all align with every other step in the flow.
            - Sidebar is ABSOLUTELY positioned to the right of the
              centered main column via `left: calc(50% + 336px + 24px)`
              so it doesn't offset the main column's centering.
          Mobile layout: vertical stack; sidebar hidden.
        */}
        <div className="relative flex flex-col gap-3 lg:gap-0">
          <div className="flex flex-col gap-3 lg:gap-4 w-full max-w-2xl mx-auto">
            <PreviewCanvas />
            <TransportBar />
            <Timeline simpleMode={simpleMode} />
            {/* Mobile context strip + toolbar, hidden on desktop. */}
            <div className="lg:hidden">
              <ContextStrip />
              <BottomToolbar simpleMode={simpleMode} />
            </div>
            {footer}
          </div>

          {/* Desktop sidebar — absolutely positioned relative to the
              outer wrapper so it sits to the right of the centered
              main column without affecting its centering. */}
          <div
            className="hidden lg:flex lg:flex-col lg:gap-3 lg:absolute lg:top-0 lg:w-[180px]"
            style={{ left: 'calc(50% + 336px + 24px)' }}
          >
            <BottomToolbar simpleMode={simpleMode} />
            <ContextStrip />
          </div>
        </div>
      </EditorErrorBoundary>
    </motion.div>
  )
}
