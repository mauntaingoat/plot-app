import { create } from 'zustand'
import type { Pin, PinType } from '@/lib/types'

type DrawerSnap = 'collapsed' | 'half' | 'full'

interface PropertyFilters {
  price: Set<string>
  beds: Set<string>
  baths: Set<string>
  homeType: Set<string>
  sqft: Set<string>
  yearBuilt: Set<string>
  dom: Set<string>
}

interface MapState {
  center: [number, number]
  zoom: number
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void

  pins: Pin[]
  setPins: (pins: Pin[]) => void
  selectedPin: Pin | null
  setSelectedPin: (pin: Pin | null) => void

  activeFilters: Set<PinType>
  toggleFilter: (filter: PinType) => void
  clearFilters: () => void
  isAllSelected: () => boolean

  // Property attribute filters
  propertyFilters: PropertyFilters
  togglePropertyFilter: (key: keyof PropertyFilters, value: string) => void
  clearPropertyFilter: (key: keyof PropertyFilters) => void

  drawerSnap: DrawerSnap
  setDrawerSnap: (snap: DrawerSnap) => void

  viewingAgentId: string | null
  setViewingAgentId: (id: string | null) => void
}

const emptyPropertyFilters: PropertyFilters = {
  price: new Set(), beds: new Set(), baths: new Set(),
  homeType: new Set(), sqft: new Set(), yearBuilt: new Set(), dom: new Set(),
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
    if (next.has(filter)) next.delete(filter)
    else next.add(filter)
    return { activeFilters: next, selectedPin: null }
  }),
  clearFilters: () => set({ activeFilters: new Set(), selectedPin: null }),
  isAllSelected: () => get().activeFilters.size === 0,

  propertyFilters: { ...emptyPropertyFilters },
  togglePropertyFilter: (key, value) => set((s) => {
    const next = new Set(s.propertyFilters[key])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return { propertyFilters: { ...s.propertyFilters, [key]: next } }
  }),
  clearPropertyFilter: (key) => set((s) => ({
    propertyFilters: { ...s.propertyFilters, [key]: new Set() },
  })),

  drawerSnap: 'collapsed',
  setDrawerSnap: (drawerSnap) => set({ drawerSnap }),

  viewingAgentId: null,
  setViewingAgentId: (viewingAgentId) => set({ viewingAgentId }),
}))

// ── Filter logic ──
export function applyPropertyFilters(pins: Pin[], filters: PropertyFilters): Pin[] {
  return pins.filter((pin) => {
    // Price filter
    if (filters.price.size > 0 && 'price' in pin) {
      const p = pin.price
      const match = Array.from(filters.price).some((r) => {
        if (r === '0-500k') return p < 500000
        if (r === '500k-1m') return p >= 500000 && p < 1000000
        if (r === '1m-2m') return p >= 1000000 && p < 2000000
        if (r === '2m-5m') return p >= 2000000 && p < 5000000
        if (r === '5m+') return p >= 5000000
        return true
      })
      if (!match) return false
    }
    if (filters.price.size > 0 && 'soldPrice' in pin) {
      const p = pin.soldPrice
      const match = Array.from(filters.price).some((r) => {
        if (r === '0-500k') return p < 500000
        if (r === '500k-1m') return p >= 500000 && p < 1000000
        if (r === '1m-2m') return p >= 1000000 && p < 2000000
        if (r === '2m-5m') return p >= 2000000 && p < 5000000
        if (r === '5m+') return p >= 5000000
        return true
      })
      if (!match) return false
    }

    // Beds
    if (filters.beds.size > 0 && 'beds' in pin) {
      const match = Array.from(filters.beds).some((r) => pin.beds >= parseInt(r))
      if (!match) return false
    }

    // Baths
    if (filters.baths.size > 0 && 'baths' in pin) {
      const match = Array.from(filters.baths).some((r) => pin.baths >= parseInt(r))
      if (!match) return false
    }

    // Home type
    if (filters.homeType.size > 0 && 'homeType' in pin) {
      if (!filters.homeType.has(pin.homeType)) return false
    }

    // Sqft
    if (filters.sqft.size > 0 && 'sqft' in pin) {
      const s = pin.sqft
      const match = Array.from(filters.sqft).some((r) => {
        if (r === '0-1000') return s < 1000
        if (r === '1000-1500') return s >= 1000 && s < 1500
        if (r === '1500-2000') return s >= 1500 && s < 2000
        if (r === '2000-3000') return s >= 2000 && s < 3000
        if (r === '3000+') return s >= 3000
        return true
      })
      if (!match) return false
    }

    // Year built
    if (filters.yearBuilt.size > 0 && 'yearBuilt' in pin && pin.yearBuilt) {
      const y = pin.yearBuilt
      const match = Array.from(filters.yearBuilt).some((r) => {
        if (r === '2020+') return y >= 2020
        if (r === '2010-2019') return y >= 2010 && y < 2020
        if (r === '2000-2009') return y >= 2000 && y < 2010
        if (r === '1990-1999') return y >= 1990 && y < 2000
        if (r === 'pre-1990') return y < 1990
        return true
      })
      if (!match) return false
    }

    // Days on market
    if (filters.dom.size > 0 && 'daysOnMarket' in pin) {
      const d = pin.daysOnMarket
      const match = Array.from(filters.dom).some((r) => {
        if (r === '0-7') return d <= 7
        if (r === '7-14') return d > 7 && d <= 14
        if (r === '14-30') return d > 14 && d <= 30
        if (r === '30-60') return d > 30 && d <= 60
        if (r === '60+') return d > 60
        return true
      })
      if (!match) return false
    }

    // Neighborhood pins pass through property filters (they don't have these fields)
    return true
  })
}
