import { create } from 'zustand'
import type { Pin, PinType } from '@/lib/types'

type DrawerSnap = 'collapsed' | 'half' | 'full'

interface MapState {
  center: [number, number]
  zoom: number
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void

  pins: Pin[]
  setPins: (pins: Pin[]) => void
  selectedPin: Pin | null
  setSelectedPin: (pin: Pin | null) => void

  // Multi-select filters
  activeFilters: Set<PinType>
  toggleFilter: (filter: PinType) => void
  clearFilters: () => void
  isAllSelected: () => boolean

  drawerSnap: DrawerSnap
  setDrawerSnap: (snap: DrawerSnap) => void

  viewingAgentId: string | null
  setViewingAgentId: (id: string | null) => void
}

export const useMapStore = create<MapState>((set, get) => ({
  center: [-80.1918, 25.7617],
  zoom: 12,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),

  pins: [],
  setPins: (pins) => set({ pins }),
  selectedPin: null,
  setSelectedPin: (pin) => set({ selectedPin: pin, drawerSnap: pin ? 'half' : 'collapsed' }),

  activeFilters: new Set<PinType>(),
  toggleFilter: (filter) => set((s) => {
    const next = new Set(s.activeFilters)
    if (next.has(filter)) {
      next.delete(filter)
    } else {
      next.add(filter)
    }
    return { activeFilters: next, selectedPin: null }
  }),
  clearFilters: () => set({ activeFilters: new Set(), selectedPin: null }),
  isAllSelected: () => get().activeFilters.size === 0,

  drawerSnap: 'collapsed',
  setDrawerSnap: (drawerSnap) => set({ drawerSnap }),

  viewingAgentId: null,
  setViewingAgentId: (viewingAgentId) => set({ viewingAgentId }),
}))
