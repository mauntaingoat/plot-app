import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Radio, Eye, MapPin, Bookmark, Share2, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
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

  // All pins shown as full-screen cards (content-first: stories, reels, live, then listings)
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
      <div className="flex-1 flex items-center justify-center bg-midnight">
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
      className="flex-1 bg-midnight overflow-y-auto snap-y snap-mandatory"
      style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'y mandatory' }}
    >
      {sortedPins.map((pin) => (
        <FeedCard
          key={pin.id}
          pin={pin}
          agent={agent}
          onTap={() => onPinClick(pin)}
          isPreview={isPreview}
        />
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

  return (
    <div
      className="w-full snap-start snap-always relative"
      style={{ height: 'calc(100vh - 130px)' }}
    >
      {/* Background image */}
      <div className="absolute inset-0 bg-charcoal" onClick={onTap}>
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
      </div>

      {/* Top badge */}
      <div className="absolute top-4 left-4 z-10">
        <Badge
          variant={pin.type === 'live' ? 'live' : pin.type === 'sold' ? 'sold' : pin.type === 'open_house' ? 'open' : pin.type === 'story' ? 'story' : pin.type === 'reel' ? 'reel' : 'listing'}
          pulse={pin.type === 'live'}
        >
          {pin.type === 'live' && <Radio size={10} />}
          {pin.type === 'reel' && <Play size={10} />}
          {config.label}
        </Badge>
      </div>

      {/* Price (if listing/sold/open) */}
      {price && (
        <div className="absolute top-4 right-4 z-10">
          <span className="font-mono font-bold text-[20px] text-white drop-shadow-lg">{price}</span>
        </div>
      )}

      {/* Right sidebar — engagement */}
      <div className="absolute right-3 bottom-[25%] z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <Avatar src={agent.photoURL} name={agent.displayName} size={40} ring="story" />
        </div>
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-50' : ''}`}
        >
          <Bookmark size={26} className="text-white" />
          <span className="text-[10px] text-white font-semibold">{pin.saves}</span>
        </motion.button>
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-50' : ''}`}
        >
          <MessageCircle size={24} className="text-white" />
          <span className="text-[10px] text-white font-semibold">0</span>
        </motion.button>
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-50' : ''}`}
        >
          <Share2 size={22} className="text-white" />
        </motion.button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-10 pb-6 px-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[15px] font-bold text-white">{agent.displayName}</p>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin size={12} className="text-white/60" />
          <span className="text-[12px] text-white/60">{pin.address}</span>
        </div>

        {/* Specs for listings */}
        {'beds' in pin && (
          <p className="text-[13px] text-white/80 mb-1.5">
            {pin.beds} bd · {pin.baths} ba · {pin.sqft.toLocaleString()} sqft
          </p>
        )}

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
