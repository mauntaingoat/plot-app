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
  Buildings as Building,
  CaretRight as ChevronRight,
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
  onOpenEditBrokerage: () => void
  onOpenAddPlatform: () => void
  onRemovePlatform: (platformId: string) => void
}

export function StyleTab({
  user,
  isDesktop,
  onUpdateUser,
  onOpenEditProfile,
  onOpenEditBrokerage,
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
          </div>
          <button
            onClick={onOpenEditProfile}
            className="px-3 py-2 rounded-[10px] bg-pearl text-[12.5px] font-medium text-ink cursor-pointer hover:bg-cream transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Edit3 size={13} /> Edit
          </button>
        </div>

        {/* Brokerage / company — separate row since it routes to its
            own modal (not the name/bio/photo edit sheet) and reads as
            a distinct piece of info. Empty state nudges the agent to
            add it; filled state shows the value with a chevron. */}
        <button
          onClick={onOpenEditBrokerage}
          className="mt-3 w-full flex items-center gap-3 p-3 rounded-[12px] bg-cream hover:bg-pearl transition-colors cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-full bg-pearl flex items-center justify-center shrink-0">
            <Building size={15} className="text-graphite" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-ink truncate">
              {user.brokerage || 'Add brokerage / company'}
            </p>
            <p className="text-[11.5px] text-smoke truncate">
              {user.brokerage ? 'Tap to edit' : 'Shown on your About page + verified badge'}
            </p>
          </div>
          <ChevronRight size={14} className="text-ash shrink-0" />
        </button>
      </Section>

      {/* ── 2. Color palette ── */}
      <Section
        title="Color palette"
        subtitle="Light, dark, gradient, pattern"
        collapsible
        collapsedPreview={<PaletteSwatchPreview palette={getPalette(style.paletteId)} />}
      >
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
      <Section
        title="Font"
        subtitle="Headers + body pairings"
        collapsible
        collapsedPreview={<FontNamePreview font={getFont(style.fontId)} />}
      >
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
      <Section
        title="Map shape"
        subtitle="The signature element of your Reelst"
        collapsible
        collapsedPreview={<ShapeGlyphPreview shape={getShape(style.shapeId)} accent={getPalette(style.paletteId).accent} />}
      >
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

      {/* ── Listings layout ── */}
      <Section title="Listings layout" subtitle="How your content cards lay out below the map">
        <div className="grid grid-cols-2 gap-2.5">
          <LayoutCard
            id="scroller"
            name="Scroller"
            vibe="Grid up to 3 · swipe sideways for more"
            active={style.listingsLayout === 'scroller'}
            onClick={() => updateStyle({ listingsLayout: 'scroller' })}
          />
          <LayoutCard
            id="grid"
            name="Grid"
            vibe="Wraps onto more rows · no horizontal scroll"
            active={style.listingsLayout === 'grid'}
            onClick={() => updateStyle({ listingsLayout: 'grid' })}
          />
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
            className="brand-btn-flat px-3 py-1.5 text-[12.5px] font-bold cursor-pointer flex items-center gap-1.5"
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
  collapsible,
  defaultCollapsed = true,
  collapsedPreview,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  /** Enables expand/collapse on the section. When collapsed, only
   *  the header + `collapsedPreview` show — children are hidden. */
  collapsible?: boolean
  /** Initial collapse state when `collapsible` is true. Defaults to
   *  collapsed so the Style tab opens compact. */
  defaultCollapsed?: boolean
  /** Slim preview of the currently-selected item, shown to the right
   *  of the header while collapsed (e.g., active palette swatch,
   *  font name, shape glyph). Only used when `collapsible` is true. */
  collapsedPreview?: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(collapsible ? defaultCollapsed : false)
  const isCollapsed = collapsible && collapsed

  const HeaderInner = (
    <>
      <div className="min-w-0 text-left flex-1">
        <p className="text-[14px] font-bold text-ink">{title}</p>
        {subtitle && <p className="text-[12px] text-smoke mt-0.5">{subtitle}</p>}
      </div>
      {collapsible ? (
        <div className="flex items-center gap-2.5 shrink-0">
          {isCollapsed && collapsedPreview}
          <ChevronRight
            size={14}
            className="text-ash transition-transform"
            style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
          />
        </div>
      ) : (
        action
      )}
    </>
  )

  return (
    <div className="bg-warm-white border border-border-light rounded-[18px] p-4 sm:p-5">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!isCollapsed}
          className={`w-full flex items-start justify-between gap-3 cursor-pointer ${isCollapsed ? '' : 'mb-3'}`}
        >
          {HeaderInner}
        </button>
      ) : (
        <div className="flex items-start justify-between gap-3 mb-3">{HeaderInner}</div>
      )}
      {!isCollapsed && children}
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
   Collapsed-section previews — slim "active item" chips rendered to
   the right of a Section header when it's collapsed. They give the
   agent at-a-glance feedback for what's currently selected without
   expanding the picker.
   ─────────────────────────────────────────────────────────────── */
function PaletteSwatchPreview({ palette }: { palette: ReturnType<typeof getPalette> }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-1">
        <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ background: palette.cardBg }} />
        <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ background: palette.accent }} />
        <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ background: palette.textPrimary }} />
      </div>
      <span className="text-[12px] font-semibold text-ink truncate max-w-[100px]">{palette.name}</span>
    </div>
  )
}

function FontNamePreview({ font }: { font: ReturnType<typeof getFont> }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[16px] text-ink leading-none"
        style={{ fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.02em' }}
      >
        Aa
      </span>
      <span className="text-[12px] font-semibold text-ink truncate max-w-[100px]">{font.name}</span>
    </div>
  )
}

function ShapeGlyphPreview({ shape, accent }: { shape: (typeof SHAPES)[number]; accent: string }) {
  // Same path-extraction trick as ShapeCard — pull the SVG `d` out of
  // the wrapper string so we can render the actual silhouette.
  const rawClip = shape.path(11, 11, 18)
  const dMatch = rawClip.match(/path\('([^']+)'\)/)
  const dAttr = dMatch ? dMatch[1] : ''
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <path d={dAttr} fill={accent} />
      </svg>
      <span className="text-[12px] font-semibold text-ink truncate max-w-[100px]">{shape.name}</span>
    </div>
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
function LayoutCard({
  id,
  name,
  vibe,
  active,
  onClick,
}: {
  id: 'scroller' | 'grid'
  name: string
  vibe: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-[14px] p-3.5 text-left cursor-pointer transition-colors"
      style={{
        background: active ? 'var(--brand-soft, #FFE5DA)' : 'var(--color-warm-white, #FAFAF8)',
        outline: active ? '2px solid var(--brand-orange, #D94A1F)' : '1px solid var(--color-border-light, rgba(10,14,23,0.10))',
        outlineOffset: active ? '-2px' : '-1px',
      }}
    >
      <div className="h-[54px] mb-2 rounded-[10px] bg-cream overflow-hidden relative">
        {id === 'scroller' ? (
          <div className="absolute inset-0 flex items-center gap-1.5 px-2">
            <div className="w-[28%] h-[44px] rounded-[6px] bg-pearl shrink-0" />
            <div className="w-[28%] h-[44px] rounded-[6px] bg-pearl shrink-0" />
            <div className="w-[28%] h-[44px] rounded-[6px] bg-pearl shrink-0" />
            <div className="w-[28%] h-[44px] rounded-[6px] bg-pearl/70 shrink-0" />
            <div className="w-[28%] h-[44px] rounded-[6px] bg-pearl/40 shrink-0" />
          </div>
        ) : (
          // 3×2 grid — illustrates the wrapping behavior (no horizontal
          // scroll; rows stack downward as more cards are added).
          <div className="absolute inset-0 grid grid-cols-3 gap-1 p-1.5">
            <div className="rounded-[4px] bg-pearl" />
            <div className="rounded-[4px] bg-pearl" />
            <div className="rounded-[4px] bg-pearl" />
            <div className="rounded-[4px] bg-pearl" />
            <div className="rounded-[4px] bg-pearl" />
            <div className="rounded-[4px] bg-pearl" />
          </div>
        )}
      </div>
      {/* Active card has a cream/peach bg that does NOT theme with
          the dashboard — so theme-aware `text-ink` / `text-smoke`
          (which flip to light in dark mode) become invisible on it.
          Pin the colors to dark hex values when active so the labels
          stay legible regardless of dashboard theme. */}
      <p
        className="text-[13px] font-bold text-ink"
        style={active ? { color: '#0A0E17' } : undefined}
      >
        {name}
      </p>
      <p
        className="text-[11px] text-smoke"
        style={active ? { color: 'rgba(10,14,23,0.6)' } : undefined}
      >
        {vibe}
      </p>
    </button>
  )
}

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
          className="brand-btn-flat px-3 h-9 text-[12.5px] font-bold cursor-pointer flex items-center gap-1"
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
        <p className="text-[13px] font-semibold text-ink truncate">{meta?.name || platform.id}</p>
        <p className="text-[11.5px] text-smoke truncate">{platform.username}</p>
      </div>
      <button
        onClick={onEdit}
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-graphite cursor-pointer hover:bg-pearl"
        aria-label={`Edit ${meta?.name || platform.id}`}
      >
        <Edit3 size={13} />
      </button>
      <button
        onClick={onRemove}
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-live-red/70 cursor-pointer hover:bg-live-red/10"
        aria-label={`Remove ${meta?.name || platform.id}`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
