import { useState } from 'react'
import { Bed, Bath, Maximize, MapPin, Bookmark, Share2, Phone, ChevronLeft, ChevronRight, CalendarCheck, Calendar, Clock, Mail, MessageSquare, User as UserIcon, Check } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { formatPrice } from '@/lib/firestore'
import { OpenHouseBlock } from '@/components/listing/OpenHouseBlock'
import type { Pin, ForSalePin, SoldPin, UserDoc } from '@/lib/types'

interface ListingOnlySheetProps {
  pin: Pin
  agent: UserDoc
  onClose: () => void
  isPreview?: boolean
  embedded?: boolean
  isSignedIn?: boolean
  onAuthRequired?: () => void
}

export function ListingOnlySheet({ pin, agent, onClose, isPreview, embedded, isSignedIn, onAuthRequired }: ListingOnlySheetProps) {
  const requireAuth = () => { if (!isSignedIn && onAuthRequired) onAuthRequired() }
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showRequestForm, setShowRequestForm] = useState(false)

  if (pin.type === 'spotlight') return null

  const lp = pin as ForSalePin | SoldPin
  const photos = lp.photos || []

  const content = (
    <>
      {photos.length > 0 && (
        <div className="relative aspect-[4/3] bg-charcoal">
          <img src={photos[photoIndex]} alt="" className="w-full h-full object-cover" />
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"><ChevronLeft size={16} /></button>
              <button onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"><ChevronRight size={16} /></button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{photos.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white w-4' : 'bg-white/40'}`} />)}</div>
            </>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={!isPreview ? requireAuth : undefined} className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer ${isPreview ? 'opacity-40' : ''}`}><Bookmark size={16} /></button>
            <button className={`w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white cursor-pointer ${isPreview ? 'opacity-40' : ''}`}><Share2 size={14} /></button>
          </div>
          {pin.type === 'sold' && <div className="absolute top-3 left-3"><Badge variant="sold">SOLD</Badge></div>}
        </div>
      )}
      <div className="px-5 py-5 space-y-5">
        {'price' in lp && <p className="text-[32px] font-extrabold text-white tracking-tight font-mono">{formatPrice(lp.price)}</p>}
        {'soldPrice' in lp && (
          <div className="flex items-baseline gap-2">
            <p className="text-[32px] font-extrabold text-sold-green tracking-tight font-mono">{formatPrice(lp.soldPrice)}</p>
            {'originalPrice' in lp && lp.originalPrice !== lp.soldPrice && <span className="text-[16px] text-ghost line-through font-mono">{formatPrice(lp.originalPrice)}</span>}
          </div>
        )}
        <p className="text-[14px] text-mist flex items-center gap-1.5"><MapPin size={13} className="text-ghost" /> {pin.address}</p>
        {pin.type === 'for_sale' && <OpenHouseBlock pin={lp as ForSalePin} agent={agent} />}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1"><Bed size={16} className="text-tangerine" /><div><p className="text-[18px] font-bold text-white">{lp.beds}</p><p className="text-[10px] text-ghost uppercase tracking-wider">Beds</p></div></div>
          <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1"><Bath size={16} className="text-tangerine" /><div><p className="text-[18px] font-bold text-white">{lp.baths}</p><p className="text-[10px] text-ghost uppercase tracking-wider">Baths</p></div></div>
          <div className="flex items-center gap-2 bg-slate rounded-xl px-4 py-3 flex-1"><Maximize size={16} className="text-tangerine" /><div><p className="text-[18px] font-bold text-white">{lp.sqft.toLocaleString()}</p><p className="text-[10px] text-ghost uppercase tracking-wider">Sqft</p></div></div>
        </div>
        <div className="space-y-2">
          <Row label="Price / sqft" value={`$${lp.pricePerSqft.toLocaleString()}`} />
          <Row label="Home type" value={lp.homeType.replace('_', ' ')} />
          {'yearBuilt' in lp && lp.yearBuilt && <Row label="Year built" value={String(lp.yearBuilt)} />}
          <Row label="Days on market" value={String(lp.daysOnMarket)} />
          {'mlsNumber' in lp && lp.mlsNumber && <Row label="MLS #" value={lp.mlsNumber} />}
          {'lotSize' in lp && lp.lotSize && <Row label="Lot size" value={lp.lotSize} />}
          {pin.type === 'sold' && 'soldDate' in lp && <Row label="Sold date" value={new Date(lp.soldDate.toMillis()).toLocaleDateString()} />}
        </div>
        {lp.description && <div><h3 className="text-[14px] font-bold text-white mb-2">About this property</h3><p className="text-[14px] text-mist leading-relaxed">{lp.description}</p></div>}
        <div className="bg-slate rounded-[18px] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar src={agent.photoURL} name={agent.displayName} size={48} />
            <div className="flex-1 min-w-0"><p className="text-[15px] font-bold text-white">{agent.displayName}</p>{agent.brokerage && <p className="text-[12px] text-ghost">{agent.brokerage}</p>}</div>
            <Button variant="glass" size="sm" icon={<Phone size={14} />} disabled={isPreview} onClick={!isPreview ? requireAuth : undefined}>Contact</Button>
          </div>
          {pin.type === 'for_sale' && !showRequestForm && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<CalendarCheck size={15} />}
              disabled={isPreview}
              onClick={!isPreview ? () => setShowRequestForm(true) : undefined}
            >
              Request a Showing
            </Button>
          )}
        </div>

        {showRequestForm && (
          <InlineShowingForm pin={lp} agent={agent} onBack={() => setShowRequestForm(false)} />
        )}

        <div className="h-8" />
      </div>
    </>
  )

  if (embedded) return <div className="h-full overflow-y-auto bg-obsidian" style={{ WebkitOverflowScrolling: 'touch' }}>{content}</div>

  return (
    <DarkBottomSheet isOpen={true} onClose={onClose} title={pin.address}>
      {content}
    </DarkBottomSheet>
  )
}

function InlineShowingForm({ pin, agent, onBack }: { pin: ForSalePin | SoldPin; agent: UserDoc; onBack: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('10:00')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email, and phone.')
      return
    }
    setSubmitting(true); setError(null)
    try {
      const { createShowingRequest } = await import('@/lib/firestore')
      await createShowingRequest({ agentId: agent.uid, pinId: pin.id, pinAddress: pin.address, visitorName: name.trim(), visitorEmail: email.trim(), visitorPhone: phone.trim(), preferredDate: date, preferredTime: time, note: note.trim() })
      setSubmitted(true)
    } catch { setError('Could not send your request. Please try again.') }
    finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <div className="px-5 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-sold-green/20 flex items-center justify-center mx-auto mb-4"><Check size={24} className="text-sold-green" /></div>
        <h3 className="text-[17px] font-extrabold text-white tracking-tight">Request sent</h3>
        <p className="text-[13px] text-mist mt-2">{agent.displayName.split(' ')[0]} will reach out within 24 hours.</p>
        <button onClick={onBack} className="text-[13px] font-semibold text-tangerine mt-5 cursor-pointer">Back to listing</button>
      </div>
    )
  }

  const inputCls = "w-full bg-slate text-white text-[13px] font-medium rounded-[10px] px-3 py-2.5 border border-border-dark outline-none focus:border-tangerine transition-colors placeholder:text-ghost"

  return (
    <div className="px-5 py-5 space-y-4 border-t border-border-dark">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-white">Request a Showing</h3>
        <button onClick={onBack} className="text-[12px] font-semibold text-tangerine cursor-pointer">Cancel</button>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5 flex items-center gap-1.5"><span className="text-tangerine"><UserIcon size={12} /></span> Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5 flex items-center gap-1.5"><span className="text-tangerine"><Mail size={12} /></span> Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5 flex items-center gap-1.5"><span className="text-tangerine"><Phone size={12} /></span> Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(305) 555-1234" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5 flex items-center gap-1.5"><span className="text-tangerine"><Calendar size={12} /></span> Date</label>
          <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} className={`${inputCls} hide-native-picker`} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5 flex items-center gap-1.5"><span className="text-tangerine"><Clock size={12} /></span> Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputCls} hide-native-picker`} />
        </div>
      </div>
      <style>{`
        .hide-native-picker::-webkit-calendar-picker-indicator { display: none !important; }
        .hide-native-picker::-webkit-inner-spin-button { display: none !important; }
      `}</style>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-ghost mb-1.5 flex items-center gap-1.5"><span className="text-tangerine"><MessageSquare size={12} /></span> Note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Pre-approved buyer, etc." className={`${inputCls} resize-none`} />
      </div>
      {error && <div className="bg-live-red/10 border border-live-red/30 rounded-[10px] px-3 py-2 text-[12px] text-live-red">{error}</div>}
      <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={submitting}>{submitting ? 'Sending…' : 'Send request'}</Button>
      <p className="text-[10px] text-ghost text-center">By submitting, you agree to be contacted by {agent.displayName}.</p>
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
