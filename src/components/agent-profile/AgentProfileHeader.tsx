import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SealCheck as BadgeCheck, HandWaving as Hand, Heart, Check, Globe } from '@phosphor-icons/react'
import { preloadImage, isImageCached } from '@/lib/imageCache'
import { PLATFORM_LOGOS_MONO, platformUrl } from '@/components/icons/PlatformLogos'
import type { UserDoc, Platform } from '@/lib/types'
import type { AgentStyle, FrameStyle, Palette, FontPairing } from '@/lib/style'

/* ════════════════════════════════════════════════════════════════
   AGENT PROFILE HEADER — Linktree-simple, center-stacked
   ────────────────────────────────────────────────────────────────
   Vertical center-stacked layout: avatar → name + verified mark →
   cycling inventory ticker → bio (when present). Two corner action
   icons sit at the top of the card — Wave (top-left) opens the
   "ask the agent" modal, Save (top-right) subscribes via email.
   No tabs — the page below is a single scroll of map + listings.
   Every visual detail is driven by the agent's `style` so palette /
   font / frame / section toggles / ticker contents / CTA labels
   all reskin live from the dashboard Style tab.
   ──────────────────────────────────────────────────────────────── */

interface AgentProfileHeaderProps {
  agent: UserDoc
  style: AgentStyle
  font: FontPairing
  palette: Palette
  forSaleCount: number
  soldCount?: number
  openHouseCount?: number
  spotlightCount?: number
  /** Top-left wave action — opens the agent-level wave modal so a
   *  buyer can fire off a quick question without picking a listing. */
  onWaveClick: () => void
  /** Top-right save action — opens the SaveAgentModal email digest
   *  capture. Replaces the bottom-pinned Save Mau pill. */
  onSaveClick: () => void
  /** Whether the visitor has already subscribed in this session.
   *  Drives the heart-icon's saved (filled green check) state. */
  saved?: boolean
}

export function AgentProfileHeader({
  agent,
  style,
  font,
  palette,
  forSaleCount,
  soldCount = 0,
  openHouseCount = 0,
  spotlightCount = 0,
  onWaveClick,
  onSaveClick,
  saved = false,
}: AgentProfileHeaderProps) {
  // Build the cycling ticker from auto stats + custom items, preserving
  // the order the agent set in the Style tab. Auto stats only appear
  // when (a) toggled on AND (b) the underlying count is non-zero.
  const phrases = useMemo(() => {
    if (!style.sections.ticker) return []
    const autoMap: Record<string, string | null> = {
      for_sale: style.tickerAuto.for_sale && forSaleCount > 0
        ? `${forSaleCount} home${forSaleCount !== 1 ? 's' : ''} for sale` : null,
      sold: style.tickerAuto.sold && soldCount > 0
        ? `${soldCount} home${soldCount !== 1 ? 's' : ''} sold` : null,
      open_houses: style.tickerAuto.open_houses && openHouseCount > 0
        ? `${openHouseCount} open house${openHouseCount !== 1 ? 's' : ''}` : null,
      spotlights: style.tickerAuto.spotlights && spotlightCount > 0
        ? `${spotlightCount} spotlight${spotlightCount !== 1 ? 's' : ''}` : null,
    }
    const customMap: Record<string, string> = Object.fromEntries(
      style.tickerCustom.map((c) => [c.id, c.label])
    )
    const out: string[] = []
    // Walk the saved order first; anything missing falls through to a
    // stable default below so newly-added items still surface.
    const seen = new Set<string>()
    for (const id of style.tickerOrder) {
      seen.add(id)
      const phrase = autoMap[id] ?? customMap[id]
      if (phrase) out.push(phrase)
    }
    // Backfill anything not yet in the order array (e.g., custom items
    // added after order was last saved).
    for (const [id, phrase] of Object.entries(autoMap)) {
      if (!seen.has(id) && phrase) out.push(phrase)
    }
    for (const c of style.tickerCustom) {
      if (!seen.has(c.id)) out.push(c.label)
    }
    if (out.length === 0) out.push('New listings coming soon')
    return out
  }, [style, forSaleCount, soldCount, openHouseCount, spotlightCount])

  const [phraseIdx, setPhraseIdx] = useState(0)
  useEffect(() => {
    if (phrases.length <= 1) return
    const id = window.setInterval(() => {
      setPhraseIdx((p) => (p + 1) % phrases.length)
    }, 2800)
    return () => window.clearInterval(id)
  }, [phrases.length])

  // Reset to the first phrase whenever the list shrinks (e.g., the
  // agent toggled off the currently-shown stat). Without this, the
  // index could point past the end of the list briefly.
  useEffect(() => {
    if (phraseIdx >= phrases.length) setPhraseIdx(0)
  }, [phrases.length, phraseIdx])

  // The "accent" is the dot color in the palette swatch — the
  // highlight used across actions (wave, save, verified badge,
  // sticker shadows, borders). textPrimary stays the color of the
  // display name + body headings.
  const wavedLabel = `${style.ctaLabels.wave || 'Wave'} ${agent.displayName || ''}`.trim()
  const saveLabel = saved
    ? 'Subscribed'
    : `${style.ctaLabels.save || 'Save'} ${agent.displayName || ''}`.trim()

  return (
    <div
      className="relative px-5 md:px-7 pt-14 md:pt-16 pb-6"
      style={{ fontFamily: font.body }}
    >
      {/* Top-left: Wave action — sits at the very top of the card.
          Bg + icon both derive from the palette's accent so wave
          reads as a peer of the save action and the verified badge. */}
      <button
        onClick={onWaveClick}
        aria-label={wavedLabel}
        title={style.ctaLabels.wave || 'Wave'}
        className="absolute top-4 left-4 md:top-5 md:left-5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: `${palette.accent}1A`,
          color: palette.accent,
        }}
      >
        <Hand weight="bold" size={18} />
      </button>

      {/* Top-right: Save / Subscribe action — replaces the bottom pill. */}
      <button
        onClick={onSaveClick}
        aria-label={saveLabel}
        title={saved ? 'Subscribed' : style.ctaLabels.save || 'Save'}
        className="absolute top-4 right-4 md:top-5 md:right-5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: saved ? (palette.savedBg || palette.accent) : `${palette.accent}1A`,
          color: saved ? (palette.savedInk || palette.accentInk) : palette.accent,
          transition: 'background 0.22s ease, color 0.22s ease',
        }}
      >
        {saved
          ? <Check weight="bold" size={18} />
          : <Heart weight="fill" size={18} />}
      </button>

      {/* Center-stacked identity */}
      <div className="flex flex-col items-center text-center">
        <HeaderAvatar agent={agent} frame={style.frames.avatar} palette={palette} />

        <div className="mt-3 flex items-center gap-1.5">
          <h1
            className="truncate"
            style={{
              fontFamily: font.display,
              fontSize: 'clamp(1.5rem, 5vw, 2rem)',
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              color: palette.textPrimary,
            }}
          >
            {agent.displayName || agent.username || 'Agent'}
          </h1>
          {agent.verificationStatus === 'verified' && (
            <BadgeCheck
              weight="fill"
              size={20}
              className="shrink-0"
              style={{ color: palette.accent }}
              aria-label="Verified agent"
            />
          )}
        </div>

        {/* Cycling inventory ticker — fixed height to avoid reflow. */}
        {style.sections.ticker && phrases.length > 0 && (
          <div
            className="relative mt-1"
            style={{
              fontFamily: font.body,
              height: '20px',
              lineHeight: '20px',
              width: '100%',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={phraseIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                className="truncate absolute inset-0 text-center"
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  letterSpacing: '-0.005em',
                  color: palette.textMuted,
                }}
              >
                {phrases[phraseIdx]}
                {agent.brokerage ? ` · ${agent.brokerage}` : ''}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {/* Bio — only renders when (a) section is on AND (b) bio is set. */}
        {style.sections.bio && agent.bio && agent.bio.trim() && (
          <p
            className="mt-3 max-w-[44ch]"
            style={{
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
              color: palette.textSecondary,
            }}
          >
            {agent.bio}
          </p>
        )}

        {/* Social icons row — only renders when section toggle is on
            AND the agent has any platform handles set. */}
        {style.sections.social && agent.platforms && agent.platforms.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            {agent.platforms.map((p) => (
              <SocialLink key={p.id} platform={p} color={palette.textPrimary} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Small brand-icon link for an agent's social platform handle.
 */
function SocialLink({ platform, color }: { platform: Platform; color: string }) {
  const id = platform.id.toLowerCase()
  const Logo = PLATFORM_LOGOS_MONO[id]
  const href = platformUrl(platform)
  const label = `${id.charAt(0).toUpperCase()}${id.slice(1)}${platform.username ? ` — ${platform.username}` : ''}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center cursor-pointer"
      style={{
        color,
        transition: 'opacity 0.15s ease',
      }}
    >
      {Logo ? <Logo size={20} /> : <Globe size={20} />}
    </a>
  )
}

/**
 * Avatar with graceful letter fallback when the image fails (offline,
 * 404, etc). Letter sits at full opacity behind the image; the image
 * fades in once loaded. On error we don't render the <img> at all so
 * the browser's broken-image glyph never shows through.
 *
 * The optional frame prop lets the agent toggle a soft drop shadow
 * and/or a thin border on the avatar from the Style tab.
 */
function HeaderAvatar({
  agent,
  frame,
  palette,
}: {
  agent: UserDoc
  frame: FrameStyle
  palette: Palette
}) {
  const [loaded, setLoaded] = useState(agent.photoURL ? isImageCached(agent.photoURL) : false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setErrored(false)
    if (!agent.photoURL) return
    if (isImageCached(agent.photoURL)) { setLoaded(true); return }
    setLoaded(false)
    preloadImage(agent.photoURL)
      .then(() => setLoaded(true))
      .catch(() => setErrored(true))
  }, [agent.photoURL])

  const showImage = !!agent.photoURL && !errored && loaded
  const wantsBorder = frame === 'border' || frame === 'border_shadow'
  const wantsShadow = frame === 'shadow' || frame === 'border_shadow'

  return (
    <div
      className="relative w-20 h-20 md:w-24 md:h-24 rounded-full shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)',
        // Solid offset shadow + border both use the palette accent
        // (the dot color in the swatch) so every framed surface and
        // every action chip on the profile reads as the same family.
        boxShadow: wantsShadow ? `5px 5px 0 0 ${palette.accent}` : undefined,
        outline: wantsBorder ? `3px solid ${palette.accent}` : undefined,
        outlineOffset: wantsBorder ? '2px' : undefined,
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-white"
        style={{
          fontSize: '30px',
          fontWeight: 600,
          opacity: showImage ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      >
        {(agent.displayName || 'A').slice(0, 1).toUpperCase()}
      </span>
      {agent.photoURL && !errored && (
        <img
          src={agent.photoURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.18s ease' }}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}
