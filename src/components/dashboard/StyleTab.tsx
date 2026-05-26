import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { uploadFile, styleBackgroundPath, customLinkThumbnailPath, FILE_TOO_LARGE } from '@/lib/storage'
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
  type CustomLink,
  type CustomLinksPosition,
  MAX_LINK_TITLE_LEN,
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
  /** True when the persistent right-side preview pane is visible
   *  (≥1200px). When false, the Style tab surfaces an in-tab
   *  Style / Preview switcher so the user can still see their
   *  profile without a navigate-away. */
  isWide: boolean
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
  isWide,
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

  // Style / Preview switcher — only surfaced when the persistent
  // right-side preview pane isn't there to show changes live (i.e.
  // tablet + mobile widths). Lazy-mount the iframe so we don't burn
  // a Mapbox load until the user actually taps Preview.
  const [activeSubTab, setActiveSubTab] = useState<'style' | 'preview'>('style')
  const [previewMounted, setPreviewMounted] = useState(false)
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const [previewReloading, setPreviewReloading] = useState(false)
  const RELOAD_COOLDOWN_MS = 3000
  useEffect(() => {
    if (activeSubTab === 'preview' && !previewMounted) setPreviewMounted(true)
  }, [activeSubTab, previewMounted])
  const reloadPreview = useCallback(() => {
    if (previewReloading) return
    const iframe = previewIframeRef.current
    if (!iframe) return
    iframe.src = iframe.src
    setPreviewReloading(true)
    setTimeout(() => setPreviewReloading(false), RELOAD_COOLDOWN_MS)
  }, [previewReloading])
  const showSubTabs = !isWide

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

      {/* ── Style / Preview switcher (only on tablet + mobile) ── */}
      {showSubTabs && (
        <div className="flex items-center gap-1 p-1 rounded-full bg-cream border border-border-light w-fit">
          {([
            { id: 'style', label: 'Style' },
            { id: 'preview', label: 'Preview' },
          ] as const).map((t) => {
            const active = activeSubTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveSubTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                  active ? 'bg-ink text-ivory' : 'text-smoke hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Preview panel (only when sub-tab=preview) ──
          Phone frame matches the wide-desktop right pane (240×480 with
          a 375×750 iframe scaled 0.64) so the visual reads exactly the
          same. Once mounted, stays in DOM forever — toggling the sub-tab
          (or leaving the Style dashboard tab entirely) doesn't unmount
          the iframe, so the Mapbox map inside doesn't re-init. */}
      {showSubTabs && previewMounted && (
        <div
          className="flex flex-col items-center pt-2 pb-6"
          style={{ display: activeSubTab === 'preview' ? 'flex' : 'none' }}
        >
          {user.username ? (
            <div className="relative">
              <div className="w-[240px] rounded-[32px] bg-midnight shadow-2xl overflow-hidden" style={{ height: '480px' }}>
                <iframe
                  ref={previewIframeRef}
                  src={`/${user.username}?preview=true`}
                  className="border-0 origin-top-left"
                  style={{ pointerEvents: 'none', width: '375px', height: '750px', transform: 'scale(0.64)', transformOrigin: 'top left' }}
                  title="Profile preview"
                />
              </div>
              <button
                onClick={reloadPreview}
                disabled={previewReloading}
                className={`absolute bottom-2 right-2 w-7 h-7 rounded-full bg-warm-white/90 shadow border border-border-light flex items-center justify-center transition-colors ${previewReloading ? 'text-tangerine cursor-not-allowed opacity-80' : 'text-smoke hover:text-ink cursor-pointer'}`}
                title={previewReloading ? 'Reloading…' : 'Reload preview'}
              >
                <RefreshCw size={14} className={previewReloading ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-smoke">Pick a username first to preview your profile.</p>
          )}
        </div>
      )}

      {/* All style sections — hidden via CSS (not unmounted) when the
          Preview sub-tab is active, so local component state inside
          sections (uploads, scroll, draft text) survives toggling. */}
      <div
        className="space-y-5"
        style={{ display: showSubTabs && activeSubTab === 'preview' ? 'none' : undefined }}
      >
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

      {/* ── Links — collapsible. Sits right after Map shape so visual
            identity (palette → font → shape → links → socials) is grouped
            before the frame/structural controls. ── */}
      <Section
        title="Links"
        subtitle="Linktree-style buttons that link out from your profile"
        collapsible
        collapsedPreview={
          <span className="text-[12px] font-semibold text-graphite">
            {style.customLinks.length === 0
              ? 'None yet'
              : `${style.customLinks.length} link${style.customLinks.length === 1 ? '' : 's'} · ${style.customLinksPosition === 'above' ? 'Above' : 'Below'} content`}
          </span>
        }
      >
        <CustomLinksEditor
          uid={user.uid}
          links={style.customLinks}
          position={style.customLinksPosition}
          maxLinks={isFree ? 3 : 20}
          isFree={isFree}
          onChange={(links) => updateStyle({ customLinks: links })}
          onPositionChange={(pos) => updateStyle({ customLinksPosition: pos })}
          onPaywall={onPaywall}
        />
      </Section>

      {/* ── Social & site links — collapsible, sits beside Links. ── */}
      <Section
        title="Social & site links"
        subtitle="Toggle, edit, and reorder — shows below your bio"
        collapsible
        collapsedPreview={
          <span className="text-[12px] font-semibold text-graphite">
            {user.platforms && user.platforms.length > 0
              ? `${user.platforms.length} connected`
              : 'None'}
          </span>
        }
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

      {/* ── 5. Frames ── */}
      <Section title="Frames" subtitle="Borders + shadows for each surface">
        <div className="space-y-3">
          <FrameRow label="Profile photo" icon={<Camera size={15} />} value={style.frames.avatar} onChange={(v) => updateFrames({ avatar: v })} />
          <FrameRow label="Map viewport" icon={<House size={15} />} value={style.frames.map} onChange={(v) => updateFrames({ map: v })} />
          <FrameRow label="Listings" icon={<Eye size={15} />} value={style.frames.listings} onChange={(v) => updateFrames({ listings: v })} />
          <FrameRow label="Links" icon={<Link2 size={15} />} value={style.frames.links} onChange={(v) => updateFrames({ links: v })} />
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

      {/* ── 6. Section visibility ──
          Map viewport intentionally omitted — the map IS the profile,
          hiding it would leave nothing of substance behind. */}
      <Section title="Sections" subtitle="Show or hide parts of your profile">
        <div className="space-y-2">
          <ToggleRow label="Bio"           value={style.sections.bio}     onChange={(v) => updateSections({ bio: v })} />
          <ToggleRow label="Ticker stats"  value={style.sections.ticker}  onChange={(v) => updateSections({ ticker: v })} />
          <ToggleRow label="Social row"    value={style.sections.social}  onChange={(v) => updateSections({ social: v })} />
          <ToggleRow label="Pin highlights" value={style.sections.content} onChange={(v) => updateSections({ content: v })} />
          <ToggleRow label="Custom links"  value={style.sections.links}   onChange={(v) => updateSections({ links: v })} />
        </div>
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
          {/* Render the action when expanded so collapsible sections
              (e.g., Social & site links) still expose their "+ Add"
              affordance. stopPropagation keeps the click from
              bubbling up to the header toggle. */}
          {action && !isCollapsed && (
            <span onClick={(e) => e.stopPropagation()}>{action}</span>
          )}
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
        // Use a div + role="button" instead of a real <button> so the
        // header can host a nested action button (e.g., "+ Add") —
        // <button> inside <button> is invalid HTML.
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed((v) => !v) } }}
          aria-expanded={!isCollapsed}
          className={`w-full flex items-start justify-between gap-3 cursor-pointer ${isCollapsed ? '' : 'mb-3'}`}
        >
          {HeaderInner}
        </div>
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
      {/* Tray uses bg-pearl + warm-white cells (NOT the other way
          around) so the layout silhouette stays legible against
          either the inactive warm-white card OR the active peach
          card — bg-pearl on bg-cream was nearly indistinguishable
          and the grid cells visually disappeared when the card
          went active. */}
      <div className="h-[64px] mb-2 rounded-[10px] bg-pearl overflow-hidden relative">
        {id === 'scroller' ? (
          <div className="absolute inset-0 flex items-center gap-1.5 px-2.5">
            <div className="w-[28%] h-[48px] rounded-[6px] bg-warm-white shrink-0" />
            <div className="w-[28%] h-[48px] rounded-[6px] bg-warm-white shrink-0" />
            <div className="w-[28%] h-[48px] rounded-[6px] bg-warm-white shrink-0" />
            <div className="w-[28%] h-[48px] rounded-[6px] bg-warm-white/70 shrink-0" />
            <div className="w-[28%] h-[48px] rounded-[6px] bg-warm-white/40 shrink-0" />
          </div>
        ) : (
          // 3×2 grid — illustrates the wrapping behavior (no horizontal
          // scroll; rows stack downward as more cards are added).
          <div className="absolute inset-0 grid grid-cols-3 gap-1.5 p-2">
            <div className="rounded-[4px] bg-warm-white" />
            <div className="rounded-[4px] bg-warm-white" />
            <div className="rounded-[4px] bg-warm-white" />
            <div className="rounded-[4px] bg-warm-white" />
            <div className="rounded-[4px] bg-warm-white" />
            <div className="rounded-[4px] bg-warm-white" />
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

/* ───────────────────────────────────────────────────────────────
   CustomLinksEditor — agent-curated external links stack editor.

   Supports add / edit (title + URL inline) / delete / drag-reorder
   (native HTML5 DnD) / thumbnail upload (40×40 thumb resized to
   256×256 server-side via resizeImage) / position selector
   (above or below the content cards). Free agents see the first
   three slots; the Add button locks behind a Pro paywall when the
   cap is reached.

   URL normalization: any URL without a scheme gets `https://`
   prepended on blur. Empty rows are rejected from saving (the row
   stays in local state but never flushes to Firestore).
   ─────────────────────────────────────────────────────────────── */
function CustomLinksEditor({
  uid,
  links,
  position,
  maxLinks,
  isFree,
  onChange,
  onPositionChange,
  onPaywall,
}: {
  uid: string
  links: CustomLink[]
  position: CustomLinksPosition
  maxLinks: number
  isFree: boolean
  onChange: (next: CustomLink[]) => void
  onPositionChange: (next: CustomLinksPosition) => void
  onPaywall: (reason: string) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadIdRef = useRef<string | null>(null)
  const atCap = links.length >= maxLinks

  const updateLink = (id: string, patch: Partial<CustomLink>) => {
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const removeLink = (id: string) => {
    onChange(links.filter((l) => l.id !== id))
  }

  const addLink = () => {
    if (atCap) {
      onPaywall(`The Free plan includes ${maxLinks} custom links. Upgrade to Pro for up to 20.`)
      return
    }
    const id = `lnk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    onChange([...links, { id, title: '', url: '' }])
  }

  // Normalize URL on blur — prepend https:// if scheme missing and
  // the field has content. Empty stays empty.
  const normalizeUrl = (id: string, raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      updateLink(id, { url: '' })
      return
    }
    if (/^https?:\/\//i.test(trimmed)) {
      updateLink(id, { url: trimmed })
      return
    }
    updateLink(id, { url: `https://${trimmed}` })
  }

  // Native HTML5 DnD — no extra dep, matches the rest of the codebase.
  // We use a simple "insert before drop target" strategy.
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox requires data to be set for the drag to start.
    e.dataTransfer.setData('text/plain', id)
  }
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggingId && draggingId !== id) setOverId(id)
  }
  const onDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === dropId) {
      setDraggingId(null)
      setOverId(null)
      return
    }
    const next = [...links]
    const fromIdx = next.findIndex((l) => l.id === draggingId)
    const toIdx = next.findIndex((l) => l.id === dropId)
    if (fromIdx < 0 || toIdx < 0) {
      setDraggingId(null)
      setOverId(null)
      return
    }
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onChange(next)
    setDraggingId(null)
    setOverId(null)
  }
  const onDragEnd = () => {
    setDraggingId(null)
    setOverId(null)
  }

  // Thumbnail upload — same pattern as the background-image picker
  // (resizeImage → uploadFile → write the download URL).
  const openThumbPicker = (id: string) => {
    pendingUploadIdRef.current = id
    thumbInputRef.current?.click()
  }
  const handleThumbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const linkId = pendingUploadIdRef.current
    e.target.value = '' // reset so picking same file re-fires
    pendingUploadIdRef.current = null
    if (!file || !linkId) return
    setUploadingId(linkId)
    try {
      // 256px is plenty for a 48×48 thumbnail at 2× DPR. Resize to a
      // Blob → wrap as a File (uploadFile expects File w/ a name) →
      // upload. Same shape CustomBgImagePicker uses.
      const blob = await resizeImage(file, { maxEdge: 256, quality: 0.85, mimeType: 'image/jpeg' })
      const wrapped = new File([blob], `${linkId}.jpg`, { type: 'image/jpeg' })
      const url = await uploadFile({ path: customLinkThumbnailPath(uid, linkId), file: wrapped })
      // Cache-bust on re-upload so the same Storage path serves fresh
      // bytes immediately (CDN won't keep the stale image).
      updateLink(linkId, { thumbnailUrl: `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` })
    } catch (err) {
      // FILE_TOO_LARGE is set on err.code by FileTooLargeError, not
      // err.message — check the right property or we silently fall
      // through to the generic "try again" path.
      if ((err as { code?: string })?.code === FILE_TOO_LARGE) {
        alert('Image is too large. Pick one under 8 MB.')
      } else {
        console.warn('[CustomLinksEditor] thumbnail upload failed', err)
        alert("Couldn't upload that image. Try again.")
      }
    } finally {
      setUploadingId(null)
    }
  }
  const clearThumb = (id: string) => updateLink(id, { thumbnailUrl: null })

  return (
    <div className="space-y-3">
      {/* Position selector — small inline segmented control. Display
          position is a peripheral choice (most agents pick once and
          forget); the editor shouldn't make it the focal point. */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-smoke uppercase tracking-wider shrink-0">Position</span>
        <div className="inline-flex items-center rounded-full bg-cream p-0.5" role="group" aria-label="Links position">
          <button
            onClick={() => onPositionChange('above')}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors cursor-pointer ${
              position === 'above'
                ? 'bg-warm-white text-ink shadow-sm'
                : 'text-graphite hover:text-ink'
            }`}
            aria-pressed={position === 'above'}
          >
            Above
          </button>
          <button
            onClick={() => onPositionChange('below')}
            className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors cursor-pointer ${
              position === 'below'
                ? 'bg-warm-white text-ink shadow-sm'
                : 'text-graphite hover:text-ink'
            }`}
            aria-pressed={position === 'below'}
          >
            Below
          </button>
        </div>
      </div>

      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2 pt-1">
          {links.map((link) => {
            const isDragging = draggingId === link.id
            const isOver = overId === link.id && draggingId !== link.id
            return (
              <div
                key={link.id}
                draggable
                onDragStart={(e) => onDragStart(e, link.id)}
                onDragOver={(e) => onDragOver(e, link.id)}
                onDrop={(e) => onDrop(e, link.id)}
                onDragEnd={onDragEnd}
                className={`flex items-start gap-2 p-2 rounded-[12px] bg-cream transition-all ${
                  isDragging ? 'opacity-40' : ''
                } ${isOver ? 'ring-2 ring-tangerine/40' : ''}`}
              >
                {/* Drag handle */}
                <div className="pt-2 cursor-grab active:cursor-grabbing text-ash" aria-label="Drag to reorder">
                  <GripVertical size={14} />
                </div>

                {/* Thumbnail slot */}
                <button
                  onClick={() => openThumbPicker(link.id)}
                  disabled={uploadingId === link.id}
                  className="w-10 h-10 shrink-0 rounded-[10px] bg-warm-white border border-border-light flex items-center justify-center overflow-hidden text-graphite cursor-pointer hover:bg-pearl relative"
                  aria-label="Upload thumbnail"
                  title="Upload thumbnail (optional)"
                >
                  {uploadingId === link.id ? (
                    <Spinner size={14} className="animate-spin" />
                  ) : link.thumbnailUrl ? (
                    <img src={link.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={14} />
                  )}
                </button>

                {/* Title + URL stacked inputs */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink(link.id, { title: e.target.value.slice(0, MAX_LINK_TITLE_LEN) })}
                    placeholder="Title"
                    maxLength={MAX_LINK_TITLE_LEN}
                    aria-label="Link title"
                    className="w-full h-9 px-3 rounded-[10px] bg-warm-white border border-border-light text-[13px] font-semibold text-ink outline-none focus:border-tangerine/50 placeholder:text-ash"
                  />
                  <input
                    type="url"
                    inputMode="url"
                    value={link.url}
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    onBlur={(e) => normalizeUrl(link.id, e.target.value)}
                    placeholder="https://…"
                    aria-label="Link URL"
                    className="w-full h-9 px-3 rounded-[10px] bg-warm-white border border-border-light text-[12.5px] text-graphite outline-none focus:border-tangerine/50 placeholder:text-ash"
                  />
                </div>

                {/* Actions stack */}
                <div className="flex flex-col gap-1">
                  {link.thumbnailUrl && (
                    <button
                      onClick={() => clearThumb(link.id)}
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center text-graphite cursor-pointer hover:bg-pearl"
                      aria-label="Remove thumbnail"
                      title="Remove thumbnail"
                    >
                      <ImageIcon size={12} className="opacity-50" />
                    </button>
                  )}
                  <button
                    onClick={() => removeLink(link.id)}
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-live-red/70 cursor-pointer hover:bg-live-red/10"
                    aria-label="Delete link"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Hidden file input for thumbnail uploads */}
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleThumbFile}
        className="hidden"
      />

      {/* Add row */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] text-smoke">
          {links.length} of {maxLinks} {isFree ? '(Free)' : '(Pro)'}
        </p>
        <button
          onClick={addLink}
          disabled={false /* always clickable so the paywall hint fires */}
          className="brand-btn-flat px-3 h-9 text-[12.5px] font-bold cursor-pointer flex items-center gap-1"
        >
          {atCap && isFree ? (
            <>
              <Lock size={12} weight="bold" /> Upgrade for more
            </>
          ) : (
            <>
              <Plus size={13} weight="bold" /> Add link
            </>
          )}
        </button>
      </div>
    </div>
  )
}
