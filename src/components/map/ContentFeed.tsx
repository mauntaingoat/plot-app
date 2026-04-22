import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, MapPin, Home, X, Bookmark, Share2, MessageCircle, UserPlus, UserCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ListingOnlySheet } from '@/components/viewers/ListingOnlySheet'
import { type Pin, type UserDoc, type ContentItem, isTallAspect } from '@/lib/types'
import { getAllContent } from '@/lib/mock'
import { useSaves } from '@/hooks/useSaves'
import { useFollow } from '@/hooks/useFollow'
import { preloadImages } from '@/lib/imageCache'
import { CommentSheet } from '@/components/comments/CommentSheet'

interface ContentFeedProps {
  pins: Pin[]
  agent: UserDoc
  onPinTap?: (pin: Pin) => void
  isPreview?: boolean
  isSignedIn?: boolean
  onAuthRequired?: () => void
  agentMode?: string
  isOwnProfile?: boolean
}

const PAGE_SIZE = 6

export function ContentFeed({ pins, agent, onPinTap, isPreview, isSignedIn, onAuthRequired, agentMode = 'single', isOwnProfile }: ContentFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const allContent = getAllContent(pins)
  const [listingSheet, setListingSheet] = useState<Pin | null>(null)
  const { isFollowing: following, toggle: toggleFollow } = useFollow(agent?.uid)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [allContent.length])

  const visibleContent = allContent.slice(0, visibleCount)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const scrollPct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1)
      if (scrollPct > 0.5 && visibleCount < allContent.length) {
        setVisibleCount((v) => Math.min(v + PAGE_SIZE, allContent.length))
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [visibleCount, allContent.length])

  useEffect(() => {
    const urls: string[] = []
    if (agent.photoURL) urls.push(agent.photoURL)
    for (const { content, pin } of visibleContent) {
      if (content.thumbnailUrl) urls.push(content.thumbnailUrl)
      if (content.mediaUrls) urls.push(...content.mediaUrls)
      if ('heroPhotoUrl' in pin && pin.heroPhotoUrl) urls.push(pin.heroPhotoUrl)
    }
    preloadImages(urls)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleContent.length])

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
        style={{ scrollSnapType: 'y mandatory', overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}>
        {visibleContent.map(({ content, pin }) => (
          <FeedCard key={content.id} content={content} pin={pin} agent={agent}
            isPreview={isPreview} following={following}
            showFollowButton={agentMode === 'single'}
            isSignedIn={isSignedIn} onAuthRequired={onAuthRequired}
            isOwnProfile={isOwnProfile}
            onFollowToggle={() => {
              if (!isSignedIn && !isPreview && onAuthRequired) { onAuthRequired(); return }
              toggleFollow()
            }}
            onListingTap={() => pin.type !== 'spotlight' && setListingSheet(pin)} />
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

function FeedCard({ content, pin, agent, isPreview, following, showFollowButton, onFollowToggle, onListingTap, isSignedIn, onAuthRequired, isOwnProfile }: {
  content: ContentItem; pin: Pin; agent: UserDoc; isPreview?: boolean
  following: boolean; showFollowButton?: boolean; onFollowToggle: () => void; onListingTap: () => void
  isSignedIn?: boolean; onAuthRequired?: () => void; isOwnProfile?: boolean
}) {
  const requireAuth = () => { if (!isSignedIn && onAuthRequired) onAuthRequired() }
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [carouselIdx, setCarouselIdx] = useState(0)

  useEffect(() => {
    if (!content.mediaUrls) return
    content.mediaUrls.forEach((url) => { const img = new Image(); img.src = url })
  }, [content.mediaUrls])

  const thumbnailUrl = content.thumbnailUrl || ('heroPhotoUrl' in pin ? pin.heroPhotoUrl : '') || ''
  const isVideo = content.type === 'reel' || content.type === 'live'
  const isCarousel = content.type === 'photo' && content.mediaUrls && content.mediaUrls.length > 1
  const isProcessing = isVideo && (!content.mediaUrl || content.status === 'preparing')
  const videoSrc = content.mediaUrl || ''
  // stories removed
  const neighborhoodName = pin.type === 'spotlight' && 'name' in pin ? pin.name : pin.neighborhoodId
  const hasOpenHouse = pin.type === 'for_sale' && 'openHouse' in pin && pin.openHouse
  const { isSaved, toggleSave } = useSaves()
  const saved = isSaved(pin.id, content.id)
  const [localSaveOffset, setLocalSaveOffset] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const handleSave = () => {
    setLocalSaveOffset((prev) => saved ? prev - 1 : prev + 1)
    toggleSave(pin.id, content.id, content.type)
  }

  const viewTracked = useRef(false)

  // Lazy load video: only mount when near viewport, preload 200px ahead
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true)
        if (videoRef.current) videoRef.current.play().catch(() => {})
        if (!viewTracked.current && !isPreview) {
          viewTracked.current = true
          import('firebase/functions').then(({ getFunctions, httpsCallable }) => {
            import('@/config/firebase').then(({ app }) => {
              const fn = httpsCallable(getFunctions(app ?? undefined), 'trackView')
              fn({ pinId: pin.id, contentId: content.id, localHour: new Date().getHours() }).catch(() => {})
            })
          })
        }
      } else {
        if (videoRef.current) videoRef.current.pause()
      }
    }, { threshold: 0.1, rootMargin: '200px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={cardRef} className="w-full relative bg-black"
      style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', willChange: 'transform', contain: 'layout style paint' }}>
      {/* Media container — constrained to 9:16 centered with dark bars
          on the sides when the viewport is wider than portrait. On narrow
          phones this is effectively full-width since phones are ~9:16. */}
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 overflow-hidden"
        style={{ width: 'min(100%, calc(100vh * 9 / 16))' }}
      >
        <div className="absolute inset-0 bg-charcoal overflow-hidden">
          {isVideo && isProcessing ? (
            <>
              {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm" loading="lazy" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                <span className="text-[13px] font-semibold text-white/80">Processing...</span>
              </div>
            </>
          ) : isVideo && videoSrc && isNearViewport ? (
            <>
              {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-105 opacity-30" />}
              <video
                ref={(el) => {
                  (videoRef as any).current = el
                  if (el) el.muted = true
                }}
                src={videoSrc}
                className={`relative w-full h-full ${
                  isTallAspect(content.aspect) ? 'object-cover' : 'object-contain'
                }`}
                loop playsInline muted preload="auto"
                autoPlay
              />
            </>
          ) : isVideo && videoSrc ? (
            <>
              {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
            </>
          ) : isCarousel ? (
            <>
              {!isTallAspect(content.aspect) && (
                <img src={content.mediaUrls![carouselIdx]} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-105 opacity-30" loading="lazy" />
              )}
              <img
                src={content.mediaUrls![carouselIdx]}
                alt=""
                className={`absolute inset-0 w-full h-full ${
                  isTallAspect(content.aspect) ? 'object-cover' : 'object-contain'
                }`}
                             />
              {/* Swipe zones for carousel */}
              <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={() => setCarouselIdx((i) => Math.max(0, i - 1))} aria-label="Previous" />
              <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer" onClick={() => setCarouselIdx((i) => Math.min(content.mediaUrls!.length - 1, i + 1))} aria-label="Next" />
              {/* Dot indicators */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {content.mediaUrls!.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === carouselIdx ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          ) : thumbnailUrl ? (
            <>
              <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-105 opacity-30" loading="lazy" />
              <img src={thumbnailUrl} alt="" className="relative w-full h-full object-contain"                onLoad={(e) => { const img = e.currentTarget; if (img.naturalHeight > img.naturalWidth * 1.2) img.style.objectFit = 'cover' }} />
            </>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none" />
        </div>
      </div>

      {/* Open house + live indicators moved to caption below */}

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[22%] z-10 flex flex-col items-center gap-5" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
        {/* Agent avatar */}
        <div className="relative w-10 h-10">
          <Avatar src={agent.photoURL} name={agent.displayName} size={40} ring="none" />
          {!isOwnProfile && (
            <motion.button whileTap={!isPreview ? { scale: 0.9 } : undefined}
              onClick={!isPreview ? onFollowToggle : undefined}
              className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full flex items-center justify-center ${isPreview ? 'opacity-40' : 'cursor-pointer'}`}
              style={{ background: following ? '#34C759' : '#FF6B3D' }}>
              {following ? <UserCheck size={9} className="text-white" /> : <UserPlus size={9} className="text-white" />}
            </motion.button>
          )}
        </div>

        {!isOwnProfile && (
          <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
            onClick={!isPreview ? handleSave : undefined}
            className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : 'cursor-pointer'}`}>
            <Bookmark size={26} className={saved ? 'text-tangerine' : 'text-white'} fill={saved ? '#FF6B3D' : 'none'} />
            <span className="text-[10px] text-white font-semibold">{Math.max(0, (content.saves || 0) + localSaveOffset)}</span>
          </motion.button>
        )}

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          onClick={!isPreview ? () => { if (!isSignedIn && onAuthRequired) { onAuthRequired(); return }; setShowComments(true) } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : 'cursor-pointer'}`}>
          <MessageCircle size={24} className="text-white" />
          <span className="text-[10px] text-white font-semibold">{commentCount}</span>
        </motion.button>

        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined}
          className={`flex flex-col items-center gap-0.5 ${isPreview ? 'opacity-40' : 'cursor-pointer'}`}>
          <Share2 size={22} className="text-white" />
        </motion.button>

        {/* House icon — listing only (no content tab) */}
        {pin.type !== 'spotlight' && (
          <motion.button whileTap={{ scale: 0.75 }} onClick={onListingTap}
            className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <span className="text-[9px] text-white/60">Listing</span>
          </motion.button>
        )}

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

      <CommentSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        pinId={pin.id}
        contentId={content.id}
        pinAgentId={pin.agentId}
        onCountChange={setCommentCount}
      />
    </div>
  )
}
