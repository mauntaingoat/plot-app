import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Lock,
  Image as ImageIcon,
  Trash,
  Spinner,
} from '@phosphor-icons/react'
import { uploadFile, styleBackgroundPath, FILE_TOO_LARGE } from '@/lib/storage'
import { resizeImage } from '@/lib/imageResize'
import type { UserDoc, Platform } from '@/lib/types'
import {
  PALETTES,
  FONTS,
  SHAPES,
  STATE_SHAPES,
  DEFAULT_STYLE,
  resolveStyle,
  FREE_PALETTE_COUNT,
  FREE_FONT_COUNT,
  FREE_SHAPE_COUNT,
  isStateShape,
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
     2. Color palette   (12 themes — solid / dark / gradient / pattern)
     3. Font            (10 pairings)
     4. Map shape       (6 geometric shapes + 50 US states + DC dropdown)
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
  /** Tier gate — when true the user is on Free; locked items show a
   *  Pro badge and trigger `onPaywall` instead of selecting. */
  isFree: boolean
  onPaywall: (reason: string) => void
}

export function StyleTab({
  user,
  isDesktop,
  onUpdateUser,
  onOpenEditProfile,
  onOpenEditBrokerage,
  onOpenAddPlatform,
  onRemovePlatform,
  isFree,
  onPaywall,
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
          {PALETTES.map((p, i) => {
            const locked = isFree && i >= FREE_PALETTE_COUNT
            return (
              <PaletteCard
                key={p.id}
                palette={p}
                active={style.paletteId === p.id}
                locked={locked}
                onClick={() => locked ? onPaywall('Extra color palettes are a Pro feature.') : updateStyle({ paletteId: p.id, customAccentColor: null, customBackgroundColor: null, customBackgroundImage: null })}
              />
            )
          })}
        </div>

        <CustomColorPicker
          label="Custom accent color"
          description="Override the palette accent — used for buttons, badges, and pin glyphs."
          fallbackHex={getPalette(style.paletteId).accent}
          value={style.customAccentColor || null}
          onChange={(hex) => updateStyle({ customAccentColor: hex })}
          isFree={isFree}
          onPaywall={() => onPaywall('Custom accent colors are a Pro feature.')}
          paywallCopy="Pick any hex for buttons, pin glyphs, and badges — upgrade to unlock."
        />

        <CustomColorPicker
          label="Custom profile background"
          description="The surface your profile elements sit on — avatar, name, socials, map peek."
          fallbackHex={getPalette(style.paletteId).cardBg}
          value={style.customBackgroundColor || null}
          onChange={(hex) => updateStyle({ customBackgroundColor: hex })}
          isFree={isFree}
          onPaywall={() => onPaywall('Custom profile backgrounds are a Pro feature.')}
          paywallCopy="Pick any hex for the surface your profile elements sit on — upgrade to unlock."
          imageActive={!!style.customBackgroundImage}
        />

        <CustomBackgroundImagePicker
          uid={user.uid}
          value={style.customBackgroundImage || null}
          onChange={(url) => updateStyle({ customBackgroundImage: url })}
          isFree={isFree}
          onPaywall={() => onPaywall('Custom background images are a Pro feature.')}
        />
      </Section>

      {/* ── 3. Font ── */}
      <Section
        title="Font"
        subtitle="Headers + body pairings"
        collapsible
        collapsedPreview={<FontNamePreview font={getFont(style.fontId)} />}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {FONTS.map((f, i) => {
            const locked = isFree && i >= FREE_FONT_COUNT
            return (
              <FontCard
                key={f.id}
                font={f}
                active={style.fontId === f.id}
                locked={locked}
                onClick={() => locked ? onPaywall('Extra font pairings are a Pro feature.') : updateStyle({ fontId: f.id })}
              />
            )
          })}
        </div>

        <CustomColorPicker
          label="Custom heading color"
          description="Override the palette text color for your name + headlines. Body + caption hierarchy stays palette-derived."
          fallbackHex={getPalette(style.paletteId).textPrimary}
          value={style.customFontColor || null}
          onChange={(hex) => updateStyle({ customFontColor: hex })}
          isFree={isFree}
          onPaywall={() => onPaywall('Custom heading colors are a Pro feature.')}
          paywallCopy="Pick any hex for your display name + headlines — upgrade to unlock."
        />
      </Section>

      {/* ── 4. Map shape ── */}
      <Section
        title="Map shape"
        subtitle="The signature element of your Reelst"
        collapsible
        collapsedPreview={<ShapeGlyphPreview shape={getShape(style.shapeId)} accent={getPalette(style.paletteId).accent} />}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {SHAPES.filter((s) => !isStateShape(s.id)).map((s, i) => {
            const locked = isFree && i >= FREE_SHAPE_COUNT
            return (
              <ShapeCard
                key={s.id}
                shape={s}
                active={style.shapeId === s.id}
                accent={getPalette(style.paletteId).accent}
                locked={locked}
                onClick={() => locked ? onPaywall('Extra map shapes are a Pro feature.') : updateStyle({ shapeId: s.id })}
              />
            )
          })}
        </div>

        <StateShapePicker
          selectedShapeId={style.shapeId}
          accent={getPalette(style.paletteId).accent}
          isFree={isFree}
          onPick={(stateId) => updateStyle({ shapeId: stateId })}
          onPaywall={() => onPaywall('State map shapes are a Pro feature.')}
        />
      </Section>

      {/* ── 5. Frames ── */}
      <Section title="Frames" subtitle="Borders + shadows for each surface">
        <div className="space-y-3">
          <FrameRow label="Profile photo" icon={<Camera size={15} />} value={style.frames.avatar} onChange={(v) => updateFrames({ avatar: v })} />
          <FrameRow label="Map viewport" icon={<House size={15} />} value={style.frames.map} onChange={(v) => updateFrames({ map: v })} />
          <FrameRow label="Listings" icon={<Eye size={15} />} value={style.frames.listings} onChange={(v) => updateFrames({ listings: v })} />
        </div>
      </Section>

      {/* ── Ticker stats — auto stats are free; the Custom editor
            below is Pro-only and shows a paywall on Free. ── */}
      <Section title="Ticker stats" subtitle="The cycling line under your name">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider pt-1 pb-1">From your listings</p>
          <ToggleRow label="Homes for sale"    value={style.tickerAuto.for_sale}    onChange={(v) => updateTickerAuto('for_sale', v)} />
          <ToggleRow label="Homes sold"        value={style.tickerAuto.sold}        onChange={(v) => updateTickerAuto('sold', v)} />
          <ToggleRow label="Open houses"       value={style.tickerAuto.open_houses} onChange={(v) => updateTickerAuto('open_houses', v)} />
          <ToggleRow label="Spotlights live"   value={style.tickerAuto.spotlights}  onChange={(v) => updateTickerAuto('spotlights', v)} />

          <div className="flex items-center gap-1.5 pt-3 pb-1">
            <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider">Custom</p>
            {isFree && <ProBadge />}
          </div>
          {isFree ? (
            <button
              onClick={() => onPaywall('Custom ticker items are a Pro feature.')}
              className="w-full text-left bg-cream rounded-[12px] p-3 cursor-pointer hover:bg-pearl transition-colors"
            >
              <p className="text-[12.5px] text-graphite">Add hand-typed brags like "$42M total volume sold" — upgrade to unlock.</p>
            </button>
          ) : (
            <CustomTickerEditor
              items={style.tickerCustom}
              onChange={(items) => updateStyle({ tickerCustom: items })}
            />
          )}
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
/* ───────────────────────────────────────────────────────────────
   ProBadge — small "PRO" pill with a lock glyph. Two variants:
     - inline (default): renders next to a label
     - corner: absolutely-positioned in the top-right of a card
   Used wherever a Free user can see a Pro-only knob — clicking the
   surrounding card opens the paywall instead of selecting it.
   ─────────────────────────────────────────────────────────────── */
export function ProBadge({ corner = false }: { corner?: boolean }) {
  return (
    <span
      className={
        corner
          ? 'absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white pointer-events-none'
          : 'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white'
      }
      style={{
        background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
      }}
    >
      <Lock weight="fill" size={8} /> Pro
    </span>
  )
}

/* ───────────────────────────────────────────────────────────────
   CustomColorPicker — Pro-gated hex/color override row.
   Used twice: once in the palette section (accent override) and
   once in the font section (heading-color override). Renders a
   color swatch that triggers a native `<input type="color">`, a
   live hex text input, and a "Reset to palette" affordance that
   appears only when an override is set.
   ─────────────────────────────────────────────────────────────── */
const HEX_RE = /^#([0-9A-Fa-f]{6})$/

function CustomColorPicker({
  label,
  description,
  fallbackHex,
  value,
  onChange,
  isFree,
  onPaywall,
  paywallCopy,
  imageActive,
}: {
  label: string
  description: string
  /** Color shown when no override is set (i.e. the palette's value). */
  fallbackHex: string
  value: string | null
  onChange: (hex: string | null) => void
  isFree: boolean
  onPaywall: () => void
  paywallCopy: string
  /** When a sibling image override is active (profile-bg only),
   *  the color picker is visually de-emphasized + a note tells
   *  the agent the image is winning. The picker still works in
   *  case the agent wants to set the fallback color for when
   *  they later remove the image. */
  imageActive?: boolean
}) {
  const active = !!value && HEX_RE.test(value)
  // Some palettes use a gradient or SVG-pattern URL for the fallback
  // (e.g., the "Pink → cyan dream" gradient palette). Those can't
  // seed a `<input type="color">` and aren't useful in the hex text
  // input either, so we treat them as "no clean fallback" — text
  // field stays empty, swatch keeps showing the gradient as a hint.
  const fallbackIsHex = HEX_RE.test(fallbackHex)
  const swatchBackground = active ? (value as string) : fallbackHex
  // Native picker needs a real hex; fall back to white when the
  // palette's fallback isn't one. Never user-visible because the
  // swatch's CSS background covers it.
  const colorInputValue = active ? (value as string) : fallbackIsHex ? fallbackHex : '#FFFFFF'
  const initialText = active ? (value as string) : fallbackIsHex ? fallbackHex : ''
  const [text, setText] = useState(initialText)

  // Sync the text input when the source-of-truth changes from
  // outside (palette swap, Reset click, color-picker drag). The
  // dependency means we don't clobber the user's mid-typing — they
  // only commit on blur/Enter.
  useEffect(() => {
    setText(initialText)
  }, [initialText])

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) { onChange(null); return }
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    if (HEX_RE.test(withHash)) onChange(withHash.toUpperCase())
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-light">
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider">{label}</p>
        {isFree && <ProBadge />}
      </div>

      {isFree ? (
        <button
          onClick={onPaywall}
          className="w-full text-left bg-cream rounded-[12px] p-3 cursor-pointer hover:bg-pearl transition-colors"
        >
          <p className="text-[12.5px] text-graphite">{paywallCopy}</p>
        </button>
      ) : (
        <div style={{ opacity: imageActive ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <p className="text-[12px] text-smoke mb-2.5">{description}</p>
          <div className="flex items-center gap-2">
            <label
              className="relative w-10 h-10 rounded-[12px] cursor-pointer shrink-0 overflow-hidden"
              style={{
                background: swatchBackground,
                boxShadow: 'inset 0 0 0 1px rgba(10,14,23,0.10)',
              }}
              aria-label={`Pick ${label.toLowerCase()}`}
            >
              <input
                type="color"
                value={colorInputValue}
                onChange={(e) => {
                  setText(e.target.value.toUpperCase())
                  onChange(e.target.value.toUpperCase())
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value) } }}
              placeholder={fallbackIsHex ? fallbackHex : '#RRGGBB'}
              spellCheck={false}
              className="flex-1 h-10 px-3 rounded-[10px] bg-cream border border-border-light text-[13px] text-ink font-mono outline-none focus:border-tangerine/50"
            />
            {active && (
              <button
                onClick={() => onChange(null)}
                className="h-10 px-3 rounded-[10px] bg-cream text-[12px] font-semibold text-graphite cursor-pointer hover:bg-pearl flex items-center gap-1.5 shrink-0"
                title="Reset to palette default"
              >
                <RefreshCw size={12} /> Reset
              </button>
            )}
          </div>
          {!active && !imageActive && (
            <p className="text-[11px] text-ash mt-1.5">Currently using the palette default.</p>
          )}
          {imageActive && (
            <p className="text-[11px] text-ash mt-1.5">A custom image is showing — remove it below to use a color.</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────
   CustomBackgroundImagePicker — Pro-gated image upload for the
   profile card surface. Resizes client-side (max 1600px, 85% JPEG)
   before uploading to Firebase Storage at
   `users/{uid}/style/background.jpg`. Single slot per user — re-
   uploads overwrite. Image takes precedence over `customBackgroundColor`
   in the public-profile renderer.
   ─────────────────────────────────────────────────────────────── */
function CustomBackgroundImagePicker({
  uid,
  value,
  onChange,
  isFree,
  onPaywall,
}: {
  uid: string
  value: string | null
  onChange: (url: string | null) => void
  isFree: boolean
  onPaywall: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const blob = await resizeImage(file, { maxEdge: 1600, quality: 0.85, mimeType: 'image/jpeg' })
      const wrapped = new File([blob], 'background.jpg', { type: 'image/jpeg' })
      const url = await uploadFile({ path: styleBackgroundPath(uid), file: wrapped })
      // Cache-bust so the freshly-uploaded image bypasses the
      // previous URL's CDN cache when overwriting.
      onChange(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`)
    } catch (e: any) {
      setError(
        e?.code === FILE_TOO_LARGE
          ? 'That image is too large. Pick something under 12 MB.'
          : 'Upload failed. Try another image.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-light">
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider">Or upload an image</p>
        {isFree && <ProBadge />}
      </div>

      {isFree ? (
        <button
          onClick={onPaywall}
          className="w-full text-left bg-cream rounded-[12px] p-3 cursor-pointer hover:bg-pearl transition-colors"
        >
          <p className="text-[12.5px] text-graphite">Use any photo as your profile background — upgrade to unlock.</p>
        </button>
      ) : (
        <>
          <p className="text-[12px] text-smoke mb-2.5">
            Image takes priority over the color above. Auto-resized to fit (max 1600px wide).
          </p>
          {value ? (
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-[12px] shrink-0 bg-cream"
                style={{
                  background: `url(${value}) center / cover`,
                  boxShadow: 'inset 0 0 0 1px rgba(10,14,23,0.10)',
                }}
                aria-label="Current background image"
              />
              <label className="flex-1 h-10 px-3 rounded-[10px] bg-cream border border-border-light text-[12.5px] font-medium text-graphite cursor-pointer hover:bg-pearl flex items-center justify-center gap-1.5">
                <ImageIcon size={13} /> Replace
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPick(e.target.files?.[0])}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <button
                onClick={() => onChange(null)}
                className="h-10 px-3 rounded-[10px] bg-cream text-[12px] font-semibold text-graphite cursor-pointer hover:bg-pearl flex items-center gap-1.5 shrink-0"
                title="Remove background image"
              >
                <Trash size={12} /> Remove
              </button>
            </div>
          ) : (
            <label className="w-full h-10 px-3 rounded-[10px] bg-cream border border-dashed border-border-light text-[12.5px] font-semibold text-graphite cursor-pointer hover:bg-pearl flex items-center justify-center gap-1.5">
              {uploading ? (
                <>
                  <Spinner size={13} className="animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <ImageIcon size={13} /> Upload image
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPick(e.target.files?.[0])}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
          {error && (
            <p className="text-[11px] text-live-red mt-1.5">{error}</p>
          )}
        </>
      )}
    </div>
  )
}

function PaletteCard({
  palette,
  active,
  locked,
  onClick,
}: {
  palette: ReturnType<typeof getPalette>
  active: boolean
  locked?: boolean
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
        {locked && <ProBadge corner />}
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
  locked,
  onClick,
}: {
  font: ReturnType<typeof getFont>
  active: boolean
  locked?: boolean
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
      <p className="text-[12.5px] font-semibold text-ink mt-2 flex items-center gap-1.5">{font.name}{locked && <ProBadge />}</p>
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
  locked,
  onClick,
}: {
  shape: (typeof SHAPES)[number]
  active: boolean
  accent: string
  locked?: boolean
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
      {locked && <ProBadge corner />}
      <svg width="100%" viewBox="0 0 72 72" className="mb-1.5">
        <path d={dAttr} fill={accent} />
      </svg>
      <p className="text-[11.5px] font-semibold text-ink truncate">{shape.name}</p>
    </motion.button>
  )
}

/* ───────────────────────────────────────────────────────────────
   StateShapePicker — Pro-gated dropdown for the 50 states + DC.
   Sits below the geometric shape grid in the Map shape section.
   Live preview tile next to the dropdown shows the selected
   state's outline filled with the active accent color so the
   agent can confirm their pick without re-expanding the section.
   ─────────────────────────────────────────────────────────────── */
function StateShapePicker({
  selectedShapeId,
  accent,
  isFree,
  onPick,
  onPaywall,
}: {
  selectedShapeId: string
  accent: string
  isFree: boolean
  onPick: (shapeId: string) => void
  onPaywall: () => void
}) {
  const selectedState = STATE_SHAPES.find((s) => `state_${s.code}` === selectedShapeId) || null
  // Pull the path d for the live preview tile — same regex trick
  // ShapeCard uses, but applied to a state's already-baked
  // unit-space d (no transform needed since the SVG viewBox is
  // already 0–1).
  const previewD = selectedState?.d || null

  return (
    <div className="mt-4 pt-4 border-t border-border-light">
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider">Or pick your state</p>
        {isFree && <ProBadge />}
      </div>

      {isFree ? (
        <button
          onClick={onPaywall}
          className="w-full text-left bg-cream rounded-[12px] p-3 cursor-pointer hover:bg-pearl transition-colors"
        >
          <p className="text-[12.5px] text-graphite">Use your state's outline as your map shape — upgrade to unlock.</p>
        </button>
      ) : (
        <>
          <p className="text-[12px] text-smoke mb-2.5">
            Florida realtor? Texas? Pick your state and your map peek takes its outline.
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-[12px] shrink-0 bg-cream flex items-center justify-center"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(10,14,23,0.10)' }}
              aria-hidden
            >
              {previewD ? (
                <svg width="28" height="28" viewBox="0 0 1 1">
                  <path d={previewD} fill={accent} />
                </svg>
              ) : (
                <span className="text-[10px] font-semibold text-ash">—</span>
              )}
            </div>
            <select
              value={selectedState ? `state_${selectedState.code}` : ''}
              onChange={(e) => {
                if (e.target.value) onPick(e.target.value)
              }}
              className="flex-1 h-10 px-3 rounded-[10px] bg-cream border border-border-light text-[13px] text-ink outline-none focus:border-tangerine/50 cursor-pointer"
            >
              <option value="">Select a state…</option>
              {STATE_SHAPES.map((s) => (
                <option key={s.code} value={`state_${s.code}`}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
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
  // Mobile (<sm) stacks the label above the segmented selector so the
  // 4 options each get full row width — otherwise the label column was
  // squeezing them into ~40px buttons that visually abutted.
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2 sm:w-[120px] sm:shrink-0">
        <div className="w-7 h-7 rounded-[8px] bg-pearl flex items-center justify-center text-graphite">{icon}</div>
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-4 gap-1.5 p-1 rounded-[10px] bg-cream">
        {FRAME_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="py-1.5 px-1 rounded-[8px] text-[11.5px] font-medium cursor-pointer transition-colors text-center truncate"
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
