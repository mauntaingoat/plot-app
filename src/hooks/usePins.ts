import { useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useMapStore } from '@/stores/mapStore'
import type { Pin } from '@/lib/types'

export function useAgentPins(agentId: string | null) {
  const { setPins, activeFilter, pins } = useMapStore()

  useEffect(() => {
    if (!agentId) {
      setPins([])
      return
    }

    const q = query(
      collection(db, 'pins'),
      where('agentId', '==', agentId),
      where('enabled', '==', true),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const pinDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pin)
      setPins(pinDocs)
    })

    return unsub
  }, [agentId, setPins])

  const filteredPins = useMemo(() => {
    if (activeFilter === 'all') return pins
    return pins.filter((p) => p.type === activeFilter)
  }, [pins, activeFilter])

  return { pins, filteredPins }
}

export function pinsToGeoJSON(pins: Pin[]) {
  return {
    type: 'FeatureCollection' as const,
    features: pins.map((pin) => ({
      type: 'Feature' as const,
      id: pin.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.coordinates.lng, pin.coordinates.lat],
      },
      properties: {
        id: pin.id,
        type: pin.type,
        agentId: pin.agentId,
        address: pin.address,
        views: pin.views,
        taps: pin.taps,
        saves: pin.saves,
        // Type-specific
        ...('price' in pin ? { price: pin.price } : {}),
        ...('soldPrice' in pin ? { soldPrice: pin.soldPrice } : {}),
        ...('listingPrice' in pin ? { listingPrice: pin.listingPrice } : {}),
        ...('caption' in pin ? { caption: pin.caption } : {}),
        ...('viewerCount' in pin ? { viewerCount: pin.viewerCount } : {}),
        ...('heroPhotoUrl' in pin ? { heroPhotoUrl: pin.heroPhotoUrl } : {}),
        ...('thumbnailUrl' in pin ? { thumbnailUrl: pin.thumbnailUrl } : {}),
        ...('mediaUrl' in pin ? { mediaUrl: pin.mediaUrl } : {}),
        ...('beds' in pin ? { beds: pin.beds, baths: pin.baths, sqft: pin.sqft } : {}),
        ...('title' in pin ? { title: pin.title } : {}),
      },
    })),
  }
}
