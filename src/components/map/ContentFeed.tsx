import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Radio, Eye, MapPin, Bookmark, Share2, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { PIN_CONFIG, type Pin, type UserDoc } from '@/lib/types'
import { formatPrice } from '@/lib/firestore'

interface ContentFeedProps {
  pins: Pin[]
  agent: UserDoc
  onPinClick: (pin: Pin) => void
  isPreview?: boolean
}

export function ContentFeed({ pins, agent, onPinClick, isPreview }: ContentFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const sortedPins = [
    ...pins.filter((p) => p.type === 'story'),
    ...pins.filter((p) => p.type === 'reel'),
    ...pins.filter((p) => p.type === 'live'),
    ...pins.filter((p) => p.type === 'listing'),
    ...pins.filter((p) => p.type === 'sold'),
    ...pins.filter((p) => p.type === 'open_house'),
  ]

  if (sortedPins.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-midnight">
        <div className="text-center">
          <p className="text-[16px] font-semibold text-white mb-1">No content yet</p>
          <p className="text-[14px] text-ghost">Nothing to show with these filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 bg-midnight overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'y mandatory' }}
    >
      {sortedPins.map((pin) => (
        <FeedCard key={pin.id} pin={pin} agent={agent} onTap={() => onPinClick(pin)} isPreview={isPreview} />
      ))}
    </div>
  )
}

function FeedCard({ pin, agent, onTap, isPreview }: { pin: Pin; agent: UserDoc; onTap: () => void; isPreview?: boolean }) {
  const config = PIN_CONFIG[pin.type]

  const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl
    : 'thumbnailUrl' in pin ? pin.thumbnailUrl
    : 'mediaUrl' in pin ? pin.mediaUrl
    : null

  const price = 'price' in pin ? formatPrice(pin.price)
    : 'soldPrice' in pin ? formatPrice(pin.soldPrice)
    : 'listingPrice' in pin ? formatPrice(pin.listingPrice)
    : null

  const caption = 'caption' in pin ? pin.caption
    : 'description' in pin ? pin.description
    : 'title' in pin ? pin.title
    : null

  const hasSpecs = 'beds' in pin
  const specsText = hasSpecs ? `${pin.beds} bd · ${pin.baths} ba · ${pin.sqft.toLocaleString()} sqft` : null

  // Build the type + specs line
  const typeLine = specsText
    ? `${config.label} · ${specsText}`
    : config.label

  return (
    <div
      className="w-full relative"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* Full-screen background */}
      <div className="absolute inset-0 bg-charcoal" onClick={onTap}>
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
      </div>

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[22%] z-10 flex flex-col items-center gap-5">
        <Avatar src={agent.photoURL} name={agent.displayName} size={40} ring="story" />
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}
        >
          <Bookmark size={26} className="text-white" />
          <span className="text-[10px] text-white font-semibold">{pin.saves}</span>
        </motion.button>
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}
        >
          <MessageCircle size={24} className="text-white" />
          <span className="text-[10px] text-white font-semibold">0</span>
        </motion.button>
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}
        >
          <Share2 size={22} className="text-white" />
        </motion.button>
      </div>

      {/* Bottom caption area */}
      <div className="absolute bottom-0 left-0 right-16 z-10 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] px-4">
        {/* Agent name */}
        <p className="text-[15px] font-bold text-white mb-1.5">{agent.displayName}</p>

        {/* Address */}
        <div className="flex items-center gap-1 mb-0.5">
          <MapPin size={12} className="text-white/60 shrink-0" />
          <span className="text-[12px] text-white/60">{pin.address}</span>
        </div>

        {/* Price — same style as address, right below it */}
        {price && (
          <p className="text-[13px] text-white/80 font-semibold mb-1.5">{price}</p>
        )}

        {/* Type + specs on same line */}
        <p className="text-[12px] text-white/50 mb-1.5">{typeLine}</p>

        {/* Caption */}
        {caption && (
          <p className="text-[13px] text-white/90 leading-relaxed line-clamp-3">{caption}</p>
        )}

        {/* Views */}
        <div className="flex items-center gap-1 mt-2">
          <Eye size={12} className="text-white/40" />
          <span className="text-[11px] text-white/40 font-medium">{pin.views.toLocaleString()} views</span>
        </div>
      </div>
    </div>
  )
}
