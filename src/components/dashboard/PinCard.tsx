import { motion } from 'framer-motion'
import { Eye, CursorClick as MousePointerClick, MapPin, DotsThree as MoreHorizontal, House as Home, Key, Compass, Sparkle } from '@phosphor-icons/react'
import { PIN_CONFIG, type Pin } from '@/lib/types'
import { formatPrice } from '@/lib/firestore'
import { displayAddressWithUnit } from '@/lib/format'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { OpenHouseBadge } from '@/components/ui/OpenHouseBadge'
import { hasUpcomingOpenHouse } from '@/lib/openHouse'

interface PinCardProps {
  pin: Pin
  onClick?: () => void
  onToggle?: (enabled: boolean) => void
  onMore?: () => void
  variant?: 'feed' | 'manage'
  dark?: boolean
  /** True when the pin has an unactioned property-data change from
   *  the daily Rentcast sync. Renders a small pulsing tangerine dot
   *  in the top-right of the card. */
  hasPendingChange?: boolean
  /** Tap handler for the pending-change badge. Stops propagation so
   *  it doesn't double-fire onClick. */
  onPendingChangeClick?: () => void
  /** Manage-variant only: when true, the agent is on Pro and the taps
   *  count renders normally. When false, the count is blurred behind a
   *  Sparkle pip and clicking the stat fires onUpgradeClick. */
  isPro?: boolean
  onUpgradeClick?: () => void
}

export function PinCard({ pin, onClick, onToggle, onMore, variant = 'feed', dark = true, hasPendingChange, onPendingChangeClick, isPro, onUpgradeClick }: PinCardProps) {
  const config = PIN_CONFIG[pin.type]

  // Priority: listing photo (heroPhotoUrl) > content thumbnail > content mediaUrl > none
  const heroImage = ('heroPhotoUrl' in pin && pin.heroPhotoUrl)
    ? pin.heroPhotoUrl
    : (pin.content?.[0]?.thumbnailUrl || pin.content?.[0]?.mediaUrl || null)

  const priceDisplay = 'price' in pin ? formatPrice(pin.price)
    : 'soldPrice' in pin ? formatPrice(pin.soldPrice)
    : null

  const specs = 'beds' in pin ? `${pin.beds ?? 0} bd · ${pin.baths ?? 0} ba · ${(pin.sqft ?? 0).toLocaleString()} sqft` : null
  const contentCount = pin.content?.length || 0

  const isManage = variant === 'manage'
  // Disabled pins stay in the agent's My Pins list so they can be
  // toggled back on. Visually dim them so it's obvious at a glance
  // which ones aren't currently published to the public profile.
  const isDisabled = isManage && pin.enabled === false
  const showOpenHouse = pin.type === 'for_sale' && hasUpcomingOpenHouse(pin as any)

  return (
    <motion.div
      onClick={onClick}
      className={`
        rounded-[18px] overflow-hidden cursor-pointer transition-opacity
        ${dark ? 'bg-slate border border-border-dark' : 'bg-warm-white border border-border-light shadow-sm'}
        ${isDisabled ? 'opacity-55' : ''}
      `}
    >
      {/* Image area */}
      {heroImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <ProgressiveImage
            src={heroImage}
            alt={pin.address}
            className="absolute inset-0 w-full h-full"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Type pill — white bg with colored text for readability */}
          <div className="absolute top-3 left-3">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-bold shadow-sm"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
          </div>

          {/* Top-right indicators: open house, pending change. Rendered
              as a flex row so both can coexist without overlap. */}
          {(showOpenHouse || hasPendingChange) && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {showOpenHouse && <OpenHouseBadge size={26} />}
              {hasPendingChange && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPendingChangeClick?.() }}
                  aria-label="Property data updated"
                  className="relative w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                  style={{
                    background: 'var(--brand-grad)',
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.95), 0 4px 12px -2px rgba(217,74,31,0.6)',
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(255,107,61,0.45)' }}
                  />
                  <span className="relative w-2 h-2 rounded-full bg-white" />
                </button>
              )}
            </div>
          )}

          {/* Price pill */}
          {priceDisplay && (
            <div className="absolute bottom-3 left-3">
              <span className="font-mono font-bold text-[18px] text-white drop-shadow-lg">
                {priceDisplay}
              </span>
            </div>
          )}

          {/* Processing badge */}
          {pin.content?.[0]?.status === 'preparing' && (
            <div className="absolute bottom-3 right-3">
              <span className="glass-dark rounded-md px-2 py-0.5 text-[11px] font-semibold text-white flex items-center gap-1.5">
                <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            </div>
          )}
          {/* Duration badge for content with duration */}
          {pin.content?.[0]?.status !== 'preparing' && pin.content?.[0]?.duration != null && (
            <div className="absolute bottom-3 right-3">
              <span className="glass-dark rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold text-white">
                {Math.floor(pin.content[0].duration / 60)}:{String(pin.content[0].duration % 60).padStart(2, '0')}
              </span>
            </div>
          )}

        </div>
      )}

      {/* No image — full colored card with pin-type icon */}
      {!heroImage && (() => {
        const gradients: Record<string, string> = {
          for_sale: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          sold: 'linear-gradient(135deg, #34C759 0%, #22A34B 100%)',
          spotlight: 'linear-gradient(135deg, #FF6B3D 0%, #E8522A 100%)',
        }
        const icons: Record<string, typeof Home> = {
          for_sale: Home,
          sold: Key,
          spotlight: Compass,
        }
        const Icon = icons[pin.type] || Compass
        return (
          <div className="relative aspect-[16/10] overflow-hidden flex items-center justify-center" style={{ background: gradients[pin.type] || gradients.spotlight }}>
            <Icon size={40} weight="light" className="text-white/30" />
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-bold shadow-sm" style={{ color: config.color }}>
                {config.label}
              </span>
            </div>
            {(showOpenHouse || hasPendingChange) && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {showOpenHouse && <OpenHouseBadge size={26} />}
                {hasPendingChange && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPendingChangeClick?.() }}
                    aria-label="Property data updated"
                    className="relative w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                    style={{
                      background: 'var(--brand-grad)',
                      boxShadow: '0 0 0 2px rgba(255,255,255,0.95), 0 4px 12px -2px rgba(217,74,31,0.6)',
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: 'rgba(255,107,61,0.45)' }}
                    />
                    <span className="relative w-2 h-2 rounded-full bg-white" />
                  </button>
                )}
              </div>
            )}
            {priceDisplay && (
              <div className="absolute bottom-3 left-3">
                <span className="font-mono font-bold text-[18px] text-white drop-shadow-lg">
                  {priceDisplay}
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Content */}
      <div className="p-3.5 space-y-2">
        {/* Address */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className={dark ? 'text-ghost' : 'text-ash'} />
              <p className={`text-[13px] font-medium truncate ${dark ? 'text-mist' : 'text-graphite'}`}>
                {displayAddressWithUnit(pin.address, pin.unit)}
              </p>
            </div>
            {specs && (
              <p className={`text-[12px] mt-0.5 ${dark ? 'text-ghost' : 'text-smoke'}`}>
                {specs}
              </p>
            )}
            {'description' in pin && pin.description && (
              <p className={`text-[13px] mt-1 line-clamp-2 ${dark ? 'text-mist' : 'text-graphite'}`}>
                {pin.description}
              </p>
            )}
            {'name' in pin && pin.name && (
              <p className={`text-[14px] font-semibold mt-0.5 ${dark ? 'text-white' : 'text-ink'}`}>
                {pin.name}
              </p>
            )}
          </div>

          {variant === 'manage' && onMore && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onMore() }}
              className={`p-1.5 rounded-lg ${dark ? 'text-ghost hover:text-mist hover:bg-glass-light' : 'text-ash hover:text-smoke hover:bg-cream'}`}
            >
              <MoreHorizontal size={18} />
            </motion.button>
          )}
        </div>

        {/* Stats row — feed variant shows public views; manage variant
            shows taps (Pro-gated) so the agent can gauge pin reach
            without exposing those numbers on the public profile. */}
        <div className="flex items-center gap-3 pt-1">
          {!isManage && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${dark ? 'text-ghost' : 'text-smoke'}`}>
              <Eye size={12} /> {(pin.views ?? 0).toLocaleString()}
            </span>
          )}
          {isManage && (
            isPro ? (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${dark ? 'text-ghost' : 'text-smoke'}`}>
                <MousePointerClick size={12} /> {(pin.taps ?? 0).toLocaleString()}
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onUpgradeClick?.() }}
                className={`flex items-center gap-1 text-[11px] font-medium cursor-pointer ${dark ? 'text-ghost' : 'text-smoke'}`}
              >
                <MousePointerClick size={12} />
                <span className="blur-[3px] select-none" aria-hidden>
                  {((pin.taps ?? 0) || 42).toLocaleString()}
                </span>
                <Sparkle size={10} weight="fill" className="text-tangerine" />
              </button>
            )
          )}

          {variant === 'manage' && onToggle && (
            <div className="ml-auto">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onToggle(!pin.enabled) }}
                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer
                  ${pin.enabled ? 'bg-tangerine' : dark ? 'bg-charcoal' : 'bg-pearl'}
                `}
              >
                <motion.div
                  animate={{ x: pin.enabled ? 20 : 2 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
