import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, animate, useDragControls } from 'framer-motion'
import { X, Bed, Bath, Maximize, MapPin, Calendar, Eye, Bookmark, Share2, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/firestore'
import type { Pin, ForSalePin, SoldPin, ContentItem, UserDoc } from '@/lib/types'

interface ListingModalProps {
  pin: Pin
  agent: UserDoc
  onClose: () => void
  isPreview?: boolean
}

export function ListingModal({ pin, agent, onClose, isPreview }: ListingModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'listing'>('content')
  const y = useMotionValue(0)
  const [rendered, setRendered] = useState(true)
  const closingRef = useRef(false)

  const isForSale = pin.type === 'for_sale'
  const isSold = pin.type === 'sold'
  const hasListingData = isForSale || isSold

  const dismiss = () => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, {
      type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1],
      onComplete: () => { setRendered(false); onClose() },
    })
  }

  useEffect(() => {
    y.jump(window.innerHeight)
    requestAnimationFrame(() => animate(y, 0, { type: 'tween', duration: 0.32, ease: [0.32, 0.72, 0, 1] }))
  }, [y])

  if (!rendered) return null

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/60"
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }} />
      <motion.div style={{ y }}
        className="fixed inset-0 z-[100] flex flex-col overflow-hidden">

        {/* Close button — always visible */}
        <button onClick={dismiss} className="absolute top-[calc(env(safe-area-inset-top,12px)+8px)] right-4 z-[110] w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
          <X size={18} />
        </button>

        {/* Tab toggle — overlay on top, translucent */}
        {hasListingData && (
          <div className="absolute top-[calc(env(safe-area-inset-top,12px)+8px)] left-4 z-[110]">
            <div className="flex bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/10">
              <button onClick={() => setActiveTab('content')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${activeTab === 'content' ? 'bg-tangerine text-white' : 'text-white/70'}`}>
                Content
              </button>
              <button onClick={() => setActiveTab('listing')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${activeTab === 'listing' ? 'bg-tangerine text-white' : 'text-white/70'}`}>
                Listing
              </button>
            </div>
          </div>
        )}

        {/* Tab content — full screen */}
        {activeTab === 'content' ? (
          <ContentTab pin={pin} agent={agent} isPreview={isPreview} onDismiss={dismiss} />
        ) : (
          <ListingTab pin={pin as ForSalePin | SoldPin} agent={agent} isPreview={isPreview} onDismiss={dismiss} />
        )}
      </motion.div>
    </>
  )
}

// ── Content Tab: full-screen vertical feed ──

function ContentTab({ pin, agent, isPreview, onDismiss }: { pin: Pin; agent: UserDoc; isPreview?: boolean; onDismiss: () => void }) {
  if (pin.content.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-midnight">
        <div className="text-center px-6">
          <p className="text-[15px] font-semibold text-white mb-1">No content yet</p>
          <p className="text-[13px] text-ghost">No reels, stories, or videos for this {pin.type === 'neighborhood' ? 'neighborhood' : 'listing'}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-midnight" style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}>
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
  const neighborhoodName = pin.type === 'neighborhood' && 'name' in pin ? pin.name : pin.neighborhoodId

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
    <div ref={cardRef} className="relative w-full" style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
      <div className="absolute inset-0 bg-charcoal">
        {isVideo && content.mediaUrl ? (
          <video ref={videoRef} src={content.mediaUrl} className="w-full h-full object-cover" loop playsInline muted autoPlay />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate"><p className="text-ghost">{content.type}</p></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      </div>

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[20%] z-10 flex flex-col items-center gap-4">
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : ''}>
          <Bookmark size={24} className="text-white" />
          <span className="text-[9px] text-white font-semibold block mt-0.5">{content.saves}</span>
        </motion.button>
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : ''}>
          <Share2 size={20} className="text-white" />
        </motion.button>
        <motion.button whileTap={!isPreview ? { scale: 0.75 } : undefined} className={isPreview ? 'opacity-40' : ''}>
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
          {content.type === 'live' && <><span className="text-[10px] text-white/30">·</span><span className="text-[11px] text-live-red font-bold">LIVE</span></>}
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

function ListingTab({ pin, agent, isPreview, onDismiss }: { pin: ForSalePin | SoldPin; agent: UserDoc; isPreview?: boolean; onDismiss: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = pin.photos || []

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Spacer for overlay tabs */}
      <div className="h-[calc(env(safe-area-inset-top,12px)+50px)]" />

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
            <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white ${isPreview ? 'opacity-40' : ''}`}><Bookmark size={16} /></button>
            <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white ${isPreview ? 'opacity-40' : ''}`}><Share2 size={14} /></button>
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

        {'openHouse' in pin && pin.openHouse && (
          <div className="bg-open-amber/10 rounded-[14px] px-4 py-3 flex items-center gap-2">
            <Calendar size={16} className="text-open-amber" />
            <div><p className="text-[13px] font-semibold text-open-amber">Open House</p><p className="text-[12px] text-mist">{pin.openHouse.date} · {pin.openHouse.startTime} - {pin.openHouse.endTime}</p></div>
          </div>
        )}

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

        <div className="bg-slate rounded-[18px] p-4 flex items-center gap-3">
          <Avatar src={agent.photoURL} name={agent.displayName} size={48} />
          <div className="flex-1 min-w-0"><p className="text-[15px] font-bold text-white">{agent.displayName}</p>{agent.brokerage && <p className="text-[12px] text-ghost">{agent.brokerage}</p>}</div>
          <Button variant="primary" size="sm" icon={<Phone size={14} />} disabled={isPreview}>Contact</Button>
        </div>

        <div className="h-8" />
      </div>
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
