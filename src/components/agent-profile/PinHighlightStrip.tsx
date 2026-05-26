/**
 * PinHighlightStrip — horizontal scrollable strip of pin "stories"
 * sitting just above the map peek. Replaces the old card grid below
 * the listings tab.
 *
 * Each item:
 *   • 64-72px circle with a 2.5px colored ring matching the pin type
 *     (blue / green / tangerine — same palette as the map pins so
 *     visual language carries one-to-one)
 *   • Inside the circle: pin.heroPhotoUrl OR first content cover OR
 *     pin-type fallback icon
 *   • Below the circle: a pill with price / "Sold" / spotlight name
 *     Truncated with ellipsis if too long so neighboring pills can't
 *     overlap. Width capped at circle width + a hair.
 *
 * Interaction:
 *   • Tap a pin → onSelectPin(pin), parent decides whether to open
 *     ContentFeed (when pin has content) or ListingModal (when not)
 *     — same logic the map pin tap path uses.
 *   • Horizontal scroll with subtle right bleed so users can see
 *     there's more to swipe to.
 *
 * Why this exists: the old card grid was visually heterogeneous
 * (listings with photos vs. without, spotlights with no listing
 * data) which made the page feel chaotic. The strip standardizes
 * the visual treatment and matches the map's vocabulary, giving
 * every pin equal real estate above the fold.
 */
import type { Pin, ForSalePin, SoldPin, SpotlightPin } from '@/lib/types'
import type { Palette } from '@/lib/style/palettes'
import type { FontPairing } from '@/lib/style/fonts'
import { House, Key, Compass } from '@phosphor-icons/react'

// Map ring colors — must match `RING_COLORS` in MapCanvas.tsx so a
// pin in the strip and the same pin on the map read as the same thing.
const RING_COLOR: Record<Pin['type'], string> = {
  for_sale: '#3B82F6',
  sold: '#34C759',
  spotlight: '#FF6B3D',
}

// Match the map-pin label pill: solid ring color background, white
// text. Keeps the strip visually one-to-one with the map.
const PILL_BG: Record<Pin['type'], string> = {
  for_sale: '#3B82F6',
  sold: '#34C759',
  spotlight: '#FF6B3D',
}

interface Props {
  pins: Pin[]
  palette: Palette
  font: FontPairing
  onSelectPin: (pin: Pin) => void
}

export function PinHighlightStrip({ pins, palette: _palette, font, onSelectPin }: Props) {
  void _palette
  if (pins.length === 0) return null

  return (
    <div
      className="pin-highlight-strip -mx-5 md:-mx-7 mb-6 overflow-x-auto overflow-y-visible"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        fontFamily: font.body,
      }}
    >
      <style>{`.pin-highlight-strip::-webkit-scrollbar { display: none; }`}</style>
      {/* width: max-content + mx-auto centers the strip when the row
          fits, and falls back to native scroll-left-aligned when it
          overflows. Plain `justify-content: center` clips the start
          on Safari when overflowing. */}
      <div
        className="flex gap-2.5 px-5 md:px-7 pb-2 mx-auto"
        style={{ width: 'max-content' }}
      >
        {pins.map((pin) => (
          <PinHighlight key={pin.id} pin={pin} onTap={() => onSelectPin(pin)} />
        ))}
      </div>
    </div>
  )
}

// Dark inner fill mirrors MapCanvas createPinImage (#0A0E17), so a pin
// in the strip and the same pin on the map are pixel-cousins, not
// distant relatives.
const INNER_FILL = '#0A0E17'

// Rainbow conic gradient — IG-stories style, mirrors the open-house
// ring stops in MapCanvas createOpenHousePin so a for-sale pin with
// active/upcoming open house sessions reads identically in the strip
// and on the map.
const OPEN_HOUSE_RING =
  'conic-gradient(from -90deg, #FF6B3D 0%, #FFD089 16%, #34C759 33%, #3B82F6 50%, #A855F7 66%, #FF3B7A 83%, #FF6B3D 100%)'

function PinHighlight({ pin, onTap }: { pin: Pin; onTap: () => void }) {
  const ring = RING_COLOR[pin.type]
  const pillBg = PILL_BG[pin.type]
  const label = pillLabel(pin)
  const hero = heroFor(pin)
  const FallbackIcon = pin.type === 'sold' ? Key : pin.type === 'spotlight' ? Compass : House
  const hasOpenHouse =
    pin.type === 'for_sale' &&
    'openHouse' in pin &&
    !!(pin as ForSalePin).openHouse?.sessions?.length

  return (
    <button
      type="button"
      onClick={onTap}
      className="shrink-0 flex flex-col items-center cursor-pointer"
      aria-label={`Open ${label || pin.address}`}
      style={{ width: 72 }}
    >
      {/* Ringed circle. Ring is a 3px solid band of pin-type color
          (or the open-house rainbow gradient when sessions are
          scheduled), inner is dark #0A0E17 with photo OR a colored
          type icon — one-to-one with MapCanvas createPinImage /
          createOpenHousePin. No hover scale: the user wants the strip
          to feel like the map pins (which don't grow on hover either). */}
      <div
        className="relative rounded-full"
        style={{
          background: hasOpenHouse ? OPEN_HOUSE_RING : ring,
          width: 64,
          height: 64,
          padding: 3,
        }}
      >
        <div
          className="rounded-full overflow-hidden flex items-center justify-center"
          style={{ width: '100%', height: '100%', backgroundColor: INNER_FILL }}
        >
          {hero ? (
            <img
              src={hero}
              alt=""
              className="w-full h-full object-cover rounded-full"
              loading="lazy"
            />
          ) : (
            // Colored stroke icon on dark fill — same vibe as the
            // map's getPinTypeIcon SVGs (stroke color = ring color).
            <FallbackIcon size={28} color={ring} weight="regular" />
          )}
        </div>

        {/* Label pill — solid ring-color bg, white text, Outfit bold
            (matches createPillImage in MapCanvas). Anchored to bottom
            edge and overlapping ~45% so it reads as one connected
            pin element. */}
        {label ? (
          <div
            className="absolute left-1/2 rounded-full"
            style={{
              backgroundColor: pillBg,
              top: '100%',
              transform: 'translate(-50%, -45%)',
              maxWidth: 84,
              padding: '3px 8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.22)',
            }}
          >
            <span
              className="block text-center text-white"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.1,
                lineHeight: '13px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={label}
            >
              {label}
            </span>
          </div>
        ) : null}
      </div>

      {/* Spacer reserves room below the circle for the absolutely-
          positioned pill so neighboring rows below the strip don't
          collide with it. */}
      <div aria-hidden style={{ height: 14 }} />
    </button>
  )
}

function pillLabel(pin: Pin): string {
  if (pin.type === 'spotlight') {
    const p = pin as SpotlightPin
    return p.name || 'Spotlight'
  }
  if (pin.type === 'sold') return 'SOLD'
  // for_sale → price
  const p = pin as ForSalePin
  const price = p.price ?? 0
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 1)}M`
  if (price >= 1_000) return `$${Math.round(price / 1_000)}K`
  if (price > 0) return `$${price}`
  return ''
}

function heroFor(pin: Pin): string | null {
  if (pin.type === 'spotlight') {
    const p = pin as SpotlightPin
    return p.heroPhotoUrl || firstContentCover(pin)
  }
  const p = pin as ForSalePin | SoldPin
  return p.heroPhotoUrl || firstContentCover(pin)
}

function firstContentCover(pin: Pin): string | null {
  const c = pin.content?.[0]
  if (!c) return null
  if (c.type === 'photo' && c.mediaUrls?.[0]) return c.mediaUrls[0]
  if (c.type === 'reel' && 'thumbnailUrl' in c && c.thumbnailUrl) return c.thumbnailUrl as string
  return null
}
