import { useThemeStore } from '@/stores/themeStore'
import type { CreateAspect } from '../types'

const OPTIONS: { id: CreateAspect; label: string; recommended?: boolean }[] = [
  { id: 'original', label: 'Original' },
  { id: '9:16', label: '9:16', recommended: true },
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '3:4', label: '3:4' },
  { id: '4:5', label: '4:5' },
  { id: '16:9', label: '16:9' },
]

interface AspectChipsProps {
  value: CreateAspect
  onChange: (v: CreateAspect) => void
}

export function AspectChips({ value, onChange }: AspectChipsProps) {
  const isDark = useThemeStore((s) => s.resolved) === 'dark'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`relative px-3.5 h-9 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
              active
                ? 'bg-tangerine text-white shadow-[0_6px_18px_rgba(255,107,61,0.35)]'
                : isDark
                ? 'bg-white/[0.07] text-white/80 hover:bg-white/[0.12]'
                : 'bg-black/[0.05] text-ink/70 hover:bg-black/[0.09]'
            }`}
          >
            {opt.label}
            {opt.recommended && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] font-bold text-white bg-tangerine px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap shadow-sm">Recommended</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
