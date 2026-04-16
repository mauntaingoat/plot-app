import { Reorder, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'

interface Item {
  id: string
  previewUrl: string
}

interface PhotoStripProps {
  items: Item[]
  onReorder: (ids: string[]) => void
  onRemove: (id: string) => void
  onAdd?: () => void
  maxItems?: number
  activeId?: string
  onSelect?: (id: string) => void
}

export function PhotoStrip({
  items,
  onReorder,
  onRemove,
  onAdd,
  maxItems,
  activeId,
  onSelect,
}: PhotoStripProps) {
  const canAdd = onAdd && (!maxItems || items.length < maxItems)
  const isDark = useThemeStore((s) => s.resolved) === 'dark'

  return (
    <div className="overflow-x-auto scrollbar-none -mx-1 px-1 pt-3 pb-1">
      <Reorder.Group
        axis="x"
        values={items.map((i) => i.id)}
        onReorder={onReorder}
        className="flex items-center gap-2"
      >
        {items.map((it) => {
          const active = it.id === activeId
          return (
            <Reorder.Item
              key={it.id}
              value={it.id}
              className="relative shrink-0"
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect?.(it.id)}
                className={`w-[72px] h-[72px] rounded-[12px] overflow-hidden cursor-pointer transition-all ${
                  active
                    ? 'ring-2 ring-tangerine'
                    : isDark
                    ? 'ring-1 ring-white/[0.08] hover:ring-white/[0.18]'
                    : 'ring-1 ring-black/[0.08] hover:ring-black/[0.18]'
                }`}
              >
                <img
                  src={it.previewUrl}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </motion.button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(it.id)
                }}
                className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${
                  isDark
                    ? 'bg-[#0A0E17] text-white ring-1 ring-white/20 hover:bg-white/15'
                    : 'bg-ink text-white ring-1 ring-black/10 hover:bg-ink/80'
                }`}
                aria-label="Remove"
              >
                <X size={11} strokeWidth={2.6} />
              </button>
            </Reorder.Item>
          )
        })}
        {canAdd && (
          <button
            onClick={onAdd}
            className={`shrink-0 w-[72px] h-[72px] rounded-[12px] border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
              isDark
                ? 'border-white/20 hover:border-white/40 text-white/60 hover:text-white'
                : 'border-black/15 hover:border-black/30 text-ink/50 hover:text-ink'
            }`}
            aria-label="Add"
          >
            <Plus size={22} strokeWidth={2.2} />
          </button>
        )}
      </Reorder.Group>
    </div>
  )
}
