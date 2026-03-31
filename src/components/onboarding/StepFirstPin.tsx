import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useGeocoding } from '@/hooks/useGeocoding'
import { PIN_CONFIG, type PinType } from '@/lib/types'
import { PIN_TYPE_ICONS } from '@/components/icons/PinIcons'

const QUICK_TYPES: PinType[] = ['listing', 'sold', 'story', 'open_house']

export function StepFirstPin() {
  const { nextStep, prevStep } = useOnboardingStore()
  const { results, loading, search, clear } = useGeocoding()
  const [selectedType, setSelectedType] = useState<PinType | null>(null)
  const [address, setAddress] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<{ name: string; center: [number, number] } | null>(null)

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

  return (
    <div className="px-6 pt-8 pb-12">
      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Drop your first pin
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        Add a listing, story, or open house to get started.
      </p>

      {/* Pin type selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {QUICK_TYPES.map((type) => {
          const config = PIN_CONFIG[type]
          const Icon = PIN_TYPE_ICONS[type]
          const selected = selectedType === type
          return (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(type)}
              className={`
                flex items-center gap-3 p-3.5 rounded-[14px] cursor-pointer
                border-2 transition-all
                ${selected
                  ? 'border-tangerine bg-tangerine-soft'
                  : 'border-border-light bg-cream hover:bg-pearl'
                }
              `}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: selected ? config.color : config.bgColor, color: selected ? 'white' : config.color }}
              >
                <Icon size={20} />
              </div>
              <span className={`text-[14px] font-semibold ${selected ? 'text-tangerine' : 'text-ink'}`}>
                {config.label}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Address search */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 mb-6"
        >
          <div className="relative">
            <Input
              label="Address"
              placeholder="Search for an address..."
              value={address}
              onChange={(e) => handleSearch(e.target.value)}
              icon={<Search size={16} />}
            />

            {/* Autocomplete results */}
            <AnimatePresence>
              {results.length > 0 && !selectedAddress && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
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

          {selectedAddress && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-cream rounded-[14px] p-3 flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-full bg-sold-green/15 flex items-center justify-center">
                <Check size={16} className="text-sold-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{selectedAddress.name}</p>
                <p className="text-[11px] text-smoke">
                  {selectedAddress.center[1].toFixed(5)}, {selectedAddress.center[0].toFixed(5)}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="xl" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button variant="primary" size="xl" onClick={nextStep} className="flex-[2]">
          {selectedType && selectedAddress ? 'Create Pin' : 'Skip for now'}
        </Button>
      </div>
    </div>
  )
}
