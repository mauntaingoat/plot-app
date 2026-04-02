import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Search, Check, Upload, Image, Video, X, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useGeocoding } from '@/hooks/useGeocoding'
import { useAuthStore } from '@/stores/authStore'
import { createPin } from '@/lib/firestore'
import { uploadFile, pinMediaPath } from '@/lib/storage'
import { PIN_CONFIG, type PinType } from '@/lib/types'

const PIN_TYPES: PinType[] = ['for_sale', 'sold', 'neighborhood']

export default function PinCreate() {
  const navigate = useNavigate()
  const { firebaseUser } = useAuthStore()
  const { results, search, clear } = useGeocoding()

  const [step, setStep] = useState<'type' | 'address' | 'details' | 'publishing'>('type')
  const [pinType, setPinType] = useState<PinType | null>(null)
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)

  // Detail fields
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState(3)
  const [baths, setBaths] = useState(2)
  const [sqft, setSqft] = useState('')
  const [description, setDescription] = useState('')
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)

  const handleAddressSearch = (val: string) => {
    setAddress(val)
    setCoords(null)
    search(val)
  }

  const selectAddress = (result: { placeName: string; center: [number, number] }) => {
    setAddress(result.placeName)
    setCoords({ lat: result.center[1], lng: result.center[0] })
    clear()
  }

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotos(files)
  }

  const handlePublish = async () => {
    if (!firebaseUser || !pinType || !coords) return
    setSaving(true)
    setStep('publishing')

    try {
      // Build pin data
      const pinData: Record<string, unknown> = {
        agentId: firebaseUser.uid,
        type: pinType,
        coordinates: coords,
        address,
        neighborhoodId: '',
        geohash: '',
        enabled: true,
      }

      // Type-specific fields
      if (pinType === 'listing') {
        pinData.price = Number(price) || 0
        pinData.beds = beds
        pinData.baths = baths
        pinData.sqft = Number(sqft) || 0
        pinData.description = description
        pinData.status = 'active'
        pinData.photos = []
        pinData.heroPhotoUrl = ''
      } else if (pinType === 'sold') {
        pinData.soldPrice = Number(price) || 0
        pinData.originalPrice = Number(price) || 0
        pinData.photos = []
        pinData.heroPhotoUrl = ''
      } else if (pinType === 'story') {
        pinData.caption = caption
        pinData.mediaType = mediaFile?.type.startsWith('video') ? 'video' : 'image'
        pinData.mediaUrl = ''
        pinData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      } else if (pinType === 'reel') {
        pinData.caption = caption
        pinData.mediaUrl = ''
        pinData.thumbnailUrl = ''
        pinData.duration = 30
      } else if (pinType === 'open_house') {
        pinData.listingPrice = Number(price) || 0
        pinData.heroPhotoUrl = ''
        pinData.startTime = new Date()
        pinData.endTime = new Date(Date.now() + 3 * 60 * 60 * 1000)
      }

      // Create pin doc
      const pinId = await createPin(pinData as any)

      // Upload media
      if (mediaFile && (pinType === 'story' || pinType === 'reel')) {
        const url = await uploadFile({
          path: pinMediaPath(pinId, mediaFile.name),
          file: mediaFile,
          onProgress: setUploadProgress,
        })
        const { updatePin } = await import('@/lib/firestore')
        await updatePin(pinId, { mediaUrl: url } as any)
      }

      // Upload listing photos
      if (photos.length > 0 && (pinType === 'listing' || pinType === 'sold')) {
        const urls: string[] = []
        for (const photo of photos) {
          const url = await uploadFile({
            path: pinMediaPath(pinId, photo.name),
            file: photo,
            onProgress: setUploadProgress,
          })
          urls.push(url)
        }
        const { updatePin } = await import('@/lib/firestore')
        await updatePin(pinId, {
          photos: urls,
          heroPhotoUrl: urls[0] || '',
        } as any)
      }

      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to create pin:', err)
      setSaving(false)
      setStep('details')
    }
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-xl border-b border-border-light px-5 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)', paddingBottom: '12px' }}
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-cream flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-ink" />
        </motion.button>
        <h1 className="text-[18px] font-bold text-ink tracking-tight">New Pin</h1>
      </div>

      <div className="px-5 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Select type */}
          {step === 'type' && (
            <motion.div key="type" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">What are you adding?</h2>
              <p className="text-[14px] text-smoke mb-6">Choose a pin type for your map.</p>

              <div className="space-y-3">
                {PIN_TYPES.map((type, i) => {
                  const config = PIN_CONFIG[type]
                  const Icon = null // Icons removed — using config label
                  const selected = pinType === type
                  return (
                    <motion.button
                      key={type}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setPinType(type)}
                      className={`
                        w-full flex items-center gap-4 p-4 rounded-[16px] text-left cursor-pointer border-2 transition-all
                        ${selected ? 'border-tangerine bg-tangerine-soft' : 'border-border-light bg-cream'}
                      `}
                    >
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[18px] font-bold" style={{ backgroundColor: selected ? config.color : config.bgColor, color: selected ? 'white' : config.color }}>
                        {config.label[0]}
                      </div>
                      <div className="flex-1">
                        <p className={`text-[15px] font-bold ${selected ? 'text-tangerine' : 'text-ink'}`}>{config.label}</p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <div className="mt-6">
                <Button variant="primary" size="xl" fullWidth disabled={!pinType} onClick={() => setStep('address')}>
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Address */}
          {step === 'address' && (
            <motion.div key="address" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Where is it?</h2>
              <p className="text-[14px] text-smoke mb-6">Search for the property address.</p>

              <div className="relative mb-4">
                <Input
                  placeholder="Search address..."
                  value={address}
                  onChange={(e) => handleAddressSearch(e.target.value)}
                  icon={<Search size={16} />}
                />

                <AnimatePresence>
                  {results.length > 0 && !coords && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-warm-white rounded-[14px] border border-border-light shadow-lg overflow-hidden z-10"
                    >
                      {results.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => selectAddress(r)}
                          className="w-full text-left px-4 py-3 hover:bg-cream flex items-start gap-2.5 border-b border-border-light last:border-0 cursor-pointer"
                        >
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
                  <div className="w-8 h-8 rounded-full bg-sold-green/15 flex items-center justify-center">
                    <Check size={16} className="text-sold-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{address}</p>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="secondary" size="xl" onClick={() => setStep('type')} className="flex-1">Back</Button>
                <Button variant="primary" size="xl" disabled={!coords} onClick={() => setStep('details')} className="flex-[2]">Continue</Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h2 className="text-[24px] font-extrabold text-ink tracking-tight mb-2">Add details</h2>
              <p className="text-[14px] text-smoke mb-6">{address}</p>

              <div className="space-y-4 mb-8">
                {/* Price (listing, sold, open house) */}
                {(pinType === 'listing' || pinType === 'sold' || pinType === 'open_house') && (
                  <Input
                    label="Price"
                    placeholder="500000"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    icon={<DollarSign size={16} />}
                  />
                )}

                {/* Specs (listing) */}
                {pinType === 'listing' && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[12px] font-medium text-smoke uppercase tracking-wider mb-1 block">Beds</label>
                        <div className="flex items-center bg-cream rounded-[12px] border border-border-light">
                          <button onClick={() => setBeds(Math.max(0, beds - 1))} className="px-3 py-3 text-smoke">-</button>
                          <span className="flex-1 text-center font-bold text-ink">{beds}</span>
                          <button onClick={() => setBeds(beds + 1)} className="px-3 py-3 text-smoke">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[12px] font-medium text-smoke uppercase tracking-wider mb-1 block">Baths</label>
                        <div className="flex items-center bg-cream rounded-[12px] border border-border-light">
                          <button onClick={() => setBaths(Math.max(0, baths - 1))} className="px-3 py-3 text-smoke">-</button>
                          <span className="flex-1 text-center font-bold text-ink">{baths}</span>
                          <button onClick={() => setBaths(baths + 1)} className="px-3 py-3 text-smoke">+</button>
                        </div>
                      </div>
                      <Input label="Sqft" placeholder="2000" type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} />
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe this property..."
                      rows={3}
                      className="w-full rounded-[14px] bg-cream border border-border-light px-4 py-3 text-[15px] text-ink resize-none placeholder:text-ash outline-none focus:border-tangerine/40"
                    />
                  </>
                )}

                {/* Caption (story, reel) */}
                {(pinType === 'story' || pinType === 'reel') && (
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    rows={3}
                    className="w-full rounded-[14px] bg-cream border border-border-light px-4 py-3 text-[15px] text-ink resize-none placeholder:text-ash outline-none focus:border-tangerine/40"
                  />
                )}

                {/* Media upload (story, reel) */}
                {(pinType === 'story' || pinType === 'reel') && (
                  <div>
                    <input ref={fileRef} type="file" accept={pinType === 'story' ? 'image/*,video/*' : 'video/*'} onChange={handleMediaFile} className="hidden" />
                    {mediaPreview ? (
                      <div className="relative rounded-[16px] overflow-hidden aspect-[9/16] max-h-[300px]">
                        {mediaFile?.type.startsWith('video') ? (
                          <video src={mediaPreview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={mediaPreview} className="w-full h-full object-cover" />
                        )}
                        <button onClick={() => { setMediaFile(null); setMediaPreview(null) }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()} className="w-full py-12 border-2 border-dashed border-pearl rounded-[16px] flex flex-col items-center gap-2 text-smoke hover:bg-cream cursor-pointer transition-colors">
                        <Upload size={28} />
                        <span className="text-[14px] font-medium">Upload {pinType === 'story' ? 'photo or video' : 'video'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Photos upload (listing, sold) */}
                {(pinType === 'listing' || pinType === 'sold' || pinType === 'open_house') && (
                  <div>
                    <input ref={photosRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
                    <button onClick={() => photosRef.current?.click()} className="w-full py-8 border-2 border-dashed border-pearl rounded-[16px] flex flex-col items-center gap-2 text-smoke hover:bg-cream cursor-pointer transition-colors">
                      <Image size={28} />
                      <span className="text-[14px] font-medium">{photos.length > 0 ? `${photos.length} photos selected` : 'Upload photos'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" size="xl" onClick={() => setStep('address')} className="flex-1">Back</Button>
                <Button variant="primary" size="xl" onClick={handlePublish} loading={saving} className="flex-[2]">Publish Pin</Button>
              </div>
            </motion.div>
          )}

          {/* Publishing */}
          {step === 'publishing' && (
            <motion.div key="publishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 mx-auto mb-4 border-3 border-tangerine border-t-transparent rounded-full"
              />
              <p className="text-[16px] font-semibold text-ink">Publishing your pin...</p>
              {uploadProgress > 0 && (
                <div className="mt-4 mx-auto max-w-[200px]">
                  <div className="h-2 bg-cream rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-tangerine rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
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
