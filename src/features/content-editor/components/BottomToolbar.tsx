import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  Scissors,
  Type,
  SlidersHorizontal,
  SplitSquareVertical,
  Trash2,
  Gauge,
  Crop,
  Edit3,
} from 'lucide-react'
import { useEditorStore } from '../state/editorStore'
import type { EditorView } from '../state/types'

type ToolId = EditorView | 'action-split' | 'action-delete'

interface ToolDef {
  id: ToolId
  label: string
  icon: typeof Edit3
  danger?: boolean
}

const MAIN_TOOLS: ToolDef[] = [
  { id: 'edit',   label: 'Edit',   icon: Edit3 },
  { id: 'text',   label: 'Text',   icon: Type },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
]

const EDIT_SUB_TOOLS: ToolDef[] = [
  { id: 'trim',          label: 'Trim',   icon: Scissors },
  { id: 'action-split',  label: 'Split',  icon: SplitSquareVertical },
  { id: 'action-delete', label: 'Delete', icon: Trash2, danger: true },
  { id: 'speed',         label: 'Speed',  icon: Gauge },
  { id: 'crop',          label: 'Frame',  icon: Crop },
]

/**
 * Theme-aware bottom toolbar. Rounded-square icon tiles over bg-pearl,
 * tangerine-tinted when active. Morphs between main and Edit sub-group
 * with a smooth horizontal slide.
 */
export function BottomToolbar() {
  const view = useEditorStore((s) => s.view)
  const setView = useEditorStore((s) => s.setView)
  const clips = useEditorStore((s) => s.clips)
  const selectedId = useEditorStore((s) => s.selectedClipId)
  const splitClipAtCurrent = useEditorStore((s) => s.splitClipAtCurrent)
  const removeClip = useEditorStore((s) => s.removeClip)
  const hasClips = clips.length > 0

  const group: 'main' | 'editSub' =
    view === 'edit' || view === 'trim' || view === 'speed' || view === 'crop' ? 'editSub' : 'main'

  const handleTap = (tool: ToolDef) => {
    if (!hasClips) return
    switch (tool.id) {
      case 'action-split':
        splitClipAtCurrent()
        return
      case 'action-delete':
        if (selectedId) removeClip(selectedId)
        return
      default: {
        if (view === tool.id) {
          if (group === 'editSub') setView('edit')
          else setView(null)
          return
        }
        setView(tool.id as EditorView)
      }
    }
  }

  return (
    <div className="relative h-[98px]">
      <AnimatePresence mode="wait" initial={false}>
        {group === 'main' ? (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex items-center justify-center gap-2 px-2 overflow-x-auto scrollbar-none"
          >
            {MAIN_TOOLS.map((t) => (
              <ToolTile key={t.id} tool={t} active={view === t.id} disabled={!hasClips} onTap={() => handleTap(t)} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="editSub"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 flex items-center gap-1.5 px-1 overflow-x-auto scrollbar-none"
          >
            <BackChevron onClick={() => setView(null)} />
            <div className="w-px h-10 bg-border-light mx-0.5 shrink-0" />
            {EDIT_SUB_TOOLS.map((t) => (
              <ToolTile key={t.id} tool={t} active={view === t.id} disabled={!hasClips} onTap={() => handleTap(t)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────── Tile ─────────── */

interface ToolTileProps {
  tool: ToolDef
  active: boolean
  disabled: boolean
  onTap: () => void
}

function ToolTile({ tool, active, disabled, onTap }: ToolTileProps) {
  const Icon = tool.icon

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.93 }}
      onClick={disabled ? undefined : onTap}
      disabled={disabled}
      className="shrink-0 flex flex-col items-center gap-[7px] py-1.5 px-2.5 cursor-pointer disabled:cursor-not-allowed group"
      style={{ minWidth: 66 }}
    >
      <div
        className="relative w-[44px] h-[44px] rounded-[13px] flex items-center justify-center transition-colors duration-150"
        style={{
          background: disabled
            ? 'var(--color-pearl)'
            : active
            ? 'rgba(255,107,61,0.15)'
            : 'var(--color-pearl)',
          boxShadow: active ? '0 0 0 1.5px rgba(255,107,61,0.55) inset' : undefined,
        }}
      >
        <Icon
          size={19}
          strokeWidth={2.1}
          className={
            disabled
              ? 'text-ash'
              : active
              ? 'text-tangerine'
              : tool.danger
              ? 'text-live-red'
              : 'text-ink'
          }
        />
      </div>
      <span
        className={`text-[11px] font-semibold tracking-tight leading-none transition-colors duration-150 ${
          disabled ? 'text-ash' : active ? 'text-tangerine' : 'text-smoke group-hover:text-ink'
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
      className="shrink-0 flex flex-col items-center gap-[7px] py-1.5 px-2.5 cursor-pointer"
      aria-label="Back"
      style={{ minWidth: 56 }}
    >
      <div className="w-[44px] h-[44px] rounded-[13px] bg-pearl flex items-center justify-center">
        <ChevronLeft size={18} strokeWidth={2.3} className="text-ink" />
      </div>
      <span className="text-[11px] font-semibold tracking-tight text-smoke leading-none">Back</span>
    </motion.button>
  )
}
