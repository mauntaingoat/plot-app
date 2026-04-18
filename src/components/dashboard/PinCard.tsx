import { motion } from 'framer-motion'
import { Eye, MousePointerClick, Bookmark, MapPin, MoreHorizontal, Sparkles } from 'lucide-react'
import { PIN_CONFIG, type Pin } from '@/lib/types'
import { formatPrice } from '@/lib/firestore'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'

interface PinCardProps {
  pin: Pin
  onClick?: () => void
  onToggle?: (enabled: boolean) => void
  onMore?: () => void
  variant?: 'feed' | 'manage'
  dark?: boolean
}

export function PinCard({ pin, onClick, onToggle, onMore, variant = 'feed', dark = true }: PinCardProps) {
  const config = PIN_CONFIG[pin.type]

  // Priority: listing photo (heroPhotoUrl) > content thumbnail > content mediaUrl > none
  const heroImage = ('heroPhotoUrl' in pin && pin.heroPhotoUrl)
    ? pin.heroPhotoUrl
    : (pin.content?.[0]?.thumbnailUrl || pin.content?.[0]?.mediaUrl || null)

  const priceDisplay = 'price' in pin ? formatPrice(pin.price)
    : 'soldPrice' in pin ? formatPrice(pin.soldPrice)
    : null

  const specs = 'beds' in pin ? `${pin.beds} bd · ${pin.baths} ba · ${pin.sqft.toLocaleString()} sqft` : null
  const contentCount = pin.content?.length || 0

  const isManage = variant === 'manage'

  return (
    <motion.div
      onClick={onClick}
      className={`
        rounded-[18px] overflow-hidden cursor-pointer
        ${dark ? 'bg-slate border border-border-dark' : 'bg-warm-white border border-border-light shadow-sm'}
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

          {/* Price pill */}
          {priceDisplay && (
            <div className="absolute bottom-3 left-3">
              <span className="font-mono font-bold text-[18px] text-white drop-shadow-lg">
                {priceDisplay}
              </span>
            </div>
          )}

          {/* Duration badge for content with duration */}
          {pin.content?.[0]?.duration != null && (
            <div className="absolute bottom-3 right-3">
              <span className="glass-dark rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold text-white">
                {Math.floor(pin.content[0].duration / 60)}:{String(pin.content[0].duration % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Live viewer count */}
          {pin.type === 'for_sale' && 'isLive' in pin && pin.isLive && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="glass-dark rounded-full px-2.5 py-1 text-[11px] font-bold text-white flex items-center gap-1">
                <Eye size={12} /> LIVE
              </span>
            </div>
          )}
        </div>
      )}

      {/* No image — spotlight gets tangerine placeholder, others get colored bar */}
      {!heroImage && pin.type === 'spotlight' && (
        <div className="relative aspect-[16/10] overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B3D 0%, #E8522A 100%)' }}>
          <Sparkles size={40} className="text-white/30" />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-bold shadow-sm" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
        </div>
      )}
      {!heroImage && pin.type !== 'spotlight' && (
        <div className="h-2 w-full" style={{ background: config.color }} />
      )}

      {/* Content */}
      <div className="p-3.5 space-y-2">
        {/* Address */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className={dark ? 'text-ghost' : 'text-ash'} />
              <p className={`text-[13px] font-medium truncate ${dark ? 'text-mist' : 'text-graphite'}`}>
                {pin.address}
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

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1">
          <span className={`flex items-center gap-1 text-[11px] font-medium ${dark ? 'text-ghost' : 'text-smoke'}`}>
            <Eye size={12} /> {pin.views.toLocaleString()}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-medium ${dark ? 'text-ghost' : 'text-smoke'}`}>
            <MousePointerClick size={12} /> {pin.taps.toLocaleString()}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-medium ${dark ? 'text-ghost' : 'text-smoke'}`}>
            <Bookmark size={12} /> {pin.saves.toLocaleString()}
          </span>

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
