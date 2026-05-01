import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookmarkSimple as Bookmark } from '@phosphor-icons/react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { MapCanvas } from '@/components/map/MapCanvas'
import { ListingModal } from '@/components/viewers/ListingModal'
import { getSharedMap, getPinsByIds, getUserById } from '@/lib/firestore'
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
  const [agentsByUid, setAgentsByUid] = useState<Record<string, UserDoc>>({})

  useEffect(() => {
    if (!shareId) return
    setLoading(true)
    ;(async () => {
      try {
        if (!firebaseConfigured) { setNotFound(true); setLoading(false); return }
        const data = await getSharedMap(shareId)
        if (!data) { setNotFound(true); setLoading(false); return }
        setOwnerName(data.displayName)
        const resolved = data.pinIds.length ? await getPinsByIds(data.pinIds) : []
        setPins(resolved)
      } catch {
        setNotFound(true)
      }
      setLoading(false)
    })()
  }, [shareId])

  // Lazy-load the agent doc for whichever pin the visitor has open in the
  // ListingModal. Cached by uid so we only fetch each agent once.
  useEffect(() => {
    if (!selectedPin) return
    const uid = selectedPin.agentId
    if (!uid || agentsByUid[uid]) return
    ;(async () => {
      const doc = await getUserById(uid)
      if (doc) setAgentsByUid((prev) => ({ ...prev, [uid]: doc }))
    })()
  }, [selectedPin, agentsByUid])

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

      {selectedPin && agentsByUid[selectedPin.agentId] && (
        <ListingModal
          pin={selectedPin}
          agent={agentsByUid[selectedPin.agentId]}
          onClose={() => setSelectedPin(null)}
          isPreview
        />
      )}
    </div>
  )
}
