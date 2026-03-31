import { useEffect, useMemo } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db, firebaseConfigured } from '@/config/firebase'
import { useMapStore } from '@/stores/mapStore'
import type { Pin } from '@/lib/types'

export function useAgentPins(agentId: string | null) {
  const { setPins, activeFilters, pins } = useMapStore()

  useEffect(() => {
    if (!agentId || !firebaseConfigured || !db) {
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
    if (activeFilters.size === 0) return pins
    return pins.filter((p) => activeFilters.has(p.type))
  }, [pins, activeFilters])

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
      },
    })),
  }
}
