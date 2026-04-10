import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, MapPin, Home, X, Bookmark, Share2, MessageCircle, Phone, UserPlus, UserCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ListingOnlySheet } from '@/components/viewers/ListingOnlySheet'
import { type Pin, type UserDoc, type ContentItem } from '@/lib/types'
import { getAllContent } from '@/lib/mock'
import { useSaves } from '@/hooks/useSaves'

interface ContentFeedProps {
  pins: Pin[]
  agent: UserDoc
  onPinTap?: (pin: Pin) => void
  isPreview?: boolean
  isSignedIn?: boolean
  onAuthRequired?: () => void
}

export function ContentFeed({ pins, agent, onPinTap, isPreview, isSignedIn, onAuthRequired }: ContentFeedProps) {
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
        style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'auto', overscrollBehavior: 'none' }}>
        {allContent.map(({ content, pin }) => (
          <FeedCard key={content.id} content={content} pin={pin} agent={agent}
            isPreview={isPreview} following={following}
            isSignedIn={isSignedIn} onAuthRequired={onAuthRequired}
            onFollowToggle={() => {
              if (!isSignedIn && !isPreview && onAuthRequired) { onAuthRequired(); return }
              setFollowing(!following)
            }}
            onListingTap={() => pin.type !== 'neighborhood' && setListingSheet(pin)} />
        ))}
      </div>

      {/* Listing-only sheet — slide-from-left panel within feed on desktop, bottom sheet on mobile */}
      {typeof window !== 'undefined' && window.innerWidth >= 768 ? (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-[18] bg-black/40"
            style={{
              opacity: listingSheet ? 1 : 0,
              pointerEvents: listingSheet ? 'auto' : 'none',
              transition: 'opacity 0.25s ease',
            }}
            onClick={() => setListingSheet(null)}
          />
          {/* Panel — slides from left, constrained to feed */}
          <div
            className="absolute top-0 left-0 bottom-0 z-[20] flex flex-col bg-obsidian border-r border-border-dark overflow-hidden"
            style={{
              width: '100%',
              transform: listingSheet ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <div className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-border-dark">
              <h2 className="text-[14px] font-bold text-white truncate flex-1 mr-3">{listingSheet?.address}</h2>
              <button onClick={() => setListingSheet(null)} className="w-7 h-7 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-white cursor-pointer shrink-0">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {listingSheet && (
                <ListingOnlySheet pin={listingSheet} agent={agent} onClose={() => setListingSheet(null)} isPreview={isPreview} embedded isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
              )}
            </div>
          </div>
        </>
      ) : listingSheet ? (
        <ListingOnlySheet pin={listingSheet} agent={agent} onClose={() => setListingSheet(null)} isPreview={isPreview} isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
      ) : null}
    </>
  )
}

function FeedCard({ content, pin, agent, isPreview, following, onFollowToggle, onListingTap, isSignedIn, onAuthRequired }: {
  content: ContentItem; pin: Pin; agent: UserDoc; isPreview?: boolean
  following: boolean; onFollowToggle: () => void; onListingTap: () => void
  isSignedIn?: boolean; onAuthRequired?: () => void
}) {
  const requireAuth = () => { if (!isSignedIn && onAuthRequired) onAuthRequired() }
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const thumbnailUrl = content.thumbnailUrl || ('heroPhotoUrl' in pin ? pin.heroPhotoUrl : '') || ''
  const isVideo = content.type === 'reel' || content.type === 'live'
  const isStory = content.type === 'story'
  const neighborhoodName = pin.type === 'neighborhood' && 'name' in pin ? pin.name : pin.neighborhoodId
  const hasOpenHouse = pin.type === 'for_sale' && 'openHouse' in pin && pin.openHouse
  const { isSaved, toggleSave } = useSaves()
  const saved = isSaved(pin.id, content.id)

  // Lazy load video: only mount when near viewport, preload 200px ahead
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true)
        if (videoRef.current) videoRef.current.play().catch(() => {})
      } else {
        if (videoRef.current) videoRef.current.pause()
      }
    }, { threshold: 0.1, rootMargin: '200px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={cardRef} className="w-full relative"
      style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', willChange: 'transform', contain: 'layout style paint' }}>
      {/* Background media */}
      <div className="absolute inset-0 bg-charcoal overflow-hidden">
        {isVideo && content.mediaUrl && isNearViewport ? (
          <>
            {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-y-110 opacity-50" />}
            <video ref={videoRef} src={content.mediaUrl} className="relative w-full h-full object-cover" loop playsInline muted preload="auto" />
          </>
        ) : isVideo && content.mediaUrl ? (
          <>
            {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
          </>
        ) : thumbnailUrl ? (
          <>
            <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-y-110 opacity-50" loading="lazy" />
            <img src={thumbnailUrl} alt="" className="relative w-full h-full object-cover" loading="lazy" />
          </>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      </div>

      {/* Open house + live indicators moved to caption below */}

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[22%] z-10 flex flex-col items-center gap-5" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
        {/* Agent avatar — tap to follow/unfollow (fixed size, no shift) */}
        <div className="relative w-10 h-12">
          <motion.button whileTap={!isPreview ? { scale: 0.9 } : undefined}
            onClick={!isPreview ? onFollowToggle : undefined}
            className="w-10 h-10">
            <Avatar src={agent.photoURL} name={agent.displayName} size={40} ring="none" />
          </motion.button>
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{ background: following ? '#34C759' : '#FF6B3D' }}>
            {following ? <UserCheck size={9} className="text-white" /> : <UserPlus size={9} className="text-white" />}
          </div>
        </div>

        <motion.button
          whileTap={!isPreview && !isStory ? { scale: 0.75 } : undefined}
          onClick={!isPreview && !isStory ? () => toggleSave(pin.id, content.id, content.type) : undefined}
          className={`flex flex-col items-center gap-0.5 ${(isPreview || isStory) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          title={isStory ? 'Stories expire and cannot be saved' : undefined}
        >
          <Bookmark size={26} className={saved ? 'text-tangerine' : 'text-white'} fill={saved ? '#FF6B3D' : 'none'} />
          <span className="text-[10px] text-white font-semibold">{content.saves + (saved ? 1 : 0)}</span>
        </motion.button>

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          onClick={!isPreview ? requireAuth : undefined}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${isPreview ? 'opacity-40' : ''}`}>
          <MessageCircle size={24} className="text-white" />
          <span className="text-[10px] text-white font-semibold">0</span>
        </motion.button>

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${isPreview ? 'opacity-40' : ''}`}>
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
          onClick={!isPreview ? requireAuth : undefined}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${isPreview ? 'opacity-40' : ''}`}>
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
