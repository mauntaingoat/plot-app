import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Search, Check, Home, DollarSign, TreePine } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useAuthStore } from '@/stores/authStore'
import { useGeocoding } from '@/hooks/useGeocoding'
import { createPin } from '@/lib/firestore'
import type { PinType, ForSalePin, SoldPin, NeighborhoodPin } from '@/lib/types'

const PIN_OPTIONS: { type: PinType; label: string; desc: string; icon: typeof Home; color: string }[] = [
  { type: 'for_sale', label: 'For Sale', desc: 'Active listing', icon: Home, color: '#3B82F6' },
  { type: 'sold', label: 'Sold', desc: 'Closed sale', icon: DollarSign, color: '#34C759' },
  { type: 'neighborhood', label: 'Neighborhood', desc: 'Area content', icon: TreePine, color: '#FF6B3D' },
]

export function StepFirstPin() {
  const { nextStep, prevStep } = useOnboardingStore()
  const { userDoc } = useAuthStore()
  const { results, loading: geoLoading, search, clear } = useGeocoding()
  const [selectedType, setSelectedType] = useState<PinType | null>(null)
  const [address, setAddress] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<{ name: string; center: [number, number] } | null>(null)
  const [creating, setCreating] = useState(false)

  const handleSearch = (val: string) => {
    setAddress(val)
    setSelectedAddress(null)
    search(val)
  }

  const selectAddress = (result: { placeName: string; center: [number, number] }) => {
    setAddress(result.placeName)
    setSelectedAddress({ name: result.placeName, center: result.center })
    clear()
  }

  const handleCreatePin = async () => {
    if (!selectedType || !selectedAddress || !userDoc) { nextStep(); return }
    setCreating(true)

    const base = {
      agentId: userDoc.uid,
      type: selectedType,
      coordinates: { lat: selectedAddress.center[1], lng: selectedAddress.center[0] },
      address: selectedAddress.name,
      neighborhoodId: '',
      geohash: '',
      enabled: true,
      status: 'active' as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      views: 0,
      taps: 0,
      saves: 0,
      content: [],
    }

    try {
      if (selectedType === 'for_sale') {
        await createPin({
          ...base,
          type: 'for_sale',
          price: 0, beds: 0, baths: 0, sqft: 0, pricePerSqft: 0,
          homeType: 'single_family', heroPhotoUrl: '', photos: [],
          description: '', status: 'active', daysOnMarket: 0,
          isLive: false, openHouse: null,
        } as Omit<ForSalePin, 'id'>)
      } else if (selectedType === 'sold') {
        await createPin({
          ...base,
          type: 'sold',
          soldPrice: 0, originalPrice: 0, soldDate: Timestamp.now(),
          beds: 0, baths: 0, sqft: 0, pricePerSqft: 0,
          homeType: 'single_family', heroPhotoUrl: '', photos: [],
          description: '', daysOnMarket: 0,
        } as Omit<SoldPin, 'id'>)
      } else {
        const name = selectedAddress.name.split(',')[0] || 'My Neighborhood'
        await createPin({
          ...base,
          type: 'neighborhood',
          name,
          description: '',
        } as Omit<NeighborhoodPin, 'id'>)
      }
    } catch (e) {
      console.warn('Pin creation during onboarding failed:', e)
    }

    setCreating(false)
    nextStep()
  }

  return (
    <div className="px-6 pt-8 pb-12">
      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Drop your first pin
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        Add a listing or neighborhood. You can add content to it later.
      </p>

      {/* Pin type selector */}
      <div className="space-y-2 mb-6">
        {PIN_OPTIONS.map((opt) => {
          const selected = selectedType === opt.type
          return (
            <motion.button
              key={opt.type}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedType(opt.type)}
              className={`w-full flex items-center gap-3 p-4 rounded-[14px] cursor-pointer border-2 transition-all text-left ${
                selected ? 'border-tangerine bg-tangerine-soft' : 'border-border-light bg-cream hover:bg-pearl'
              }`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: selected ? opt.color : `${opt.color}20`, color: selected ? 'white' : opt.color }}>
                <opt.icon size={20} />
              </div>
              <div>
                <span className={`text-[14px] font-semibold ${selected ? 'text-tangerine' : 'text-ink'}`}>{opt.label}</span>
                <p className="text-[12px] text-smoke">{opt.desc}</p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Address search */}
      {selectedType && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 mb-6">
          <div className="relative">
            <Input
              label="Address"
              placeholder={selectedType === 'neighborhood' ? 'Search for a neighborhood...' : 'Search for an address...'}
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              icon={<Search size={16} />}
            />
            <AnimatePresence>
              {results.length > 0 && !selectedAddress && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
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

          {selectedAddress && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-cream rounded-[14px] p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sold-green/15 flex items-center justify-center">
                <Check size={16} className="text-sold-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{selectedAddress.name}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="xl" onClick={prevStep} className="flex-1">Back</Button>
        <Button variant="primary" size="xl" onClick={handleCreatePin} loading={creating} className="flex-[2]">
          {selectedType && selectedAddress ? 'Create Pin' : 'Skip for now'}
        </Button>
      </div>

      {selectedType && selectedAddress && (
        <p className="text-[12px] text-ash text-center mt-3">
          Pin will appear on your dashboard. Add content later to show it on your map.
        </p>
      )}
    </div>
  )
}
