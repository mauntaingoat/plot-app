import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, animate, useDragControls } from 'framer-motion'
import { X, Bed, Bath, Maximize, MapPin, Bookmark, Share2, Phone, ChevronLeft, ChevronRight, Eye, Clock, Calendar } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/firestore'
import type { Pin, ForSalePin, SoldPin, UserDoc } from '@/lib/types'

interface ListingOnlySheetProps {
  pin: Pin
  agent: UserDoc
  onClose: () => void
  isPreview?: boolean
}

export function ListingOnlySheet({ pin, agent, onClose, isPreview }: ListingOnlySheetProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
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

  if (!rendered || pin.type === 'neighborhood') return null

  const listingPin = pin as ForSalePin | SoldPin
  const photos = listingPin.photos || []

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/60"
        onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss() }} />
      <motion.div style={{ y }} drag="y" dragControls={dragControls} dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.4 }} onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[100] bg-obsidian rounded-t-[24px] border-t border-border-dark max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex justify-center pt-3 pb-1 shrink-0" onPointerDown={(e) => dragControls.start(e)} style={{ touchAction: 'none' }}>
          <div className="w-9 h-[5px] rounded-full bg-charcoal" />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                    {photos.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/40'}`} />)}
                  </div>
                </>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white ${isPreview ? 'opacity-40' : ''}`}><Bookmark size={16} /></button>
                <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white ${isPreview ? 'opacity-40' : ''}`}><Share2 size={14} /></button>
              </div>
              {pin.type === 'sold' && <div className="absolute top-3 left-3"><Badge variant="sold">SOLD</Badge></div>}
              {pin.type === 'for_sale' && 'isLive' in pin && pin.isLive && <div className="absolute top-3 left-3"><Badge variant="live" pulse>LIVE</Badge></div>}
            </div>
          )}

          <div className="px-5 py-5 space-y-5">
            {/* Price */}
            {'price' in listingPin && <p className="text-[32px] font-extrabold text-white tracking-tight font-mono">{formatPrice(listingPin.price)}</p>}
            {'soldPrice' in listingPin && (
              <div className="flex items-baseline gap-2">
                <p className="text-[32px] font-extrabold text-sold-green tracking-tight font-mono">{formatPrice(listingPin.soldPrice)}</p>
                {'originalPrice' in listingPin && listingPin.originalPrice !== listingPin.soldPrice && (
                  <span className="text-[16px] text-ghost line-through font-mono">{formatPrice(listingPin.originalPrice)}</span>
                )}
              </div>
            )}
            <p className="text-[14px] text-mist flex items-center gap-1.5"><MapPin size={13} className="text-ghost" /> {pin.address}</p>

            {/* Open house */}
            {'openHouse' in listingPin && listingPin.openHouse && (
              <div className="bg-open-amber/10 rounded-[14px] px-4 py-3 flex items-center gap-2">
                <Calendar size={16} className="text-open-amber" />
                <div>
                  <p className="text-[13px] font-semibold text-open-amber">Open House</p>
                  <p className="text-[12px] text-mist">{listingPin.openHouse.date} · {listingPin.openHouse.startTime} - {listingPin.openHouse.endTime}</p>
                </div>
              </div>
            )}

            {/* Specs */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
                <Bed size={16} className="text-tangerine" />
                <div><p className="text-[18px] font-bold text-white">{listingPin.beds}</p><p className="text-[10px] text-ghost uppercase tracking-wider">Beds</p></div>
              </div>
              <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
                <Bath size={16} className="text-tangerine" />
                <div><p className="text-[18px] font-bold text-white">{listingPin.baths}</p><p className="text-[10px] text-ghost uppercase tracking-wider">Baths</p></div>
              </div>
              <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
                <Maximize size={16} className="text-tangerine" />
                <div><p className="text-[18px] font-bold text-white">{listingPin.sqft.toLocaleString()}</p><p className="text-[10px] text-ghost uppercase tracking-wider">Sqft</p></div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <DetailRow label="Price / sqft" value={`$${listingPin.pricePerSqft.toLocaleString()}`} />
              <DetailRow label="Home type" value={listingPin.homeType.replace('_', ' ')} />
              {'yearBuilt' in listingPin && listingPin.yearBuilt && <DetailRow label="Year built" value={String(listingPin.yearBuilt)} />}
              <DetailRow label="Days on market" value={String(listingPin.daysOnMarket)} />
              {'mlsNumber' in listingPin && listingPin.mlsNumber && <DetailRow label="MLS #" value={listingPin.mlsNumber} />}
              {'lotSize' in listingPin && listingPin.lotSize && <DetailRow label="Lot size" value={listingPin.lotSize} />}
              {pin.type === 'sold' && 'soldDate' in listingPin && <DetailRow label="Sold date" value={new Date(listingPin.soldDate.toMillis()).toLocaleDateString()} />}
            </div>

            {listingPin.description && (
              <div><h3 className="text-[14px] font-bold text-white mb-2">About this property</h3><p className="text-[14px] text-mist leading-relaxed">{listingPin.description}</p></div>
            )}

            {/* Agent */}
            <div className="bg-slate rounded-[18px] p-4 flex items-center gap-3">
              <Avatar src={agent.photoURL} name={agent.displayName} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white">{agent.displayName}</p>
                {agent.brokerage && <p className="text-[12px] text-ghost">{agent.brokerage}</p>}
              </div>
              <Button variant="primary" size="sm" icon={<Phone size={14} />} disabled={isPreview}>Contact</Button>
            </div>

            <div className="h-8" />
          </div>
        </div>
      </motion.div>
    </>
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
