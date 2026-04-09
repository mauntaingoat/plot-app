import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Palette, Check, Sparkles, TrendingUp } from 'lucide-react'
import type { Pin, UserDoc } from '@/lib/types'

// ── Saved Map Insights ──
interface SavedMapInsightsProps {
  pins: Pin[]
}

export function SavedMapInsights({ pins }: SavedMapInsightsProps) {
  // Mock cross-listing patterns. Real impl: aggregate from saves collection.
  const insights = useMemo(() => {
    if (pins.length === 0) return []
    return [
      { pattern: 'Brickell condos', overlap: 'Coral Gables homes', strength: 78, savers: 142 },
      { pattern: 'Beachfront listings', overlap: 'Sunny Isles condos', strength: 64, savers: 89 },
      { pattern: 'Coconut Grove', overlap: 'Wynwood neighborhood content', strength: 52, savers: 67 },
      { pattern: 'Listings under $1M', overlap: 'First-time buyer reels', strength: 47, savers: 213 },
    ]
  }, [pins])

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
            Saved Map Insights
            <span className="px-1.5 py-0.5 rounded-full bg-tangerine/15 text-[9px] font-bold text-tangerine uppercase tracking-wider">Studio</span>
          </h3>
          <p className="text-[11px] text-smoke mt-0.5">Cross-listing patterns from your audience</p>
        </div>
        <Bookmark size={14} className="text-smoke" />
      </div>
      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-cream rounded-[14px] p-3.5"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-smoke">Users who save</p>
                <p className="text-[13px] font-bold text-ink truncate">{ins.pattern}</p>
                <p className="text-[12px] text-smoke mt-1">also save</p>
                <p className="text-[13px] font-bold text-tangerine truncate">{ins.overlap}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[18px] font-extrabold text-ink font-mono">{ins.strength}%</span>
                <span className="text-[10px] text-smoke">overlap</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-2 border-t border-border-light">
              <TrendingUp size={11} className="text-sold-green" />
              <span className="text-[11px] text-smoke">Based on {ins.savers} savers</span>
            </div>
          </motion.div>
        ))}
        {insights.length === 0 && <p className="text-[12px] text-smoke text-center py-4">No save data yet.</p>}
      </div>
    </div>
  )
}

// ── Custom Branding (Color Picker) ──
interface CustomBrandingProps {
  user: UserDoc
  onSave: (color: string | null) => void
}

const BRAND_PRESETS = [
  { name: 'Tangerine', color: '#FF6B3D' },
  { name: 'Royal', color: '#3B82F6' },
  { name: 'Forest', color: '#10B981' },
  { name: 'Plum', color: '#A855F7' },
  { name: 'Sunset', color: '#F59E0B' },
  { name: 'Crimson', color: '#EF4444' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Slate', color: '#475569' },
]

export function CustomBranding({ user, onSave }: CustomBrandingProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(user.brandColor)
  const [customColor, setCustomColor] = useState<string>(user.brandColor || '#FF6B3D')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setSelectedColor(user.brandColor)
    setCustomColor(user.brandColor || '#FF6B3D')
    setDirty(false)
  }, [user.brandColor])

  const handlePreset = (color: string) => {
    setSelectedColor(color)
    setCustomColor(color)
    setDirty(true)
  }

  const handleCustom = (color: string) => {
    setCustomColor(color)
    setSelectedColor(color)
    setDirty(true)
  }

  const handleSave = () => {
    onSave(selectedColor)
    setDirty(false)
  }

  const handleReset = () => {
    setSelectedColor(null)
    setCustomColor('#FF6B3D')
    setDirty(true)
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink flex items-center gap-2">
            Custom Branding
            <span className="px-1.5 py-0.5 rounded-full bg-tangerine/15 text-[9px] font-bold text-tangerine uppercase tracking-wider">Studio</span>
          </h3>
          <p className="text-[11px] text-smoke mt-0.5">Your brand color appears throughout your Reelst</p>
        </div>
        <Palette size={14} className="text-smoke" />
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 bg-cream rounded-[14px] p-4 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: selectedColor || '#FF6B3D' }}
        >
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-ink">Preview</p>
          <p className="text-[11px] text-smoke">{selectedColor ? `Brand color: ${selectedColor}` : 'Default tangerine'}</p>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {BRAND_PRESETS.map((p) => {
          const isSelected = selectedColor?.toLowerCase() === p.color.toLowerCase()
          return (
            <button
              key={p.color}
              onClick={() => handlePreset(p.color)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${isSelected ? 'ring-2 ring-offset-2 ring-ink scale-105' : 'group-hover:scale-105'}`}
                style={{ background: p.color }}
              >
                {isSelected && <Check size={16} className="text-white" />}
              </div>
              <span className="text-[10px] font-medium text-smoke">{p.name}</span>
            </button>
          )
        })}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="color"
          value={customColor}
          onChange={(e) => handleCustom(e.target.value)}
          className="w-10 h-10 rounded-lg border border-border-light cursor-pointer"
        />
        <input
          type="text"
          value={customColor}
          onChange={(e) => {
            const val = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) handleCustom(val)
          }}
          placeholder="#FF6B3D"
          maxLength={7}
          className="flex-1 h-10 rounded-lg border border-border-light px-3 text-[13px] font-mono text-ink outline-none focus:border-tangerine/40 transition-colors bg-warm-white"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 h-10 rounded-lg bg-cream text-[13px] font-semibold text-smoke cursor-pointer hover:bg-pearl transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex-[2] h-10 rounded-lg bg-gradient-to-r from-tangerine to-ember text-[13px] font-bold text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-glow-tangerine transition-shadow"
        >
          Save brand color
        </button>
      </div>
    </div>
  )
}
