import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, MapPin, Home, Bookmark, Share2, MessageCircle, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { type Pin, type UserDoc, type ContentItem } from '@/lib/types'
import { getAllContent } from '@/lib/mock'

interface ContentFeedProps {
  pins: Pin[]
  agent: UserDoc
  onPinTap?: (pin: Pin) => void
  isPreview?: boolean
}

export function ContentFeed({ pins, agent, onPinTap, isPreview }: ContentFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const allContent = getAllContent(pins)

  if (allContent.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-midnight">
        <div className="text-center">
          <p className="text-[16px] font-semibold text-white mb-1">No content yet</p>
          <p className="text-[14px] text-ghost">This agent hasn't posted any content.</p>
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
      {allContent.map(({ content, pin }) => (
        <FeedCard key={content.id} content={content} pin={pin} agent={agent} onPinTap={onPinTap} isPreview={isPreview} />
      ))}
    </div>
  )
}

function FeedCard({ content, pin, agent, onPinTap, isPreview }: {
  content: ContentItem; pin: Pin; agent: UserDoc; onPinTap?: (pin: Pin) => void; isPreview?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const thumbnailUrl = content.thumbnailUrl || ('heroPhotoUrl' in pin ? pin.heroPhotoUrl : '') || ''
  const isVideo = content.type === 'reel' || content.type === 'live'
  const neighborhoodName = pin.type === 'neighborhood' && 'name' in pin ? pin.name : pin.neighborhoodId
  const hasOpenHouse = pin.type === 'for_sale' && 'openHouse' in pin && pin.openHouse
  const isLive = content.type === 'live'

  // Auto-play/pause video based on visibility
  useEffect(() => {
    if (!videoRef.current || !isVideo || !content.mediaUrl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) videoRef.current?.play().catch(() => {})
        else videoRef.current?.pause()
      },
      { threshold: 0.6 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [isVideo, content.mediaUrl])

  return (
    <div
      ref={cardRef}
      className="w-full relative"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* Background media */}
      <div className="absolute inset-0 bg-charcoal">
        {isVideo && content.mediaUrl ? (
          <video ref={videoRef} src={content.mediaUrl} className="w-full h-full object-cover" loop playsInline muted autoPlay />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-[calc(env(safe-area-inset-top,12px)+70px)] left-4 z-10">
          <Badge variant="live" pulse>LIVE</Badge>
        </div>
      )}

      {/* Open house badge */}
      {hasOpenHouse && (
        <div className="absolute top-[calc(env(safe-area-inset-top,12px)+70px)] left-4 z-10">
          <Badge variant="open">OPEN HOUSE</Badge>
        </div>
      )}

      {/* Right sidebar — engagement */}
      <div className="absolute right-3 bottom-[22%] z-10 flex flex-col items-center gap-5">
        <Avatar src={agent.photoURL} name={agent.displayName} size={40} ring="story" />

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}>
          <Bookmark size={26} className="text-white" />
          <span className="text-[10px] text-white font-semibold">{content.saves}</span>
        </motion.button>

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}>
          <MessageCircle size={24} className="text-white" />
          <span className="text-[10px] text-white font-semibold">0</span>
        </motion.button>

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}>
          <Share2 size={22} className="text-white" />
        </motion.button>

        {/* House icon — tap to see listing */}
        {pin.type !== 'neighborhood' && onPinTap && (
          <motion.button whileTap={{ scale: 0.75 }} onClick={() => onPinTap(pin)}
            className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <span className="text-[9px] text-white/60">Listing</span>
          </motion.button>
        )}

        {/* Contact */}
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-tangerine flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <span className="text-[10px] text-white font-semibold">Contact</span>
        </motion.button>
      </div>

      {/* Bottom caption — no prices, no specs, pure content */}
      <div className="absolute bottom-0 left-0 right-16 z-10 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] px-4">
        <p className="text-[15px] font-bold text-white mb-1">{agent.displayName}</p>
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={11} className="text-white/50 shrink-0" />
          <span className="text-[12px] text-white/50">{neighborhoodName}</span>
        </div>
        {content.caption && <p className="text-[13px] text-white/90 leading-relaxed line-clamp-3">{content.caption}</p>}
        <div className="flex items-center gap-1 mt-2">
          <Eye size={12} className="text-white/40" />
          <span className="text-[11px] text-white/40 font-medium">{content.views.toLocaleString()} views</span>
        </div>
      </div>
    </div>
  )
}
