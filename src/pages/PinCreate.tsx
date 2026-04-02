import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, MapPin, Search, Check, Upload, Video, Camera, X, DollarSign, Home, BadgeCheck, Compass, Plus, Film, Mic } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useGeocoding } from '@/hooks/useGeocoding'
import { useAuthStore } from '@/stores/authStore'
import { createPin } from '@/lib/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { PIN_CONFIG, type PinType, type ContentItem } from '@/lib/types'
import { Timestamp } from 'firebase/firestore'

const PIN_OPTIONS: { type: PinType; label: string; desc: string; icon: typeof Home; color: string }[] = [
  { type: 'for_sale', label: 'For Sale Listing', desc: 'Active listing with MLS data, photos, and content', icon: Home, color: '#3B82F6' },
  { type: 'sold', label: 'Sold Listing', desc: 'Closed sale — showcase your track record', icon: BadgeCheck, color: '#34C759' },
  { type: 'neighborhood', label: 'Neighborhood', desc: 'Neighborhood content — tours, market updates, local tips', icon: Compass, color: '#FF6B3D' },
]

type Step = 'type' | 'address' | 'details' | 'content' | 'publishing'

export default function PinCreate() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  const { results, search, clear } = useGeocoding()

  const [step, setStep] = useState<Step>('type')
  const [pinType, setPinType] = useState<PinType | null>(null)
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)

  // Listing details
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState(3)
  const [baths, setBaths] = useState(2)
  const [sqft, setSqft] = useState('')
  const [description, setDescription] = useState('')
  const [homeType, setHomeType] = useState('condo')
  const [yearBuilt, setYearBuilt] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  // Neighborhood details
  const [neighborhoodName, setNeighborhoodName] = useState('')

  // Content items (added during creation)
  const [contentItems, setContentItems] = useState<{ type: string; caption: string; file: File | null; preview: string | null }[]>([])
  const [showAddContent, setShowAddContent] = useState(false)
  const [newContentType, setNewContentType] = useState<'reel' | 'story' | 'video_note'>('reel')
  const [newCaption, setNewCaption] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newPreview, setNewPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleAddressSearch = (val: string) => {
    setAddress(val); setCoords(null)
    search(val, pinType === 'neighborhood' ? 'neighborhood' : 'address')
  }

  const selectAddress = (result: { placeName: string; center: [number, number] }) => {
    setAddress(result.placeName); setCoords({ lat: result.center[1], lng: result.center[0] }); clear()
  }

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setNewFile(file); setNewPreview(URL.createObjectURL(file))
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files || []))
  }

  const addContent = () => {
    if (!newCaption.trim() && !newFile) return
    setContentItems([...contentItems, { type: newContentType, caption: newCaption, file: newFile, preview: newPreview }])
    setNewCaption(''); setNewFile(null); setNewPreview(null); setShowAddContent(false)
  }

  const removeContent = (idx: number) => {
    setContentItems(contentItems.filter((_, i) => i !== idx))
  }

  const handlePublish = async () => {
    if (!pinType || !coords) return
    const agentId = userDoc?.uid || 'demo-agent'
    setSaving(true); setStep('publishing')

    try {
      const pinData: Record<string, unknown> = {
        agentId,
        type: pinType,
        coordinates: coords,
        address,
        neighborhoodId: '',
        geohash: '',
        enabled: true,
        content: [],
      }

      if (pinType === 'for_sale') {
        Object.assign(pinData, {
          price: Number(price) || 0, beds, baths, sqft: Number(sqft) || 0,
          pricePerSqft: Number(sqft) ? Math.round((Number(price) || 0) / Number(sqft)) : 0,
          homeType, yearBuilt: yearBuilt ? Number(yearBuilt) : null,
          description, status: 'active', daysOnMarket: 0,
          heroPhotoUrl: '', photos: [], openHouse: null, isLive: false,
        })
      } else if (pinType === 'sold') {
        Object.assign(pinData, {
          soldPrice: Number(price) || 0, originalPrice: Number(price) || 0,
          soldDate: Timestamp.now(), beds, baths, sqft: Number(sqft) || 0,
          pricePerSqft: Number(sqft) ? Math.round((Number(price) || 0) / Number(sqft)) : 0,
          homeType, yearBuilt: yearBuilt ? Number(yearBuilt) : null,
          description, daysOnMarket: 0, heroPhotoUrl: '', photos: [],
        })
      } else if (pinType === 'neighborhood') {
        Object.assign(pinData, {
          name: neighborhoodName || address.split(',')[0],
          description, heroPhotoUrl: '',
        })
      }

      // Create pin doc
      const pinId = await createPin(pinData as any)

      // Upload listing photos
      if (photos.length > 0 && (pinType === 'for_sale' || pinType === 'sold')) {
        const urls: string[] = []
        for (const photo of photos) {
          const url = await uploadFile({ path: pinMediaPath(pinId, photo.name), file: photo, onProgress: setUploadProgress })
          urls.push(url)
        }
        const { updatePin } = await import('@/lib/firestore')
        await updatePin(pinId, { photos: urls, heroPhotoUrl: urls[0] || '' } as any)
      }

      // Upload content media + build content array
      if (contentItems.length > 0) {
        const contentArray: ContentItem[] = []
        for (const item of contentItems) {
          let mediaUrl = ''
          let thumbnailUrl = ''
          if (item.file) {
            mediaUrl = await uploadFile({ path: pinMediaPath(pinId, `content-${Date.now()}-${item.file.name}`), file: item.file, onProgress: setUploadProgress })
            thumbnailUrl = mediaUrl // Use same for now
          }
          contentArray.push({
            id: `content-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: item.type as any,
            mediaUrl,
            thumbnailUrl,
            caption: item.caption,
            createdAt: Timestamp.now(),
            views: 0,
            saves: 0,
          })
        }
        const { updatePin } = await import('@/lib/firestore')
        await updatePin(pinId, { content: contentArray } as any)
      }

      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to create pin:', err)
      setSaving(false); setStep('content')
    }
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-xl border-b border-border-light px-5 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-cream flex items-center justify-center">
          <ArrowLeft size={18} className="text-ink" />
        </motion.button>
        <h1 className="text-[18px] font-bold text-ink tracking-tight">New Pin</h1>
        <div className="flex-1" />
        {/* Step indicator */}
        <div className="flex gap-1">
          {['type', 'address', 'details', 'content'].map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full ${step === s || (['type','address','details','content'].indexOf(step) > i) ? 'bg-tangerine' : 'bg-pearl'}`} />
          ))}
        </div>
      </div>

      <div className="px-5 py-6">
        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: TYPE ═══ */}
          {step === 'type' && (
            <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">What are you adding?</h2>
              <p className="text-[14px] text-smoke mb-6">Choose the type of pin for your map.</p>
              <div className="space-y-3">
                {PIN_OPTIONS.map((opt, i) => {
                  const Icon = opt.icon
                  const selected = pinType === opt.type
                  return (
                    <motion.button key={opt.type} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      whileTap={{ scale: 0.97 }} onClick={() => setPinType(opt.type)}
                      className={`w-full flex items-center gap-4 p-4 rounded-[18px] text-left cursor-pointer border-2 transition-all ${selected ? 'border-tangerine bg-tangerine-soft' : 'border-border-light bg-cream'}`}>
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ backgroundColor: selected ? opt.color : `${opt.color}15`, color: selected ? 'white' : opt.color }}>
                        <Icon size={22} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-[15px] font-bold ${selected ? 'text-tangerine' : 'text-ink'}`}>{opt.label}</p>
                        <p className="text-[12px] text-smoke mt-0.5">{opt.desc}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
              <div className="mt-6">
                <Button variant="primary" size="xl" fullWidth disabled={!pinType} onClick={() => setStep('address')}>Continue</Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: ADDRESS ═══ */}
          {step === 'address' && (
            <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">
                {pinType === 'neighborhood' ? 'Which neighborhood?' : 'Where is it?'}
              </h2>
              <p className="text-[14px] text-smoke mb-6">Search for the address or location.</p>

              <div className="relative mb-4">
                <Input placeholder="Search address..." value={address} onChange={(e) => handleAddressSearch(e.target.value)} icon={<Search size={16} />} />
                <AnimatePresence>
                  {results.length > 0 && !coords && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-warm-white rounded-[14px] border border-border-light shadow-lg overflow-hidden z-10">
                      {results.map((r, i) => (
                        <button key={i} onClick={() => selectAddress(r)}
                          className="w-full text-left px-4 py-3 hover:bg-cream flex items-start gap-2.5 border-b border-border-light last:border-0 cursor-pointer">
                          <MapPin size={16} className="text-tangerine mt-0.5 shrink-0" />
                          <span className="text-[14px] text-ink">{r.placeName}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {coords && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-cream rounded-[14px] p-3 flex items-center gap-2.5 mb-6">
                  <div className="w-8 h-8 rounded-full bg-sold-green/15 flex items-center justify-center"><Check size={16} className="text-sold-green" /></div>
                  <p className="text-[13px] font-medium text-ink truncate flex-1">{address}</p>
                </motion.div>
              )}

              {pinType === 'neighborhood' && (
                <Input label="Neighborhood name" placeholder="e.g. Brickell, Wynwood" value={neighborhoodName} onChange={(e) => setNeighborhoodName(e.target.value)} />
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" size="xl" onClick={() => setStep('type')} className="flex-1">Back</Button>
                <Button variant="primary" size="xl" disabled={!coords} onClick={() => setStep('details')} className="flex-[2]">Continue</Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: DETAILS ═══ */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Add details</h2>
              <p className="text-[14px] text-smoke mb-6">{address}</p>

              <div className="space-y-4 mb-8">
                {(pinType === 'for_sale' || pinType === 'sold') && (
                  <>
                    <Input label={pinType === 'sold' ? 'Sold price' : 'Listing price'} placeholder="500000" type="number" value={price} onChange={(e) => setPrice(e.target.value)} icon={<DollarSign size={16} />} />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Beds</label>
                        <div className="flex items-center bg-cream rounded-[12px] border border-border-light">
                          <button onClick={() => setBeds(Math.max(0, beds - 1))} className="px-3 py-2.5 text-smoke">-</button>
                          <span className="flex-1 text-center font-bold text-ink text-[15px]">{beds}</span>
                          <button onClick={() => setBeds(beds + 1)} className="px-3 py-2.5 text-smoke">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Baths</label>
                        <div className="flex items-center bg-cream rounded-[12px] border border-border-light">
                          <button onClick={() => setBaths(Math.max(0, baths - 1))} className="px-3 py-2.5 text-smoke">-</button>
                          <span className="flex-1 text-center font-bold text-ink text-[15px]">{baths}</span>
                          <button onClick={() => setBaths(baths + 1)} className="px-3 py-2.5 text-smoke">+</button>
                        </div>
                      </div>
                      <Input label="Sqft" placeholder="2000" type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Home type</label>
                        <select value={homeType} onChange={(e) => setHomeType(e.target.value)}
                          className="w-full h-12 rounded-[14px] bg-cream border border-border-light px-3 text-[14px] text-ink">
                          <option value="condo">Condo</option>
                          <option value="single_family">Single Family</option>
                          <option value="townhouse">Townhouse</option>
                          <option value="multi_family">Multi-Family</option>
                          <option value="land">Land</option>
                          <option value="commercial">Commercial</option>
                        </select>
                      </div>
                      <Input label="Year built" placeholder="2020" type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
                    </div>
                    {/* Photos */}
                    <div>
                      <input ref={photosRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
                      <button onClick={() => photosRef.current?.click()}
                        className="w-full py-6 border-2 border-dashed border-pearl rounded-[16px] flex flex-col items-center gap-1.5 text-smoke hover:bg-cream cursor-pointer transition-colors">
                        <Camera size={24} />
                        <span className="text-[13px] font-medium">{photos.length > 0 ? `${photos.length} photos selected` : 'Upload listing photos'}</span>
                      </button>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] font-medium text-smoke uppercase tracking-wider mb-1 block">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={pinType === 'neighborhood' ? 'What makes this neighborhood special?' : 'Describe this property...'}
                    rows={3} className="w-full rounded-[14px] bg-cream border border-border-light px-4 py-3 text-[14px] text-ink resize-none placeholder:text-ash outline-none focus:border-tangerine/40" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" size="xl" onClick={() => setStep('address')} className="flex-1">Back</Button>
                <Button variant="primary" size="xl" onClick={() => setStep('content')} className="flex-[2]">Add Content</Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 4: CONTENT ═══ */}
          {step === 'content' && (
            <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Add content</h2>
              <p className="text-[14px] text-smoke mb-6">
                Attach reels, stories, or video notes to this {pinType === 'neighborhood' ? 'neighborhood' : 'listing'}. You can skip and add later.
              </p>

              {/* Existing content items */}
              {contentItems.length > 0 && (
                <div className="space-y-2 mb-6">
                  {contentItems.map((item, i) => (
                    <div key={i} className="bg-cream rounded-[14px] p-3 flex items-center gap-3">
                      {item.preview && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-pearl shrink-0">
                          {item.file?.type.startsWith('video') ? (
                            <video src={item.preview} className="w-full h-full object-cover" />
                          ) : (
                            <img src={item.preview} className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-tangerine uppercase">{item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-[13px] text-ink truncate mt-0.5">{item.caption || 'No caption'}</p>
                      </div>
                      <button onClick={() => removeContent(i)} className="w-7 h-7 rounded-full bg-pearl flex items-center justify-center text-smoke shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add content form */}
              {showAddContent ? (
                <div className="bg-cream rounded-[18px] p-4 mb-6 space-y-3">
                  <div className="flex gap-2">
                    {(['reel', 'story', 'video_note'] as const).map((t) => (
                      <button key={t} onClick={() => setNewContentType(t)}
                        className={`flex-1 py-2 rounded-[10px] text-[11px] font-semibold transition-all ${newContentType === t ? 'bg-tangerine text-white' : 'bg-pearl text-smoke'}`}>
                        {t === 'video_note' ? 'Video Note' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-ash">
                    {newContentType === 'reel' && 'Reels are permanent vertical videos showcasing the property.'}
                    {newContentType === 'story' && 'Stories disappear after 24 hours. Great for open house announcements, quick updates.'}
                    {newContentType === 'video_note' && 'A personal video message about why you love this property. Direct-to-camera.'}
                  </p>

                  <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaFile} className="hidden" />

                  {newPreview ? (
                    <div className="relative rounded-[12px] overflow-hidden aspect-video">
                      {newFile?.type.startsWith('video') ? (
                        <video src={newPreview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={newPreview} className="w-full h-full object-cover" />
                      )}
                      <button onClick={() => { setNewFile(null); setNewPreview(null) }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-pearl rounded-[12px] flex flex-col items-center gap-1 text-smoke hover:bg-pearl/50 cursor-pointer">
                      <Upload size={22} />
                      <span className="text-[12px] font-medium">Upload photo or video</span>
                    </button>
                  )}

                  <textarea value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="Add a caption..."
                    rows={2} className="w-full rounded-[10px] bg-warm-white border border-border-light px-3 py-2 text-[13px] text-ink resize-none placeholder:text-ash outline-none" />

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setShowAddContent(false); setNewCaption(''); setNewFile(null); setNewPreview(null) }} className="flex-1">Cancel</Button>
                    <Button variant="primary" size="sm" onClick={addContent} className="flex-1">Add</Button>
                  </div>
                </div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAddContent(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-[16px] border-2 border-dashed border-tangerine/30 bg-tangerine-soft/30 cursor-pointer mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-tangerine/15 flex items-center justify-center">
                    <Plus size={18} className="text-tangerine" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-tangerine">Add content</p>
                    <p className="text-[11px] text-smoke">Reel, story, or video note</p>
                  </div>
                </motion.button>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" size="xl" onClick={() => setStep('details')} className="flex-1">Back</Button>
                <Button variant="primary" size="xl" onClick={handlePublish} loading={saving} className="flex-[2]">
                  {contentItems.length > 0 ? 'Publish Pin' : 'Publish without content'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ PUBLISHING ═══ */}
          {step === 'publishing' && (
            <motion.div key="publishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 mx-auto mb-4 border-2 border-tangerine border-t-transparent rounded-full" />
              <p className="text-[16px] font-semibold text-ink">Publishing your pin...</p>
              {uploadProgress > 0 && (
                <div className="mt-4 mx-auto max-w-[200px]">
                  <div className="h-2 bg-cream rounded-full overflow-hidden">
                    <motion.div className="h-full bg-tangerine rounded-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[12px] text-smoke mt-1">{Math.round(uploadProgress)}%</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
