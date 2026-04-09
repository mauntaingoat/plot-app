import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useMotionValue, animate, useDragControls } from 'framer-motion'
import { X, Bed, Bath, Maximize, MapPin, Eye, Bookmark, Share2, Phone, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/firestore'
import { useSaves } from '@/hooks/useSaves'
import { OpenHouseBlock } from '@/components/listing/OpenHouseBlock'
import { ShowingRequestSheet } from '@/components/listing/ShowingRequestSheet'
import { publicContent } from '@/lib/contentVisibility'
import type { Pin, ForSalePin, SoldPin, ContentItem, UserDoc } from '@/lib/types'

interface ListingModalProps {
  pin: Pin
  agent: UserDoc
  onClose: () => void
  isPreview?: boolean
  embedded?: boolean // true when rendered inside a SidePanel — skip own animation/backdrop
  isSignedIn?: boolean
  onAuthRequired?: () => void
}

// Scroll-aware swipe-to-dismiss — same logic as BottomSheet.tsx
function useListingSwipeToDismiss(
  sheetRef: React.RefObject<HTMLDivElement | null>,
  scrollRef: React.RefObject<HTMLDivElement | null>,
  active: boolean,
  onDismiss: () => void
) {
  const touchStartY = useRef(0)
  const translateY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !active) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      translateY.current = 0
      isDragging.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY.current
      const scrollEl = scrollRef.current
      const atTop = !scrollEl || scrollEl.scrollTop <= 1

      if (atTop && dy > 0) {
        if (!isDragging.current) isDragging.current = true
        translateY.current = dy
        const resistance = Math.min(dy, dy * 0.6 + 40)
        sheet.style.transform = `translateY(${resistance}px) translateZ(0)`
        sheet.style.transition = 'none'
        e.preventDefault()
      } else if (isDragging.current && dy <= 0) {
        isDragging.current = false
        translateY.current = 0
        sheet.style.transform = 'translateY(0) translateZ(0)'
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      }
    }

    const onTouchEnd = () => {
      if (isDragging.current) {
        if (translateY.current > 80) {
          sheet.style.transform = `translateY(100%) translateZ(0)`
          sheet.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)'
          setTimeout(onDismiss, 280)
        } else {
          sheet.style.transform = 'translateY(0) translateZ(0)'
          sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
        }
      }
      isDragging.current = false
      translateY.current = 0
    }

    sheet.addEventListener('touchstart', onTouchStart, { passive: true })
    sheet.addEventListener('touchmove', onTouchMove, { passive: false })
    sheet.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      sheet.removeEventListener('touchstart', onTouchStart)
      sheet.removeEventListener('touchmove', onTouchMove)
      sheet.removeEventListener('touchend', onTouchEnd)
    }
  }, [sheetRef, scrollRef, active, onDismiss])
}

export function ListingModal({ pin, agent, onClose, isPreview, embedded, isSignedIn, onAuthRequired }: ListingModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'listing'>('content')
  const [mounted, setMounted] = useState(true)
  const [visible, setVisible] = useState(false)
  const [showShowingRequest, setShowShowingRequest] = useState(false)
  const closingRef = useRef(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  // Reset scroll to top when switching tabs
  useEffect(() => {
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0
  }, [activeTab])

  const isForSale = pin.type === 'for_sale'
  const isSold = pin.type === 'sold'
  const hasListingData = isForSale || isSold

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(() => { setMounted(false); onClose() }, 300)
  }, [onClose])

  // Slide in on mount (non-embedded only)
  useEffect(() => {
    if (embedded) return
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [embedded])

  // Wire up swipe-to-dismiss for mobile (non-embedded)
  useListingSwipeToDismiss(sheetRef, mobileScrollRef, !embedded && visible, dismiss)

  if (!mounted) return null

  // Embedded mode: just render content, no backdrop/animation wrapper (UNCHANGED)
  if (embedded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab toggle — fixed to top */}
        {hasListingData && (
          <div className="px-4 pt-3 pb-2 shrink-0 z-10 bg-obsidian">
            <div className="flex bg-slate rounded-[12px] p-1">
              <button onClick={() => setActiveTab('content')}
                className={`flex-1 py-2 rounded-[10px] text-[12px] font-semibold transition-all cursor-pointer ${activeTab === 'content' ? 'bg-tangerine text-white' : 'text-ghost'}`}>
                Content
              </button>
              <button onClick={() => setActiveTab('listing')}
                className={`flex-1 py-2 rounded-[10px] text-[12px] font-semibold transition-all cursor-pointer ${activeTab === 'listing' ? 'bg-tangerine text-white' : 'text-ghost'}`}>
                Listing
              </button>
            </div>
          </div>
        )}
        {/* Relative wrapper gives definite height for absolute scroll child */}
        <div className="relative flex-1 min-h-0">
          <div ref={scrollAreaRef} className="absolute inset-0 overflow-y-auto" style={{
            overscrollBehavior: 'none',
            ...(activeTab === 'content' ? { scrollSnapType: 'y mandatory' } : {}),
          }}>
            {activeTab === 'content' ? (
              <ContentTab pin={pin} agent={agent} isPreview={isPreview} onDismiss={onClose} embedded isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
            ) : (
              <ListingTab pin={pin as ForSalePin | SoldPin} agent={agent} isPreview={isPreview} onDismiss={onClose} embedded isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mobile: full-screen sheet with swipe-to-dismiss
  return (
    <>
      <div
        className="fixed inset-0 z-[90] will-change-[opacity]"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={dismiss}
      />
      <div
        ref={sheetRef}
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-midnight will-change-transform"
        style={{
          transform: visible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Close button — always visible */}
        <button onClick={dismiss} className="absolute top-[calc(env(safe-area-inset-top,12px)+8px)] right-4 z-[110] w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer">
          <X size={18} />
        </button>

        {/* Tab toggle — overlay on top, translucent */}
        {hasListingData && (
          <div className="absolute top-[calc(env(safe-area-inset-top,12px)+8px)] left-4 z-[110]">
            <div className="flex bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10">
              <button onClick={() => setActiveTab('content')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${activeTab === 'content' ? 'bg-tangerine text-white' : 'text-white/70'}`}>
                Content
              </button>
              <button onClick={() => setActiveTab('listing')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${activeTab === 'listing' ? 'bg-tangerine text-white' : 'text-white/70'}`}>
                Listing
              </button>
            </div>
          </div>
        )}

        {/* Tab content — full screen, scrollable with swipe-to-dismiss ref + snap scroll on content */}
        <div ref={mobileScrollRef} className="flex-1 overflow-y-auto overscroll-none" style={{
          WebkitOverflowScrolling: 'touch',
          ...(activeTab === 'content' ? { scrollSnapType: 'y mandatory' } : {}),
        }}>
          {activeTab === 'content' ? (
            <ContentTab pin={pin} agent={agent} isPreview={isPreview} onDismiss={dismiss} embedded isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
          ) : (
            <ListingTab pin={pin as ForSalePin | SoldPin} agent={agent} isPreview={isPreview} onDismiss={dismiss} embedded isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
          )}
        </div>
      </div>
    </>
  )
}

// ── Content Tab: full-screen vertical feed ──

function ContentTab({ pin, agent, isPreview, onDismiss, embedded, isSignedIn, onAuthRequired }: { pin: Pin; agent: UserDoc; isPreview?: boolean; onDismiss: () => void; embedded?: boolean; isSignedIn?: boolean; onAuthRequired?: () => void }) {
  // Filter out content scheduled for the future — public should never see it
  const visibleContent = publicContent(pin)

  if (visibleContent.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-midnight">
        <div className="text-center px-6">
          <p className="text-[15px] font-semibold text-white mb-1">No content yet</p>
          <p className="text-[13px] text-ghost">No reels, stories, or videos for this {pin.type === 'neighborhood' ? 'neighborhood' : 'listing'}.</p>
        </div>
      </div>
    )
  }

  // When embedded, parent already provides scroll container with snap — render cards directly
  if (embedded) {
    return (
      <>
        {visibleContent.map((content) => (
          <ContentCard key={content.id} content={content} pin={pin} agent={agent} isPreview={isPreview} embedded isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
        ))}
      </>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-midnight" style={{ scrollSnapType: 'y mandatory', overscrollBehavior: 'none' }}>
      {visibleContent.map((content) => (
        <ContentCard key={content.id} content={content} pin={pin} agent={agent} isPreview={isPreview} isSignedIn={isSignedIn} onAuthRequired={onAuthRequired} />
      ))}
    </div>
  )
}

function ContentCard({ content, pin, agent, isPreview, embedded, isSignedIn, onAuthRequired }: { content: ContentItem; pin: Pin; agent: UserDoc; isPreview?: boolean; embedded?: boolean; isSignedIn?: boolean; onAuthRequired?: () => void }) {
  const requireAuth = () => { if (!isSignedIn && onAuthRequired) onAuthRequired() }
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const { isSaved, toggleSave } = useSaves()
  const saved = isSaved(pin.id, content.id)
  const isStory = content.type === 'story'
  const thumbnailUrl = content.thumbnailUrl || ('heroPhotoUrl' in pin ? pin.heroPhotoUrl : '') || ''
  const isVideo = content.type === 'reel' || content.type === 'live'
  const neighborhoodName = pin.type === 'neighborhood' && 'name' in pin ? pin.name : pin.neighborhoodId

  // Lazy load: only mount video when card is near viewport
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true)
        if (videoRef.current) videoRef.current.play().catch(() => {})
      } else {
        if (videoRef.current) videoRef.current.pause()
        // Don't unset isNearViewport — keep the video element mounted once loaded
      }
    }, { threshold: 0.1, rootMargin: '200px 0px' }) // preload 200px before visible
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={cardRef} className="relative w-full" style={{ height: embedded ? '100%' : '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always', willChange: 'transform', contain: 'layout style paint' }}>
      {/* Background media */}
      <div className="absolute inset-0 bg-charcoal overflow-hidden">
        {isVideo && content.mediaUrl && isNearViewport ? (
          <>
            {/* Blurred bg uses thumbnail image instead of a second video element */}
            {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-y-110 opacity-50" />}
            <video ref={videoRef} src={content.mediaUrl} className="relative w-full h-full object-cover" loop playsInline muted preload="auto" />
          </>
        ) : isVideo && content.mediaUrl && !isNearViewport ? (
          <>
            {/* Not near viewport yet — show thumbnail placeholder */}
            {thumbnailUrl && <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
          </>
        ) : thumbnailUrl ? (
          <>
            <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-y-110 opacity-50" loading="lazy" />
            <img src={thumbnailUrl} alt="" className="relative w-full h-full object-cover" loading="lazy" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate"><p className="text-ghost">{content.type}</p></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      </div>

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[20%] z-10 flex flex-col items-center gap-4" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
        {/* Save button — disabled for stories (ephemeral content) */}
        <motion.button
          whileTap={!isPreview && !isStory ? { scale: 0.75 } : undefined}
          onClick={!isPreview && !isStory ? () => toggleSave(pin.id, content.id, content.type) : undefined}
          className={(isPreview || isStory) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          title={isStory ? 'Stories expire and cannot be saved' : undefined}
        >
          <Bookmark size={24} className={saved ? 'text-tangerine' : 'text-white'} fill={saved ? '#FF6B3D' : 'none'} />
          <span className="text-[9px] text-white font-semibold block mt-0.5">{content.saves + (saved ? 1 : 0)}</span>
        </motion.button>
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : 'cursor-pointer'}>
          <Share2 size={20} className="text-white" />
        </motion.button>
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} onClick={!isPreview ? requireAuth : undefined} className={isPreview ? 'opacity-40' : 'cursor-pointer'}>
          <div className="w-9 h-9 rounded-full bg-tangerine flex items-center justify-center"><Phone size={16} className="text-white" /></div>
        </motion.button>
      </div>

      {/* Bottom caption — type label inline with location */}
      <div className="absolute bottom-0 left-0 right-14 z-10 pb-[calc(env(safe-area-inset-bottom,8px)+16px)] px-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar src={agent.photoURL} name={agent.displayName} size={28} />
          <span className="text-[13px] font-semibold text-white">{agent.displayName}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <MapPin size={11} className="text-white/50 shrink-0" />
          <span className="text-[12px] text-white/50">{neighborhoodName}</span>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[11px] text-white/40 uppercase font-semibold">{content.type.replace('_', ' ')}</span>
          {/* Live is a content type, not shown inline — only open house (listing state) would be */}
        </div>
        {content.caption && <p className="text-[13px] text-white/90 leading-relaxed line-clamp-3">{content.caption}</p>}
        <div className="flex items-center gap-1 mt-1.5">
          <Eye size={11} className="text-white/40" />
          <span className="text-[10px] text-white/40">{content.views.toLocaleString()} views</span>
        </div>
      </div>
    </div>
  )
}

// ── Listing Tab: scrollable MLS data ──

function ListingTab({ pin, agent, isPreview, onDismiss, embedded, isSignedIn, onAuthRequired }: { pin: ForSalePin | SoldPin; agent: UserDoc; isPreview?: boolean; onDismiss: () => void; embedded?: boolean; isSignedIn?: boolean; onAuthRequired?: () => void }) {
  const requireAuth = () => { if (!isSignedIn && onAuthRequired) onAuthRequired() }
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = pin.photos || []
  const { isPinSaved, toggleSave } = useSaves()
  const saved = isPinSaved(pin.id)

  return (
    <div className={`${embedded ? '' : 'flex-1 overflow-y-auto'} bg-obsidian`} style={embedded ? undefined : { WebkitOverflowScrolling: 'touch' }}>
      {/* Spacer for overlay tabs — only needed in full-screen mode */}
      {!embedded && <div className="h-[calc(env(safe-area-inset-top,12px)+50px)]" />}

      {photos.length > 0 && (
        <div className="relative aspect-[4/3] bg-charcoal">
          <img src={photos[photoIndex]} alt="" className="w-full h-full object-cover" />
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"><ChevronLeft size={16} /></button>
              <button onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"><ChevronRight size={16} /></button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/40'}`} />)}
              </div>
            </>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={!isPreview ? () => toggleSave(pin.id) : undefined}
              className={`w-9 h-9 rounded-full ${saved ? 'bg-tangerine' : 'bg-black/30'} backdrop-blur-sm flex items-center justify-center text-white cursor-pointer ${isPreview ? 'opacity-40' : ''} transition-colors`}
            >
              <Bookmark size={16} fill={saved ? 'white' : 'none'} />
            </button>
            <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer ${isPreview ? 'opacity-40' : ''}`}><Share2 size={14} /></button>
          </div>
          {pin.type === 'sold' && <div className="absolute top-3 left-3"><Badge variant="sold">SOLD</Badge></div>}
        </div>
      )}

      <div className="px-5 py-5 space-y-5">
        {'price' in pin && <p className="text-[32px] font-extrabold text-white tracking-tight font-mono">{formatPrice(pin.price)}</p>}
        {'soldPrice' in pin && (
          <div className="flex items-baseline gap-2">
            <p className="text-[32px] font-extrabold text-sold-green tracking-tight font-mono">{formatPrice(pin.soldPrice)}</p>
            {'originalPrice' in pin && pin.originalPrice !== pin.soldPrice && <span className="text-[16px] text-ghost line-through font-mono">{formatPrice(pin.originalPrice)}</span>}
          </div>
        )}
        <p className="text-[14px] text-mist flex items-center gap-1.5"><MapPin size={13} className="text-ghost" /> {pin.address}</p>

        {pin.type === 'for_sale' && <OpenHouseBlock pin={pin as ForSalePin} agent={agent} />}

        <div className="flex items-center gap-3">
          {[
            { icon: Bed, val: pin.beds, label: 'Beds' },
            { icon: Bath, val: pin.baths, label: 'Baths' },
            { icon: Maximize, val: pin.sqft.toLocaleString(), label: 'Sqft' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
              <s.icon size={16} className="text-tangerine" />
              <div><p className="text-[18px] font-bold text-white">{s.val}</p><p className="text-[10px] text-ghost uppercase tracking-wider">{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Row label="Price / sqft" value={`$${pin.pricePerSqft.toLocaleString()}`} />
          <Row label="Home type" value={pin.homeType.replace('_', ' ')} />
          {'yearBuilt' in pin && pin.yearBuilt && <Row label="Year built" value={String(pin.yearBuilt)} />}
          <Row label="Days on market" value={String(pin.daysOnMarket)} />
          {'mlsNumber' in pin && pin.mlsNumber && <Row label="MLS #" value={pin.mlsNumber} />}
          {'lotSize' in pin && pin.lotSize && <Row label="Lot size" value={pin.lotSize} />}
          {pin.type === 'sold' && 'soldDate' in pin && <Row label="Sold date" value={new Date(pin.soldDate.toMillis()).toLocaleDateString()} />}
        </div>

        {pin.description && (
          <div><h3 className="text-[14px] font-bold text-white mb-2">About this property</h3><p className="text-[14px] text-mist leading-relaxed">{pin.description}</p></div>
        )}

        <div className="bg-slate rounded-[18px] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar src={agent.photoURL} name={agent.displayName} size={48} />
            <div className="flex-1 min-w-0"><p className="text-[15px] font-bold text-white">{agent.displayName}</p>{agent.brokerage && <p className="text-[12px] text-ghost">{agent.brokerage}</p>}</div>
            <Button variant="glass" size="sm" icon={<Phone size={14} />} disabled={isPreview} onClick={!isPreview ? requireAuth : undefined}>Contact</Button>
          </div>
          {pin.type === 'for_sale' && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<CalendarCheck size={15} />}
              disabled={isPreview}
              onClick={!isPreview ? () => setShowShowingRequest(true) : undefined}
            >
              Request a Showing
            </Button>
          )}
        </div>

        <div className="h-8" />
      </div>

      <ShowingRequestSheet
        isOpen={showShowingRequest}
        onClose={() => setShowShowingRequest(false)}
        pin={pin}
        agent={agent}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-dark">
      <span className="text-[13px] text-ghost">{label}</span>
      <span className="text-[13px] font-medium text-white capitalize">{value}</span>
    </div>
  )
}
