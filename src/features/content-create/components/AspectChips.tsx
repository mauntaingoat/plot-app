import type { CreateAspect } from '../types'

const OPTIONS: { id: CreateAspect; label: string }[] = [
  { id: '9:16', label: '9:16' },
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: 'original', label: 'Original' },
]

interface AspectChipsProps {
  value: CreateAspect
  onChange: (v: CreateAspect) => void
}

export function AspectChips({ value, onChange }: AspectChipsProps) {
  return (
    <div className="flex items-center gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-3.5 h-9 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
              active
                ? 'bg-tangerine text-white shadow-[0_6px_18px_rgba(255,107,61,0.35)]'
                : 'bg-white/[0.07] text-white/80 hover:bg-white/[0.12]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
