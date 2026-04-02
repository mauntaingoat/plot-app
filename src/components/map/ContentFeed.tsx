import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, MapPin, Home, Bookmark, Share2, MessageCircle, Phone, UserPlus, UserCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ListingOnlySheet } from '@/components/viewers/ListingOnlySheet'
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
  const [listingSheet, setListingSheet] = useState<Pin | null>(null)
  const [following, setFollowing] = useState(false)

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
    <>
      <div ref={scrollRef} className="absolute inset-0 bg-midnight overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'y mandatory' }}>
        {allContent.map(({ content, pin }) => (
          <FeedCard key={content.id} content={content} pin={pin} agent={agent}
            isPreview={isPreview} following={following}
            onFollowToggle={() => setFollowing(!following)}
            onListingTap={() => pin.type !== 'neighborhood' && setListingSheet(pin)} />
        ))}
      </div>

      {/* Listing-only sheet (no content tab, just MLS data) */}
      {listingSheet && (
        <ListingOnlySheet pin={listingSheet} agent={agent} onClose={() => setListingSheet(null)} isPreview={isPreview} />
      )}
    </>
  )
}

function FeedCard({ content, pin, agent, isPreview, following, onFollowToggle, onListingTap }: {
  content: ContentItem; pin: Pin; agent: UserDoc; isPreview?: boolean
  following: boolean; onFollowToggle: () => void; onListingTap: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const thumbnailUrl = content.thumbnailUrl || ('heroPhotoUrl' in pin ? pin.heroPhotoUrl : '') || ''
  const isVideo = content.type === 'reel' || content.type === 'live'
  const neighborhoodName = pin.type === 'neighborhood' && 'name' in pin ? pin.name : pin.neighborhoodId
  const hasOpenHouse = pin.type === 'for_sale' && 'openHouse' in pin && pin.openHouse

  useEffect(() => {
    if (!videoRef.current || !isVideo || !content.mediaUrl) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) videoRef.current?.play().catch(() => {})
      else videoRef.current?.pause()
    }, { threshold: 0.6 })
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [isVideo, content.mediaUrl])

  return (
    <div ref={cardRef} className="w-full relative"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
      {/* Background media */}
      <div className="absolute inset-0 bg-charcoal">
        {isVideo && content.mediaUrl ? (
          <video ref={videoRef} src={content.mediaUrl} className="w-full h-full object-cover" loop playsInline muted autoPlay />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      </div>

      {/* Open house + live indicators moved to caption below */}

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[22%] z-10 flex flex-col items-center gap-5">
        {/* Agent avatar — tap to follow/unfollow (fixed size, no shift) */}
        <div className="relative w-10 h-12">
          <motion.button whileTap={!isPreview ? { scale: 0.9 } : undefined}
            onClick={!isPreview ? onFollowToggle : undefined}
            className="w-10 h-10">
            <Avatar src={agent.photoURL} name={agent.displayName} size={40} ring={following ? 'story' : 'none'} />
          </motion.button>
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{ background: following ? '#34C759' : '#FF6B3D' }}>
            {following ? <UserCheck size={9} className="text-white" /> : <UserPlus size={9} className="text-white" />}
          </div>
        </div>

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

        {/* House icon — listing only (no content tab) */}
        {pin.type !== 'neighborhood' && (
          <motion.button whileTap={{ scale: 0.75 }} onClick={onListingTap}
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

      {/* Bottom caption — type label inline with location */}
      <div className="absolute bottom-0 left-0 right-16 z-10 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] px-4">
        <p className="text-[15px] font-bold text-white mb-1">{agent.displayName}</p>
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <MapPin size={11} className="text-white/50 shrink-0" />
          <span className="text-[12px] text-white/50">{neighborhoodName}</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[11px] text-white/40 uppercase font-semibold">{content.type.replace('_', ' ')}</span>
          {content.type === 'live' && (
            <><span className="text-[10px] text-white/30">·</span><span className="text-[11px] text-live-red font-bold uppercase">Live</span></>
          )}
          {hasOpenHouse && (
            <><span className="text-[10px] text-white/30">·</span><span className="text-[11px] text-open-amber font-bold uppercase">Open House</span></>
          )}
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
