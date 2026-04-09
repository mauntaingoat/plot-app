import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { MapCanvas } from '@/components/map/MapCanvas'
import { ListingModal } from '@/components/viewers/ListingModal'
import { getSharedMap } from '@/lib/firestore'
import { getMockPins, MOCK_AGENTS } from '@/lib/mock'
import { firebaseConfigured } from '@/config/firebase'
import type { Pin, UserDoc } from '@/lib/types'

// Public read-only view of someone's saved map collection
export default function SharedMap() {
  const { shareId } = useParams<{ shareId: string }>()
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pins, setPins] = useState<Pin[]>([])
  const [ownerName, setOwnerName] = useState<string>('')
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)

  useEffect(() => {
    if (!shareId) return
    setLoading(true)
    ;(async () => {
      try {
        if (firebaseConfigured) {
          const data = await getSharedMap(shareId)
          if (!data) { setNotFound(true); setLoading(false); return }
          setOwnerName(data.displayName)

          // Resolve pin IDs to actual pins by searching all agents' pins
          const allPins: Pin[] = []
          for (const agent of MOCK_AGENTS) {
            allPins.push(...getMockPins(agent.uid))
          }
          const resolved = allPins.filter((p) => data.pinIds.includes(p.id))
          setPins(resolved)
        } else {
          // Demo mode — no shared map data, show empty
          setOwnerName('Demo User')
          setPins([])
        }
      } catch {
        setNotFound(true)
      }
      setLoading(false)
    })()
  }, [shareId])

  if (loading) return <LoadingScreen onComplete={() => {}} minDuration={500} />

  if (notFound) {
    return (
      <div className="map-page flex flex-col items-center justify-center text-center px-6 bg-midnight">
        <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center mb-4">
          <Bookmark size={28} className="text-ghost" />
        </div>
        <h1 className="text-[24px] font-extrabold text-white mb-2">Map not found</h1>
        <p className="text-[15px] text-ghost mb-6">This shared map doesn't exist or has been deleted.</p>
        <button onClick={() => navigate('/')} className="text-tangerine font-semibold text-[15px] cursor-pointer">Go home</button>
      </div>
    )
  }

  return (
    <div className="map-page" ref={mapContainerRef}>
      <MapCanvas pins={pins} onPinClick={setSelectedPin} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[40] pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
        <div className="flex items-center gap-3 px-4 pt-3 pointer-events-auto">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center text-ink shadow-lg cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Bookmark size={14} className="text-tangerine" />
              <div>
                <p className="text-[13px] font-bold text-ink">{ownerName}'s Saved Map</p>
                <p className="text-[10px] text-smoke">{pins.length} listing{pins.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedPin && (
        <ListingModal
          pin={selectedPin}
          agent={MOCK_AGENTS.find((a) => a.uid === selectedPin.agentId) || MOCK_AGENTS[0]}
          onClose={() => setSelectedPin(null)}
          isPreview
        />
      )}
    </div>
  )
}
