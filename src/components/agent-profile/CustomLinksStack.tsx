/**
 * CustomLinksStack — Linktree-style vertical stack of agent-curated
 * external links on the public profile.
 *
 * Visual contract: cards use the EXACT same body background +
 * border/shadow vocabulary as the listing cards in ListingsTab.
 * That keeps the surfaces visually unified — links read as siblings
 * of the listings, not a separate skin. Title text is centered
 * within each pill so the cards feel like buttons, not list rows.
 *
 * Render gates (caller is responsible):
 *   - style.sections.links must be true
 *   - style.customLinks.length must be > 0
 *
 * Position: the caller decides where to render (between map peek and
 * listings via ListingsTab's `aboveListingsSlot`, or after listings
 * in AgentProfile). This component renders the stack itself.
 */
import type { CustomLink, FrameStyle } from '@/lib/style/types'
import { darkenHex, type Palette } from '@/lib/style/palettes'
import type { FontPairing } from '@/lib/style/fonts'
import { trackLinkTap } from '@/lib/firestore'

interface Props {
  agentId: string
  links: CustomLink[]
  palette: Palette
  font: FontPairing
  /** Frame treatment — independent from listings (`style.frames.links`)
   *  so agents can dial each surface separately. */
  frame: FrameStyle
}

// Match the listing-card body tint mix exactly (see ListingsTab.tsx
// CARD_BODY_TOP_PCT / BOTTOM_PCT). Links use a slightly tighter
// top→bottom gradient on a smaller surface so the tint is visible
// without overwhelming.
const LINK_BODY_TOP_PCT = 88
const LINK_BODY_BOTTOM_PCT = 78
function linkBodyBackground(accent: string): string {
  const top = `color-mix(in srgb, #FFFFFF ${LINK_BODY_TOP_PCT}%, ${accent} ${100 - LINK_BODY_TOP_PCT}%)`
  const bottom = `color-mix(in srgb, #FFFFFF ${LINK_BODY_BOTTOM_PCT}%, ${accent} ${100 - LINK_BODY_BOTTOM_PCT}%)`
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`
}

export function CustomLinksStack({ agentId, links, palette, font, frame }: Props) {
  if (links.length === 0) return null
  return (
    <section
      // Symmetric vertical breathing room: matches the gap the
      // listings grid leaves above/below itself, so the stack reads
      // as a real section rather than crowding into adjacent surfaces.
      className="px-5 md:px-7 pt-6 pb-5 md:pt-7 md:pb-6"
      aria-label="Links"
      style={{ fontFamily: font.body }}
    >
      <div className="flex flex-col gap-4">
        {links.map((link) => (
          <LinkCard
            key={link.id}
            agentId={agentId}
            link={link}
            palette={palette}
            font={font}
            frame={frame}
          />
        ))}
      </div>
    </section>
  )
}

function LinkCard({
  agentId, link, palette, font, frame,
}: {
  agentId: string
  link: CustomLink
  palette: Palette
  font: FontPairing
  frame: FrameStyle
}) {
  const wantsBorder = frame === 'border' || frame === 'border_shadow'
  const wantsShadow = frame === 'shadow' || frame === 'border_shadow'

  // Fire-and-forget tap tracking; never await — the external nav
  // shouldn't wait on a Firestore round-trip.
  const handleClick = () => {
    try { trackLinkTap(agentId, link.id) } catch { /* swallow */ }
  }

  // Defensive truncation if a longer title slipped past the editor cap.
  const safeTitle = link.title.length > 60 ? link.title.slice(0, 60) + '…' : link.title

  // Same body-tint + frame vocabulary as ListingCardZillow.
  const bodyBg = linkBodyBackground(palette.accent)
  const bodyInk = '#0A0E17'

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="group relative block w-full overflow-hidden text-left cursor-pointer rounded-[14px] transition-transform duration-200 ease-out hover:-translate-y-[1px]"
      style={{
        background: bodyBg,
        color: bodyInk,
        outline: wantsBorder ? '3px solid var(--accent, #D94A1F)' : undefined,
        outlineOffset: wantsBorder ? '0' : undefined,
        boxShadow: wantsShadow
          ? '6px 6px 0 0 var(--accent, #D94A1F)'
          : '0 1px 2px rgba(10,14,23,0.06), 0 6px 18px -10px rgba(10,14,23,0.18)',
        border: wantsBorder ? undefined : '1px solid rgba(10,14,23,0.06)',
      }}
    >
      {/* Three-column grid keeps the title visually centered in the
          card while the thumbnail (left) and chevron (right) anchor
          to the edges. Without the grid, padding asymmetry from the
          thumbnail makes "centered" text drift right. */}
      <div className="grid items-center gap-3 px-4 py-3" style={{ gridTemplateColumns: '48px 1fr 48px' }}>
        <LinkThumbnail link={link} palette={palette} font={font} />
        <span
          className="block min-w-0 truncate text-center text-[15px] leading-tight"
          style={{ fontFamily: font.display, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          {safeTitle}
        </span>
        <div className="flex justify-end">
          <ChevronGlyph color={palette.accent} />
        </div>
      </div>
    </a>
  )
}

/** Square avatar — thumbnail when present, else a deterministic gradient
 *  derived from the title. */
function LinkThumbnail({
  link, palette, font,
}: {
  link: CustomLink
  palette: Palette
  font: FontPairing
}) {
  const size = 44
  const radius = 11

  if (link.thumbnailUrl) {
    return (
      <img
        src={link.thumbnailUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    )
  }

  // Fallback gradient with the first letter centered. Palette-derived
  // (accent → darker accent) so every link sits in the same brand
  // family — earlier hash-derived hues drifted into random territory
  // and competed visually with the listings cards.
  const letter = (link.title.trim()[0] || '•').toUpperCase()
  const grad = `linear-gradient(135deg, ${palette.accent} 0%, ${darkenHex(palette.accent, 0.22)} 100%)`

  return (
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: grad,
        color: '#FFFFFF',
        fontFamily: font.display,
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: '-0.02em',
      }}
      aria-hidden
    >
      {letter}
    </div>
  )
}

function ChevronGlyph({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-[2px]"
      style={{ color }}
    >
      <path
        d="M5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

