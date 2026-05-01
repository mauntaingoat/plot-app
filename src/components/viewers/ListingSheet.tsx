import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookmarkSimple as Bookmark, ShareNetwork as Share2, Bed, Bathtub as Bath, ArrowsOut as Maximize, MapPin, CaretLeft as ChevronLeft, CaretRight as ChevronRight, Phone, ChatCenteredText as MessageSquare, HandWaving as Hand } from '@phosphor-icons/react'
import { WaveModal } from '@/components/agent-profile/WaveModal'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/firestore'
import { displayAddressWithUnit } from '@/lib/format'
import type { ForSalePin, SoldPin, Pin, OpenHouse, UserDoc } from '@/lib/types'

interface ListingSheetProps {
  pin: ForSalePin | SoldPin
  agent: UserDoc
  isOpen: boolean
  onClose: () => void
}

export function ListingSheet({ pin, agent, isOpen, onClose }: ListingSheetProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [saved, setSaved] = useState(false)
  const [waveOpen, setWaveOpen] = useState(false)

  const photos = 'photos' in pin ? pin.photos : []
  const price = 'price' in pin ? pin.price : 'soldPrice' in pin ? pin.soldPrice : 0
  const isSold = pin.type === 'sold'

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} fullHeight>
      <div className="flex flex-col min-h-full">
        {/* Photo carousel */}
        <div className="relative aspect-[4/3] bg-charcoal overflow-hidden">
          {photos.length > 0 ? (
            <>
              <AnimatePresence mode="wait">
                <motion.img
                  key={photoIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={photos[photoIndex]}
                  alt={pin.address}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Photo nav */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass-dark flex items-center justify-center text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full glass-dark flex items-center justify-center text-white"
                  >
                    <ChevronRight size={16} />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_: string, i: number) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === photoIndex ? 'bg-white w-4' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ghost">
              <MapPin size={48} className="opacity-20" />
            </div>
          )}

          {/* Top actions */}
          <div className="absolute top-3 right-3 flex gap-2">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setSaved(!saved)}
              className="w-9 h-9 rounded-full glass-dark flex items-center justify-center"
            >
              <Bookmark size={18} className={saved ? 'text-tangerine fill-tangerine' : 'text-white'} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              className="w-9 h-9 rounded-full glass-dark flex items-center justify-center text-white"
            >
              <Share2 size={16} />
            </motion.button>
          </div>

          {/* Badge */}
          <div className="absolute top-3 left-3">
            {isSold && <Badge variant="sold">Sold</Badge>}
            {'openHouse' in pin && pin.openHouse && <Badge variant="open" pulse>Open House</Badge>}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-5 space-y-5">
          {/* Price + address */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-extrabold text-white tracking-tight font-mono">
                {formatPrice(price)}
              </span>
              {isSold && 'originalPrice' in pin && pin.originalPrice !== price && (
                <span className="text-[16px] text-ghost line-through font-mono">
                  {formatPrice(pin.originalPrice)}
                </span>
              )}
            </div>
            <p className="text-[14px] text-mist mt-1 flex items-center gap-1.5">
              <MapPin size={14} className="text-ghost" />
              {displayAddressWithUnit(pin.address, pin.unit)}
            </p>
          </div>

          {/* Specs */}
          {'beds' in pin && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
                <Bed size={18} className="text-tangerine" />
                <div>
                  <p className="text-[18px] font-bold text-white">{pin.beds}</p>
                  <p className="text-[11px] text-ghost uppercase tracking-wider">Beds</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
                <Bath size={18} className="text-tangerine" />
                <div>
                  <p className="text-[18px] font-bold text-white">{pin.baths}</p>
                  <p className="text-[11px] text-ghost uppercase tracking-wider">Baths</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1">
                <Maximize size={18} className="text-tangerine" />
                <div>
                  <p className="text-[18px] font-bold text-white">{pin.sqft.toLocaleString()}</p>
                  <p className="text-[11px] text-ghost uppercase tracking-wider">Sqft</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {'description' in pin && pin.description && (
            <div>
              <h3 className="text-[14px] font-bold text-white mb-2">About this property</h3>
              <p className="text-[14px] text-mist leading-relaxed">{pin.description}</p>
            </div>
          )}

          {/* Agent card */}
          <div className="bg-slate rounded-[18px] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar src={agent.photoURL} name={agent.displayName} size={48} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white">{agent.displayName}</p>
                {agent.brokerage && (
                  <p className="text-[12px] text-ghost">{agent.brokerage}</p>
                )}
              </div>
            </div>

            {/* Wave — buyer asks a question privately. */}
            <button
              onClick={() => setWaveOpen(true)}
              className="w-full h-11 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center gap-2 text-white cursor-pointer transition-colors"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '-0.005em',
              }}
            >
              <Hand weight="bold" size={15} />
              Wave at {(agent.displayName || 'agent').split(' ')[0]}
            </button>
          </div>
        </div>
      </div>

      <WaveModal
        isOpen={waveOpen}
        onClose={() => setWaveOpen(false)}
        pinId={pin.id}
        pinAddress={pin.address}
        agentId={pin.agentId}
        agentName={(agent.displayName || 'the agent').split(' ')[0]}
      />
    </DarkBottomSheet>
  )
}
