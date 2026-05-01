import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Palette,
  ArrowsClockwise as RefreshCw,
  Eye,
  Plus,
  X,
  PencilSimple as Edit3,
  Camera,
  House,
  LinkSimple as Link2,
  DotsSixVertical as GripVertical,
} from '@phosphor-icons/react'
import type { UserDoc, Platform } from '@/lib/types'
import {
  PALETTES,
  FONTS,
  SHAPES,
  DEFAULT_STYLE,
  resolveStyle,
  type AgentStyle,
  type FrameStyle,
  type TickerAutoKey,
  getPalette,
  getFont,
  getShape,
} from '@/lib/style'
import { PLATFORM_LIST, PLATFORM_LOGOS_MONO } from '@/components/icons/PlatformLogos'

/* ════════════════════════════════════════════════════════════════
   STYLE TAB — agent profile customization editor
   ────────────────────────────────────────────────────────────────
   Sections (in order):
     1. Profile basics  (name / bio / brokerage / photo)
     2. Color palette   (11 themes — 8 solid + 3 patterned)
     3. Font            (6 pairings)
     4. Map shape       (9 shapes — 6 geometric + 3 organic blobs)
     5. Frames          (avatar / map / listings — 4 options each)
     6. Sections        (show/hide bio, ticker, social, map)
     7. Ticker stats    (auto toggles + custom items)
     8. CTA labels      (Wave / Save button text)
     9. Social & site links
     10. Reset to defaults
   Every change writes through `onUpdate` — both to local Zustand
   state (so the preview iframe can re-fetch + re-render right
   away) and to Firestore.
   ──────────────────────────────────────────────────────────────── */

interface StyleTabProps {
  user: UserDoc
  isDesktop: boolean
  onUpdateUser: (patch: Partial<UserDoc>) => Promise<void> | void
  onOpenEditProfile: () => void
  onOpenAddPlatform: () => void
  onRemovePlatform: (platformId: string) => void
}

export function StyleTab({
  user,
  isDesktop,
  onUpdateUser,
  onOpenEditProfile,
  onOpenAddPlatform,
  onRemovePlatform,
}: StyleTabProps) {
  const style = useMemo(() => resolveStyle(user.style), [user.style])

  const updateStyle = useCallback(
    (patch: Partial<AgentStyle>) => {
      onUpdateUser({ style: { ...style, ...patch } })
    },
    [onUpdateUser, style]
  )

  const updateFrames = useCallback(
    (patch: Partial<AgentStyle['frames']>) => updateStyle({ frames: { ...style.frames, ...patch } }),
    [style.frames, updateStyle]
  )

  const updateSections = useCallback(
    (patch: Partial<AgentStyle['sections']>) => updateStyle({ sections: { ...style.sections, ...patch } }),
    [style.sections, updateStyle]
  )

  const updateTickerAuto = useCallback(
    (key: TickerAutoKey, value: boolean) =>
      updateStyle({ tickerAuto: { ...style.tickerAuto, [key]: value } }),
    [style.tickerAuto, updateStyle]
  )

  const reset = useCallback(() => onUpdateUser({ style: DEFAULT_STYLE }), [onUpdateUser])

  return (
    <div className={isDesktop ? 'space-y-5' : 'px-5 py-5 space-y-5'}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)', color: '#fff' }}
        >
          <Palette weight="bold" size={18} />
        </div>
        <div>
          <p className="text-[18px] font-bold text-ink">Style your Reelst</p>
          <p className="text-[13px] text-smoke">Pick a palette, font, map shape, and more. Changes save automatically.</p>
        </div>
      </div>

      {/* ── 1. Profile basics ── */}
      <Section title="Profile basics" subtitle="Name, bio, photo, brokerage">
        <div className="flex items-center gap-3">
          <div
            className="relative w-14 h-14 rounded-full overflow-hidden shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)' }}
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-white text-[22px] font-semibold">
                {(user.displayName || 'A').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-ink truncate">{user.displayName || 'Add your name'}</p>
            <p className="text-[12px] text-smoke truncate">{user.bio || 'Add a short bio'}</p>
            {user.brokerage && <p className="text-[11.5px] text-ash truncate">{user.brokerage}</p>}
          </div>
          <button
            onClick={onOpenEditProfile}
            className="px-3 py-2 rounded-[10px] bg-pearl text-[12.5px] font-medium text-ink cursor-pointer hover:bg-cream transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Edit3 size={13} /> Edit
          </button>
        </div>
      </Section>

      {/* ── 2. Color palette ── */}
      <Section title="Color palette" subtitle="12 themes — light, dark, gradient, pattern">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PALETTES.map((p) => (
            <PaletteCard
              key={p.id}
              palette={p}
              active={style.paletteId === p.id}
              onClick={() => updateStyle({ paletteId: p.id })}
            />
          ))}
        </div>
      </Section>

      {/* ── 3. Font ── */}
      <Section title="Font" subtitle="Headers + body pairings">
        <div className="grid grid-cols-2 gap-2.5">
          {FONTS.map((f) => (
            <FontCard
              key={f.id}
              font={f}
              active={style.fontId === f.id}
              onClick={() => updateStyle({ fontId: f.id })}
            />
          ))}
        </div>
      </Section>

      {/* ── 4. Map shape ── */}
      <Section title="Map shape" subtitle="The signature element of your Reelst">
        <div className="grid grid-cols-3 gap-2.5">
          {SHAPES.map((s) => (
            <ShapeCard
              key={s.id}
              shape={s}
              active={style.shapeId === s.id}
              accent={getPalette(style.paletteId).accent}
              onClick={() => updateStyle({ shapeId: s.id })}
            />
          ))}
        </div>
      </Section>

      {/* ── 5. Frames ── */}
      <Section title="Frames" subtitle="Borders + shadows for each surface">
        <div className="space-y-3">
          <FrameRow label="Profile photo" icon={<Camera size={15} />} value={style.frames.avatar} onChange={(v) => updateFrames({ avatar: v })} />
          <FrameRow label="Map viewport" icon={<House size={15} />} value={style.frames.map} onChange={(v) => updateFrames({ map: v })} />
          <FrameRow label="Listings" icon={<Eye size={15} />} value={style.frames.listings} onChange={(v) => updateFrames({ listings: v })} />
        </div>
      </Section>

      {/* ── 6. Section visibility ── */}
      <Section title="Sections" subtitle="Show or hide parts of your profile">
        <div className="space-y-2">
          <ToggleRow label="Bio"           value={style.sections.bio}    onChange={(v) => updateSections({ bio: v })} />
          <ToggleRow label="Ticker stats"  value={style.sections.ticker} onChange={(v) => updateSections({ ticker: v })} />
          <ToggleRow label="Social row"    value={style.sections.social} onChange={(v) => updateSections({ social: v })} />
          <ToggleRow label="Map viewport"  value={style.sections.map}    onChange={(v) => updateSections({ map: v })} />
        </div>
      </Section>

      {/* ── 7. Ticker stats ── */}
      <Section title="Ticker stats" subtitle="The cycling line under your name">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider pt-1 pb-1">From your listings</p>
          <ToggleRow label="Homes for sale"    value={style.tickerAuto.for_sale}    onChange={(v) => updateTickerAuto('for_sale', v)} />
          <ToggleRow label="Homes sold"        value={style.tickerAuto.sold}        onChange={(v) => updateTickerAuto('sold', v)} />
          <ToggleRow label="Open houses"       value={style.tickerAuto.open_houses} onChange={(v) => updateTickerAuto('open_houses', v)} />
          <ToggleRow label="Spotlights live"   value={style.tickerAuto.spotlights}  onChange={(v) => updateTickerAuto('spotlights', v)} />

          <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider pt-3 pb-1">Custom</p>
          <CustomTickerEditor
            items={style.tickerCustom}
            onChange={(items) => updateStyle({ tickerCustom: items })}
          />
        </div>
      </Section>

      {/* ── 8. Social & site links ── */}
      <Section
        title="Social & site links"
        subtitle="Toggle, edit, and reorder — shows below your bio"
        action={
          <button
            onClick={onOpenAddPlatform}
            className="px-3 py-1.5 rounded-[10px] bg-tangerine text-white text-[12.5px] font-medium cursor-pointer hover:bg-tangerine/90 transition-colors flex items-center gap-1.5"
          >
            <Plus size={13} weight="bold" /> Add
          </button>
        }
      >
        {user.platforms && user.platforms.length > 0 ? (
          <div className="space-y-2">
            {user.platforms.map((p) => (
              <PlatformRow key={p.id} platform={p} onRemove={() => onRemovePlatform(p.id)} onEdit={onOpenAddPlatform} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-smoke text-center py-2">No links added yet — tap "Add" to connect your platforms.</p>
        )}
      </Section>

      {/* ── 10. Reset ── */}
      <div className="pt-2">
        <button
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-cream border border-border-light text-[13.5px] font-medium text-graphite cursor-pointer hover:bg-pearl transition-colors"
        >
          <RefreshCw size={14} /> Reset to defaults
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   Section — common card chrome for every block above
   ─────────────────────────────────────────────────────────────── */
function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-warm-white border border-border-light rounded-[18px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[14px] font-bold text-ink">{title}</p>
          {subtitle && <p className="text-[12px] text-smoke mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   PaletteCard — swatch picker chip
   ─────────────────────────────────────────────────────────────── */
function PaletteCard({
  palette,
  active,
  onClick,
}: {
  palette: ReturnType<typeof getPalette>
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-[14px] overflow-hidden text-left cursor-pointer transition-all"
      style={{
        outline: active ? '2px solid #D94A1F' : '1px solid var(--color-border-light)',
        outlineOffset: active ? '2px' : '0',
      }}
    >
      <div className="aspect-[5/3] relative" style={{ background: palette.pageCanvas }}>
        {/* Card surface preview */}
        <div
          className="absolute inset-x-3 bottom-3 top-7 rounded-[8px] flex flex-col justify-end p-2"
          style={{ background: palette.cardBg, border: `1px solid ${palette.border}` }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: palette.accent }} />
            <div className="h-1.5 rounded-sm flex-1" style={{ background: palette.textPrimary, opacity: 0.55 }} />
          </div>
        </div>
      </div>
      <div className="px-2.5 py-2 bg-warm-white">
        <p className="text-[12.5px] font-semibold text-ink truncate">{palette.name}</p>
        <p className="text-[10.5px] text-smoke truncate">{palette.vibe}</p>
      </div>
    </motion.button>
  )
}

/* ───────────────────────────────────────────────────────────────
   FontCard — display-font preview
   ─────────────────────────────────────────────────────────────── */
function FontCard({
  font,
  active,
  onClick,
}: {
  font: ReturnType<typeof getFont>
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-[14px] p-3.5 text-left cursor-pointer bg-warm-white transition-all"
      style={{
        outline: active ? '2px solid #D94A1F' : '1px solid var(--color-border-light)',
        outlineOffset: active ? '2px' : '0',
      }}
    >
      <p className="text-[22px] leading-tight text-ink truncate" style={{ fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.02em' }}>
        Aa
      </p>
      <p className="text-[12.5px] font-semibold text-ink mt-2">{font.name}</p>
      <p className="text-[10.5px] text-smoke truncate">{font.vibe}</p>
    </motion.button>
  )
}

/* ───────────────────────────────────────────────────────────────
   ShapeCard — clip-path SVG preview
   ─────────────────────────────────────────────────────────────── */
function ShapeCard({
  shape,
  active,
  accent,
  onClick,
}: {
  shape: (typeof SHAPES)[number]
  active: boolean
  accent: string
  onClick: () => void
}) {
  // Render the path inside an inline SVG so it shows the actual
  // shape — same generator the live profile uses, scaled to fit.
  // We pull the raw `d` from the path() string by stripping the
  // `path('...')` wrapper.
  const rawClip = shape.path(36, 36, 60)
  const dMatch = rawClip.match(/path\('([^']+)'\)/)
  const dAttr = dMatch ? dMatch[1] : ''
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative rounded-[14px] p-3 text-center cursor-pointer bg-warm-white transition-all"
      style={{
        outline: active ? '2px solid #D94A1F' : '1px solid var(--color-border-light)',
        outlineOffset: active ? '2px' : '0',
      }}
    >
      <svg width="100%" viewBox="0 0 72 72" className="mb-1.5">
        <path d={dAttr} fill={accent} />
      </svg>
      <p className="text-[11.5px] font-semibold text-ink truncate">{shape.name}</p>
    </motion.button>
  )
}

/* ───────────────────────────────────────────────────────────────
   FrameRow — surface + 4-option segmented selector
   ─────────────────────────────────────────────────────────────── */
const FRAME_OPTIONS: { id: FrameStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'border', label: 'Border' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'border_shadow', label: 'Both' },
]

function FrameRow({
  label,
  icon,
  value,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  value: FrameStyle
  onChange: (v: FrameStyle) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-[120px] shrink-0">
        <div className="w-7 h-7 rounded-[8px] bg-pearl flex items-center justify-center text-graphite">{icon}</div>
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </div>
      <div className="flex-1 grid grid-cols-4 gap-1 p-0.5 rounded-[10px] bg-cream">
        {FRAME_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="py-1.5 rounded-[8px] text-[11.5px] font-medium cursor-pointer transition-colors"
            style={{
              background: value === o.id ? '#fff' : 'transparent',
              color: value === o.id ? '#0A0E17' : '#6B6F7A',
              boxShadow: value === o.id ? '0 1px 3px rgba(0,0,0,0.06)' : undefined,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   ToggleRow — labeled iOS-style switch
   ─────────────────────────────────────────────────────────────── */
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[13.5px] text-ink">{label}</span>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className="relative w-[42px] h-[24px] rounded-full cursor-pointer transition-colors shrink-0"
        style={{ background: value ? '#34C759' : '#D6D6D6' }}
      >
        <span
          className="absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   CustomTickerEditor — add/remove/edit hand-typed phrases
   ─────────────────────────────────────────────────────────────── */
function CustomTickerEditor({
  items,
  onChange,
}: {
  items: AgentStyle['tickerCustom']
  onChange: (next: AgentStyle['tickerCustom']) => void
}) {
  const [newLabel, setNewLabel] = useState('')

  const add = () => {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    onChange([...items, { id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: trimmed }])
    setNewLabel('')
  }

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          <input
            type="text"
            value={it.label}
            onChange={(e) =>
              onChange(items.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)))
            }
            className="flex-1 h-9 px-3 rounded-[10px] bg-cream border border-border-light text-[13px] text-ink outline-none focus:border-tangerine/50"
          />
          <button
            onClick={() => onChange(items.filter((x) => x.id !== it.id))}
            className="w-9 h-9 rounded-[10px] bg-cream flex items-center justify-center text-graphite cursor-pointer hover:bg-pearl"
            aria-label="Remove ticker item"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="$42M total volume sold"
          className="flex-1 h-9 px-3 rounded-[10px] bg-cream border border-dashed border-border-light text-[13px] text-ink outline-none focus:border-tangerine/50 placeholder:text-ash"
        />
        <button
          onClick={add}
          disabled={!newLabel.trim()}
          className="px-3 h-9 rounded-[10px] bg-tangerine text-white text-[12.5px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus size={13} weight="bold" /> Add
        </button>
      </div>
      <p className="text-[11px] text-smoke">
        Examples: <span className="italic">"$42M total volume sold"</span> · <span className="italic">"7 years experience"</span> · <span className="italic">"500+ happy clients"</span>
      </p>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   PlatformRow — single connected platform with edit + remove
   ─────────────────────────────────────────────────────────────── */
function PlatformRow({
  platform,
  onEdit,
  onRemove,
}: {
  platform: Platform
  onEdit: () => void
  onRemove: () => void
}) {
  const meta = PLATFORM_LIST.find((p) => p.id === platform.id)
  const Logo = PLATFORM_LOGOS_MONO[platform.id.toLowerCase()]
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] bg-cream">
      <GripVertical size={14} className="text-ash shrink-0" />
      <div className="w-7 h-7 rounded-[8px] bg-warm-white flex items-center justify-center text-ink shrink-0">
        {Logo ? <Logo size={16} /> : <Link2 size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink truncate">{meta?.label || platform.id}</p>
        <p className="text-[11.5px] text-smoke truncate">{platform.username}</p>
      </div>
      <button
        onClick={onEdit}
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-graphite cursor-pointer hover:bg-pearl"
        aria-label={`Edit ${meta?.label || platform.id}`}
      >
        <Edit3 size={13} />
      </button>
      <button
        onClick={onRemove}
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-live-red/70 cursor-pointer hover:bg-live-red/10"
        aria-label={`Remove ${meta?.label || platform.id}`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
