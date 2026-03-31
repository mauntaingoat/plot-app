import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, MapPin, Bookmark, Share2, MessageCircle, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { PIN_CONFIG, type Pin, type UserDoc } from '@/lib/types'
import { formatPrice } from '@/lib/firestore'

interface ContentFeedProps {
  pins: Pin[]
  agent: UserDoc
  onPinClick?: (pin: Pin) => void
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
        <FeedCard key={pin.id} pin={pin} agent={agent} isPreview={isPreview} />
      ))}
    </div>
  )
}

// ── Inline content card — plays media directly, no tap-to-open ──

function FeedCard({ pin, agent, isPreview }: { pin: Pin; agent: UserDoc; isPreview?: boolean }) {
  const config = PIN_CONFIG[pin.type]
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [photoIndex, setPhotoIndex] = useState(0)

  const imageUrl = 'heroPhotoUrl' in pin ? pin.heroPhotoUrl
    : 'thumbnailUrl' in pin ? pin.thumbnailUrl
    : 'mediaUrl' in pin ? pin.mediaUrl
    : null

  const mediaUrl = 'mediaUrl' in pin ? pin.mediaUrl : null
  const isVideo = pin.type === 'reel' || pin.type === 'live' || (pin.type === 'story' && 'mediaType' in pin && pin.mediaType === 'video')
  const photos = 'photos' in pin ? pin.photos : []
  const hasCarousel = photos.length > 1

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
  const typeLine = specsText ? `${config.label} · ${specsText}` : config.label

  // Auto-play/pause video based on visibility
  useEffect(() => {
    if (!videoRef.current || !isVideo) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {})
        } else {
          videoRef.current?.pause()
        }
      },
      { threshold: 0.6 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [isVideo])

  const currentImage = hasCarousel ? photos[photoIndex] : imageUrl

  return (
    <div
      ref={cardRef}
      className="w-full relative"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* Background: video or image */}
      <div className="absolute inset-0 bg-charcoal">
        {isVideo && mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-cover"
            loop
            playsInline
            muted
            autoPlay
          />
        ) : currentImage ? (
          <img src={currentImage} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      </div>

      {/* Carousel arrows for multi-photo listings */}
      {hasCarousel && (
        <>
          <button
            onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
            className="absolute right-16 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ChevronRight size={16} />
          </button>
          {/* Dots */}
          <div className="absolute top-[calc(env(safe-area-inset-top,12px)+70px)] left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {photos.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}

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

        {/* Contact agent */}
        <motion.button
          whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-tangerine flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <span className="text-[10px] text-white font-semibold">Contact</span>
        </motion.button>
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-0 left-0 right-16 z-10 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] px-4">
        <p className="text-[15px] font-bold text-white mb-1.5">{agent.displayName}</p>

        <div className="flex items-center gap-1 mb-0.5">
          <MapPin size={12} className="text-white/60 shrink-0" />
          <span className="text-[12px] text-white/60">{pin.address}</span>
        </div>

        {price && <p className="text-[13px] text-white/80 font-semibold mb-1">{price}</p>}

        <p className="text-[12px] text-white/50 mb-1.5">{typeLine}</p>

        {caption && <p className="text-[13px] text-white/90 leading-relaxed line-clamp-3">{caption}</p>}

        <div className="flex items-center gap-1 mt-2">
          <Eye size={12} className="text-white/40" />
          <span className="text-[11px] text-white/40 font-medium">{pin.views.toLocaleString()} views</span>
        </div>
      </div>
    </div>
  )
}
