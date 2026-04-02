import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, animate, useDragControls } from 'framer-motion'
import { X, Bed, Bath, Maximize, MapPin, Calendar, Radio, Eye, Bookmark, Share2, MessageCircle, Phone, Home, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/firestore'
import type { Pin, ForSalePin, SoldPin, NeighborhoodPin, ContentItem, UserDoc } from '@/lib/types'

interface ListingModalProps {
  pin: Pin
  agent: UserDoc
  onClose: () => void
  isPreview?: boolean
}

export function ListingModal({ pin, agent, onClose, isPreview }: ListingModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'listing'>('content')
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [rendered, setRendered] = useState(true)
  const closingRef = useRef(false)

  const dismiss = () => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, {
      type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1],
      onComplete: () => { setRendered(false); onClose() },
    })
  }

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.y > 60 || info.velocity.y > 300) dismiss()
    else animate(y, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' })
  }

  useEffect(() => {
    y.jump(window.innerHeight)
    requestAnimationFrame(() => animate(y, 0, { type: 'tween', duration: 0.32, ease: [0.32, 0.72, 0, 1] }))
  }, [y])

  if (!rendered) return null

  const isForSale = pin.type === 'for_sale'
  const isSold = pin.type === 'sold'
  const isNeighborhood = pin.type === 'neighborhood'
  const hasListingData = isForSale || isSold

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/60"
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }} />
      <motion.div style={{ y }} drag="y" dragControls={dragControls} dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.4 }} onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-obsidian rounded-t-[24px] border-t border-border-dark top-[5vh] flex flex-col overflow-hidden">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }}>
          <div className="w-9 h-[5px] rounded-full bg-charcoal" />
        </div>

        {/* Header: address + indicators */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold text-white truncate">{pin.address}</h2>
              <div className="flex items-center gap-2 mt-1">
                {isForSale && 'price' in pin && <span className="text-[20px] font-extrabold text-white font-mono">{formatPrice(pin.price)}</span>}
                {isSold && 'soldPrice' in pin && <span className="text-[20px] font-extrabold text-sold-green font-mono">{formatPrice(pin.soldPrice)}</span>}
                {isNeighborhood && 'name' in pin && <span className="text-[16px] font-bold text-tangerine">{pin.name}</span>}
                {isSold && <Badge variant="sold">SOLD</Badge>}
              </div>
            </div>
            <button onClick={dismiss} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-ghost ml-2 shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Live + Open House indicators */}
          <div className="flex gap-2 mt-2">
            {isForSale && 'isLive' in pin && pin.isLive && <Badge variant="live" pulse>LIVE NOW</Badge>}
            {isForSale && 'openHouse' in pin && pin.openHouse && (
              <Badge variant="open"><Calendar size={10} /> Open {pin.openHouse.date} {pin.openHouse.startTime}</Badge>
            )}
          </div>

          {/* Tab toggle — only show if has listing data */}
          {hasListingData && (
            <div className="flex mt-3 bg-slate rounded-[12px] p-1">
              <button onClick={() => setActiveTab('content')}
                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${activeTab === 'content' ? 'bg-tangerine text-white' : 'text-ghost'}`}>
                Content
              </button>
              <button onClick={() => setActiveTab('listing')}
                className={`flex-1 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${activeTab === 'listing' ? 'bg-tangerine text-white' : 'text-ghost'}`}>
                Listing
              </button>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'content' ? (
            <ContentTab pin={pin} agent={agent} isPreview={isPreview} />
          ) : (
            <ListingTab pin={pin as ForSalePin | SoldPin} agent={agent} isPreview={isPreview} />
          )}
        </div>
      </motion.div>
    </>
  )
}

// ── Content Tab: vertical swipe feed of reels/stories/notes ──

function ContentTab({ pin, agent, isPreview }: { pin: Pin; agent: UserDoc; isPreview?: boolean }) {
  if (pin.content.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center px-6">
          <p className="text-[15px] font-semibold text-white mb-1">No content yet</p>
          <p className="text-[13px] text-ghost">This {pin.type === 'neighborhood' ? 'neighborhood' : 'listing'} doesn't have any content.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto" style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}>
      {pin.content.map((content) => (
        <ContentCard key={content.id} content={content} pin={pin} agent={agent} isPreview={isPreview} />
      ))}
    </div>
  )
}

function ContentCard({ content, pin, agent, isPreview }: { content: ContentItem; pin: Pin; agent: UserDoc; isPreview?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const thumbnailUrl = content.thumbnailUrl || ('heroPhotoUrl' in pin ? pin.heroPhotoUrl : '') || ''
  const isVideo = content.type === 'reel' || content.type === 'live'

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
    <div ref={cardRef} className="relative w-full" style={{ height: 'calc(100vh - 200px)', scrollSnapAlign: 'start', scrollSnapStop: 'always', minHeight: 400 }}>
      <div className="absolute inset-0 bg-charcoal">
        {isVideo && content.mediaUrl ? (
          <video ref={videoRef} src={content.mediaUrl} className="w-full h-full object-cover" loop playsInline muted autoPlay />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate">
            <p className="text-ghost text-[14px]">{content.type}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>

      {content.type === 'live' && (
        <div className="absolute top-3 left-3 z-10"><Badge variant="live" pulse>LIVE</Badge></div>
      )}

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-16 z-10 flex flex-col items-center gap-4">
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : ''}>
          <Bookmark size={24} className="text-white" />
          <span className="text-[9px] text-white font-semibold block mt-0.5">{content.saves}</span>
        </motion.button>
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : ''}>
          <Share2 size={20} className="text-white" />
        </motion.button>
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : ''}>
          <div className="w-9 h-9 rounded-full bg-tangerine flex items-center justify-center">
            <Phone size={16} className="text-white" />
          </div>
        </motion.button>
      </div>

      {/* Bottom: agent + caption */}
      <div className="absolute bottom-0 left-0 right-14 z-10 pb-4 px-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Avatar src={agent.photoURL} name={agent.displayName} size={28} />
          <span className="text-[13px] font-semibold text-white">{agent.displayName}</span>
          <span className="text-[11px] text-white/40 uppercase font-semibold">{content.type}</span>
        </div>
        {content.caption && <p className="text-[13px] text-white/90 leading-relaxed line-clamp-2">{content.caption}</p>}
        <div className="flex items-center gap-1 mt-1.5">
          <Eye size={11} className="text-white/40" />
          <span className="text-[10px] text-white/40">{content.views.toLocaleString()} views</span>
        </div>
      </div>
    </div>
  )
}

// ── Listing Tab: MLS data view ──

function ListingTab({ pin, agent, isPreview }: { pin: ForSalePin | SoldPin; agent: UserDoc; isPreview?: boolean }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = pin.photos || []

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Photo carousel */}
      {photos.length > 0 && (
        <div className="relative aspect-[4/3] bg-charcoal">
          <img src={photos[photoIndex]} alt="" className="w-full h-full object-cover" />
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
          {/* Save + share */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white ${isPreview ? 'opacity-40' : ''}`}>
              <Bookmark size={16} />
            </button>
            <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white ${isPreview ? 'opacity-40' : ''}`}>
              <Share2 size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-5 space-y-5">
        {/* Price + status */}
        <div>
          {'price' in pin && (
            <p className="text-[32px] font-extrabold text-white tracking-tight font-mono">{formatPrice(pin.price)}</p>
          )}
          {'soldPrice' in pin && (
            <div className="flex items-baseline gap-2">
              <p className="text-[32px] font-extrabold text-sold-green tracking-tight font-mono">{formatPrice(pin.soldPrice)}</p>
              {'originalPrice' in pin && pin.originalPrice !== pin.soldPrice && (
                <span className="text-[16px] text-ghost line-through font-mono">{formatPrice(pin.originalPrice)}</span>
              )}
            </div>
          )}
          <p className="text-[14px] text-mist mt-1 flex items-center gap-1.5">
            <MapPin size={13} className="text-ghost" /> {pin.address}
          </p>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
            <Bed size={16} className="text-tangerine" />
            <div>
              <p className="text-[18px] font-bold text-white">{pin.beds}</p>
              <p className="text-[10px] text-ghost uppercase tracking-wider">Beds</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
            <Bath size={16} className="text-tangerine" />
            <div>
              <p className="text-[18px] font-bold text-white">{pin.baths}</p>
              <p className="text-[10px] text-ghost uppercase tracking-wider">Baths</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
            <Maximize size={16} className="text-tangerine" />
            <div>
              <p className="text-[18px] font-bold text-white">{pin.sqft.toLocaleString()}</p>
              <p className="text-[10px] text-ghost uppercase tracking-wider">Sqft</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <DetailRow label="Price / sqft" value={`$${pin.pricePerSqft.toLocaleString()}`} />
          <DetailRow label="Home type" value={pin.homeType.replace('_', ' ')} />
          {'yearBuilt' in pin && pin.yearBuilt && <DetailRow label="Year built" value={String(pin.yearBuilt)} />}
          <DetailRow label="Days on market" value={String(pin.daysOnMarket)} />
          {'mlsNumber' in pin && pin.mlsNumber && <DetailRow label="MLS #" value={pin.mlsNumber} />}
          {'lotSize' in pin && pin.lotSize && <DetailRow label="Lot size" value={pin.lotSize} />}
          {pin.type === 'sold' && 'soldDate' in pin && <DetailRow label="Sold date" value={new Date(pin.soldDate.toMillis()).toLocaleDateString()} />}
        </div>

        {/* Description */}
        {pin.description && (
          <div>
            <h3 className="text-[14px] font-bold text-white mb-2">About this property</h3>
            <p className="text-[14px] text-mist leading-relaxed">{pin.description}</p>
          </div>
        )}

        {/* Agent card */}
        <div className="bg-slate rounded-[18px] p-4 flex items-center gap-3">
          <Avatar src={agent.photoURL} name={agent.displayName} size={48} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white">{agent.displayName}</p>
            {agent.brokerage && <p className="text-[12px] text-ghost">{agent.brokerage}</p>}
          </div>
          <Button variant="primary" size="sm" icon={<Phone size={14} />} disabled={isPreview}>Contact</Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-[11px] text-ghost">
          <span className="flex items-center gap-1"><Eye size={12} /> {pin.views.toLocaleString()} views</span>
          <span className="flex items-center gap-1"><Bookmark size={12} /> {pin.saves.toLocaleString()} saves</span>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-dark">
      <span className="text-[13px] text-ghost">{label}</span>
      <span className="text-[13px] font-medium text-white capitalize">{value}</span>
    </div>
  )
}
