import { AnimatePresence, motion } from 'framer-motion'
import { useRef } from 'react'
import { CaretLeft as ChevronLeft, TextAa as Type, Sliders as SlidersHorizontal, Crop, Microphone as Mic, Sparkle as Sparkles, Columns as SplitSquareVertical, ArrowsClockwise as RefreshCw, Gauge, Trash as Trash2 } from '@phosphor-icons/react'
import { useEditorStore } from '../state/editorStore'
import type { EditorView, FontKey, TextOverlay } from '../state/types'
import { loadAllFonts } from '../lib/fonts'

type ToolId = EditorView | 'action-split' | 'action-delete' | 'action-replace'

interface ToolDef {
  id: ToolId
  label: string
  icon: typeof Type
  danger?: boolean
}

const MAIN_TOOLS: ToolDef[] = [
  { id: 'text',   label: 'Text',   icon: Type },
  { id: 'audio',  label: 'Audio',  icon: Mic },
  { id: 'filter', label: 'Filter', icon: Sparkles },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'crop',   label: 'Frame',  icon: Crop },
]

// Simple-mode main tools: empty. Frame is now a floating overlay on the
// preview itself, so there's no reason to duplicate it in the toolbar.
const SIMPLE_MAIN_TOOLS: ToolDef[] = []

const CLIP_SUB_TOOLS: ToolDef[] = [
  { id: 'action-split',   label: 'Split',   icon: SplitSquareVertical },
  { id: 'action-replace', label: 'Replace', icon: RefreshCw },
  { id: 'speed',          label: 'Speed',   icon: Gauge },
  { id: 'action-delete',  label: 'Delete',  icon: Trash2, danger: true },
]

const SIMPLE_CLIP_SUB_TOOLS: ToolDef[] = [
  { id: 'action-replace', label: 'Replace', icon: RefreshCw },
  { id: 'action-delete',  label: 'Delete',  icon: Trash2, danger: true },
]

/**
 * Toolbar — responsive layout:
 *   - Desktop (lg+): vertical column on the right side of the editor grid
 *   - Mobile: horizontal row pinned below the timeline / strip
 */
export function BottomToolbar({ simpleMode = false }: { simpleMode?: boolean } = {}) {
  const view = useEditorStore((s) => s.view)
  const setView = useEditorStore((s) => s.setView)
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const splitClipAtCurrent = useEditorStore((s) => s.splitClipAtCurrent)
  const removeClip = useEditorStore((s) => s.removeClip)
  const replaceClip = useEditorStore((s) => s.replaceClip)
  const addOverlayAtPlayhead = useEditorStore((s) => s.addOverlayAtPlayhead)
  const hasClips = clips.length > 0

  const replaceFileRef = useRef<HTMLInputElement | null>(null)

  const showSubTools = !!selectedId && hasClips && (view === null || view === 'speed')

  const handleTap = (tool: ToolDef) => {
    if (!hasClips) return
    switch (tool.id) {
      case 'action-split':
        splitClipAtCurrent()
        return
      case 'action-delete':
        if (selectedId) removeClip(selectedId)
        return
      case 'action-replace':
        replaceFileRef.current?.click()
        return
      default: {
        if (view === tool.id) {
          setView(null)
          return
        }
        if (tool.id === 'text') {
          loadAllFonts() // pull Google Fonts on demand
          const exists = useEditorStore.getState().overlays.length > 0
          if (!exists) addOverlayAtPlayhead()
        }
        setView(tool.id as EditorView)
      }
    }
  }

  const onReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && selectedId) {
      replaceClip(selectedId, file).catch((err) => console.warn('replace failed', err))
    }
    e.target.value = ''
  }

  const tools = showSubTools
    ? (simpleMode ? SIMPLE_CLIP_SUB_TOOLS : CLIP_SUB_TOOLS)
    : (simpleMode ? SIMPLE_MAIN_TOOLS : MAIN_TOOLS)

  // In simple mode the main tool list is empty (Frame lives on the
  // preview as an overlay). Hide the toolbar row entirely unless a clip
  // is selected (sub-tools Replace/Delete). Applies to BOTH mobile and
  // desktop — desktop sidebar just shows nothing when not sub-tooling.
  const hideBar = simpleMode && !showSubTools

  return (
    <>
      {/* ─── Mobile: horizontal row ─── */}
      <div className={`lg:hidden ${hideBar ? 'hidden' : ''}`}>
        <div className="relative h-[88px] flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={showSubTools ? 'sub' : 'main'}
              initial={{ opacity: 0, x: showSubTools ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: showSubTools ? -16 : 16 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 flex items-center gap-1.5 px-3 overflow-x-auto scrollbar-none"
            >
              {showSubTools && <BackChevron onClick={() => useEditorStore.getState().selectClip(null)} />}
              {tools.map((t) => (
                <Tile
                  key={t.id}
                  tool={t}
                  active={view === t.id}
                  disabled={!hasClips}
                  onTap={() => handleTap(t)}
                  layout="horizontal"
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Desktop: vertical column ─── */}
      <div className={`hidden lg:block w-full ${hideBar ? 'lg:hidden' : ''}`}>
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={showSubTools ? 'sub' : 'main'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-col items-stretch gap-2"
            >
              {showSubTools && (
                <button
                  onClick={() => useEditorStore.getState().selectClip(null)}
                  className="flex items-center justify-center gap-2 h-10 rounded-[12px] ed-surface-06 hover:ed-surface-11 cursor-pointer transition-colors ed-fg-85 text-[11px] font-semibold"
                  aria-label="Back"
                >
                  <ChevronLeft weight="bold" size={15} />
                  Back
                </button>
              )}
              {tools.map((t) => (
                <Tile
                  key={t.id}
                  tool={t}
                  active={view === t.id}
                  disabled={!hasClips}
                  onTap={() => handleTap(t)}
                  layout="vertical"
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <input
        ref={replaceFileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onReplaceFile}
      />
    </>
  )
}

/* ─────────── Tile (responsive) ─────────── */

function Tile({
  tool,
  active,
  disabled,
  onTap,
  layout,
}: {
  tool: ToolDef
  active: boolean
  disabled: boolean
  onTap: () => void
  layout: 'horizontal' | 'vertical'
}) {
  const Icon = tool.icon
  const horizontal = layout === 'horizontal'

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.93 }}
      onClick={disabled ? undefined : onTap}
      disabled={disabled}
      className={`shrink-0 cursor-pointer disabled:cursor-not-allowed group flex ${
        horizontal ? 'flex-col items-center gap-[7px] py-1 px-2.5' : 'flex-row items-center gap-3 px-3 py-2 rounded-[12px]'
      }`}
      style={
        horizontal
          ? { minWidth: 64 }
          : {
              background: active ? 'rgba(255,107,61,0.10)' : 'rgba(var(--ed-fg), 0.04)',
              boxShadow: active ? '0 0 0 1.5px rgba(255,107,61,0.45) inset' : undefined,
            }
      }
    >
      <div
        className={`relative flex items-center justify-center transition-colors duration-150 ${
          horizontal ? 'w-[44px] h-[44px] rounded-[13px]' : 'w-[34px] h-[34px] rounded-[10px]'
        }`}
        style={{
          background: horizontal
            ? disabled
              ? 'rgba(var(--ed-fg), 0.04)'
              : active
              ? 'rgba(255,107,61,0.16)'
              : 'rgba(var(--ed-fg), 0.08)'
            : 'transparent',
          boxShadow: horizontal && active ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
        }}
      >
        <Icon
          size={horizontal ? 19 : 17}
          className={
            disabled
              ? 'ed-fg-22'
              : active
              ? 'text-tangerine'
              : tool.danger
              ? 'text-live-red'
              : 'ed-fg-85'
          }
        />
      </div>
      <span
        className={`font-semibold tracking-tight leading-none transition-colors duration-150 ${
          horizontal ? 'text-[11px]' : 'text-[12px]'
        } ${
          disabled ? 'ed-fg-22' : active ? 'text-tangerine' : 'ed-fg-65 group-hover:ed-fg-95'
        }`}
      >
        {tool.label}
      </span>
    </motion.button>
  )
}

function BackChevron({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="shrink-0 flex flex-col items-center gap-[7px] py-1 px-2.5 cursor-pointer"
      aria-label="Back"
      style={{ minWidth: 56 }}
    >
      <div className="w-[44px] h-[44px] rounded-[13px] ed-surface-08 flex items-center justify-center">
        <ChevronLeft weight="bold" size={18} className="ed-fg-85" />
      </div>
      <span className="text-[11px] font-semibold tracking-tight ed-fg-65 leading-none">Back</span>
    </motion.button>
  )
}
