import { create } from 'zustand'
import type { Pin, PinType } from '@/lib/types'

type DrawerSnap = 'collapsed' | 'half' | 'full'

interface MapState {
  // Viewport
  center: [number, number]
  zoom: number
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void

  // Pins
  pins: Pin[]
  setPins: (pins: Pin[]) => void
  selectedPin: Pin | null
  setSelectedPin: (pin: Pin | null) => void

  // Filters
  activeFilter: PinType | 'all'
  setActiveFilter: (filter: PinType | 'all') => void

  // Drawer
  drawerSnap: DrawerSnap
  setDrawerSnap: (snap: DrawerSnap) => void

  // Agent context (when viewing /:username)
  viewingAgentId: string | null
  setViewingAgentId: (id: string | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  center: [-80.1918, 25.7617], // Miami default
  zoom: 12,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),

  pins: [],
  setPins: (pins) => set({ pins }),
  selectedPin: null,
  setSelectedPin: (pin) => set({ selectedPin: pin, drawerSnap: pin ? 'half' : 'collapsed' }),

  activeFilter: 'all',
  setActiveFilter: (activeFilter) => set({ activeFilter, selectedPin: null }),

  drawerSnap: 'collapsed',
  setDrawerSnap: (drawerSnap) => set({ drawerSnap }),

  viewingAgentId: null,
  setViewingAgentId: (viewingAgentId) => set({ viewingAgentId }),
}))
