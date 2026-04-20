import { Timestamp } from 'firebase/firestore'
import type { UserDoc, Pin, ForSalePin, SoldPin, SpotlightPin, ContentItem } from '@/lib/types'

const now = Timestamp.now()
const hours = (h: number) => Timestamp.fromMillis(Date.now() + h * 3600_000)
const daysAgo = (d: number) => Timestamp.fromMillis(Date.now() - d * 86400_000)

/**
 * Returns YYYY-MM-DD for today + `offsetDays`. Used to keep the mock open
 * house sessions always upcoming relative to when the demo is viewed.
 */
function dateInDays(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// ── Mock Agents ──

export const MOCK_AGENTS: UserDoc[] = [
  {
    uid: 'agent-carolina', email: 'carolina@reelst.co', role: 'agent', agentType: 'agent',
    createdAt: daysAgo(90), username: 'carolina', displayName: 'Carolina Reyes',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    bio: 'Miami luxury specialist. Helping families find their dream home in South Florida.',
    brokerage: 'Compass', licenseNumber: 'SL3489201', licenseState: 'FL',
    platforms: [{ id: 'instagram', username: 'carolina.reyes.re' }, { id: 'tiktok', username: 'carolinasellsmiami' }, { id: 'youtube', username: 'CarolinaReyesRE' }, { id: 'facebook', username: 'CarolinaReyesRealEstate' }],
    licenseName: 'Carolina M. Reyes', verificationStatus: 'verified' as const, fairHousingAccepted: true, dataSecurityAccepted: true, emailVerified: true, tier: 'pro' as const, brandColor: null,
    followerCount: 1247, followingCount: 83, onboardingComplete: true, onboardingStep: 8, setupPercent: 90,
  },
  {
    uid: 'agent-david', email: 'david@reelst.co', role: 'agent', agentType: 'agent',
    createdAt: daysAgo(60), username: 'david', displayName: 'David Hartman',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    bio: 'Brickell & Downtown Miami condos. Your skyline expert.',
    brokerage: 'Douglas Elliman', licenseNumber: 'SL3501882', licenseState: 'FL',
    licenseName: 'David A. Hartman', verificationStatus: 'verified' as const, fairHousingAccepted: true, dataSecurityAccepted: true, emailVerified: true, tier: 'pro' as const, brandColor: null,
    platforms: [{ id: 'instagram', username: 'davidhartman_re' }, { id: 'youtube', username: 'DavidSellsMiami' }],
    followerCount: 834, followingCount: 45, onboardingComplete: true, onboardingStep: 8, setupPercent: 85,
  },
  {
    uid: 'agent-lucia', email: 'lucia@reelst.co', role: 'agent', agentType: 'agent',
    createdAt: daysAgo(45), username: 'lucia', displayName: 'Lucia Fernandez',
    photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    bio: 'Coral Gables & Coconut Grove. Architecture lover, neighborhood storyteller.',
    brokerage: 'The Keyes Company', licenseNumber: 'SL3612003', licenseState: 'FL',
    licenseName: 'Lucia M. Fernandez', verificationStatus: 'verified' as const, fairHousingAccepted: true, dataSecurityAccepted: true, emailVerified: true, tier: 'pro' as const, brandColor: null,
    platforms: [{ id: 'instagram', username: 'lucia.homes' }, { id: 'tiktok', username: 'luciafernandez' }],
    followerCount: 2103, followingCount: 112, onboardingComplete: true, onboardingStep: 8, setupPercent: 100,
  },
]

// Dashboard logged-in user — Carolina (pro tier) for demoing advanced analytics
export const MOCK_CURRENT_USER: UserDoc = {
  ...MOCK_AGENTS[0],
}

// ── Content helper ──

function makeContent(items: Partial<ContentItem>[]): ContentItem[] {
  return items.map((item, i) => ({
    id: `content-${Math.random().toString(36).slice(2, 8)}`,
    type: 'reel', mediaUrl: '', caption: '',
    createdAt: daysAgo(i),
    views: Math.floor(Math.random() * 5000) + 100,
    saves: Math.floor(Math.random() * 200) + 10,
    ...item,
  }))
}

// ── Mock Pins ──

export const MOCK_PINS_CAROLINA: Pin[] = [
  // FOR SALE
  {
    id: 'pin-1', agentId: 'agent-carolina', type: 'for_sale',
    coordinates: { lat: 25.7617, lng: -80.1918 }, address: '1000 Brickell Plaza, Miami, FL 33131',
    neighborhoodId: 'brickell', geohash: 'dhwfhx', enabled: true,
    createdAt: daysAgo(14), updatedAt: daysAgo(14), views: 3842, taps: 287, saves: 94,
    price: 1350000, beds: 3, baths: 2, sqft: 1850, pricePerSqft: 730, homeType: 'condo', yearBuilt: 2019,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    photos: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
    description: 'Stunning waterfront condo in the heart of Brickell. Floor-to-ceiling windows with panoramic bay views.',
    listingStatus: 'active', daysOnMarket: 14, mlsNumber: 'A11234567',
    openHouse: {
      sessions: [
        // Always upcoming — computed relative to today so the pill keeps showing.
        { id: 'oh_1_a', date: dateInDays(2), startTime: '14:00', endTime: '17:00' },
        { id: 'oh_1_b', date: dateInDays(3), startTime: '13:00', endTime: '16:00' },
      ],
      recurringWeeks: 0,
    },
    isLive: false,
    content: makeContent([
      { type: 'reel', caption: 'Walk through this stunning Brickell waterfront condo with me.', thumbnailUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=700&fit=crop', duration: 45, views: 12400, saves: 342 },
      { type: 'photo', caption: 'Just listed! Open house this Saturday 2-5 PM.', thumbnailUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=700&fit=crop', views: 2800, saves: 56 },
      { type: 'video_note', caption: 'Why I love this unit — the light in the morning is unreal.', views: 890, saves: 23 },
    ]),
  } as ForSalePin,
  {
    id: 'pin-2', agentId: 'agent-carolina', type: 'for_sale',
    coordinates: { lat: 25.7906, lng: -80.1300 }, address: '5025 Collins Ave, Miami Beach, FL 33140',
    neighborhoodId: 'south-beach', geohash: 'dhwfj2', enabled: true,
    createdAt: daysAgo(7), updatedAt: daysAgo(7), views: 2156, taps: 198, saves: 67,
    price: 2800000, beds: 4, baths: 3, sqft: 2400, pricePerSqft: 1167, homeType: 'condo', yearBuilt: 2021,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    photos: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'],
    description: 'Oceanfront penthouse with private rooftop terrace. Direct beach access.',
    listingStatus: 'active', daysOnMarket: 7, mlsNumber: 'A11234568', openHouse: null, isLive: false,
    content: makeContent([
      { type: 'reel', caption: 'This $2.8M oceanfront penthouse has a private rooftop you need to see.', thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=700&fit=crop', duration: 38, views: 8900, saves: 267 },
    ]),
  } as ForSalePin,
  {
    id: 'pin-3', agentId: 'agent-carolina', type: 'for_sale',
    coordinates: { lat: 25.7281, lng: -80.2380 }, address: '3401 SW 22nd St, Coral Gables, FL 33145',
    neighborhoodId: 'coral-gables', geohash: 'dhwf5q', enabled: true,
    createdAt: daysAgo(3), updatedAt: daysAgo(3), views: 987, taps: 76, saves: 23,
    price: 890000, beds: 3, baths: 2, sqft: 1600, pricePerSqft: 556, homeType: 'single_family', yearBuilt: 1955, lotSize: '6,500 sqft',
    heroPhotoUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    photos: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'],
    description: 'Charming Mediterranean home. Updated kitchen, lush tropical landscaping.',
    listingStatus: 'active', daysOnMarket: 3, openHouse: null, isLive: false,
    content: makeContent([
      { type: 'photo', caption: 'New listing in Coral Gables. DM me for early access.', thumbnailUrl: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&h=700&fit=crop', views: 1560, saves: 45 },
    ]),
  } as ForSalePin,
  {
    id: 'pin-live', agentId: 'agent-carolina', type: 'for_sale',
    coordinates: { lat: 25.7580, lng: -80.1900 }, address: '88 SW 7th St, Brickell Heights, Miami, FL 33130',
    neighborhoodId: 'brickell', geohash: 'dhwfhx', enabled: true,
    createdAt: daysAgo(5), updatedAt: now, views: 1243, taps: 156, saves: 41,
    price: 975000, beds: 2, baths: 2, sqft: 1200, pricePerSqft: 813, homeType: 'condo', yearBuilt: 2022,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&h=600&fit=crop',
    photos: ['https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&h=600&fit=crop'],
    description: 'Modern 2/2 in Brickell Heights. Rooftop pool, gym, walking distance to everything.',
    listingStatus: 'active', daysOnMarket: 5, isLive: true, openHouse: null,
    content: makeContent([
      { type: 'live', caption: 'Live tour: Brickell Heights new listing walkthrough!', views: 43, saves: 2 },
      { type: 'reel', caption: 'Why Brickell Heights is the hottest building right now.', thumbnailUrl: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=400&h=700&fit=crop', duration: 28, views: 3400, saves: 98 },
    ]),
  } as ForSalePin,

  // SOLD
  {
    id: 'pin-4', agentId: 'agent-carolina', type: 'sold',
    coordinates: { lat: 25.7508, lng: -80.2618 }, address: '2800 Coconut Ave, Coconut Grove, FL 33133',
    neighborhoodId: 'coconut-grove', geohash: 'dhwf4r', enabled: true,
    createdAt: daysAgo(30), updatedAt: daysAgo(5), views: 1456, taps: 112, saves: 38,
    soldPrice: 1150000, originalPrice: 1200000, soldDate: daysAgo(5),
    beds: 4, baths: 3, sqft: 2200, pricePerSqft: 523, homeType: 'single_family', yearBuilt: 1972,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
    photos: ['https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop'],
    description: 'Classic Coconut Grove home. Sold above asking in 3 days.',
    daysOnMarket: 3, mlsNumber: 'A11234570',
    content: makeContent([
      { type: 'reel', caption: 'JUST SOLD in Coconut Grove! Here\'s the walkthrough.', thumbnailUrl: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&h=700&fit=crop', duration: 42, views: 5600, saves: 134 },
      { type: 'photo', caption: 'Closing day celebration with my amazing buyers!', views: 1200, saves: 28 },
    ]),
  } as SoldPin,
  {
    id: 'pin-5', agentId: 'agent-carolina', type: 'sold',
    coordinates: { lat: 25.7695, lng: -80.1936 }, address: '801 S Miami Ave, Miami, FL 33130',
    neighborhoodId: 'brickell', geohash: 'dhwfhx', enabled: true,
    createdAt: daysAgo(45), updatedAt: daysAgo(20), views: 2891, taps: 234, saves: 51,
    soldPrice: 725000, originalPrice: 749000, soldDate: daysAgo(20),
    beds: 2, baths: 2, sqft: 1100, pricePerSqft: 659, homeType: 'condo', yearBuilt: 2018,
    heroPhotoUrl: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&h=600&fit=crop',
    photos: ['https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&h=600&fit=crop'],
    description: 'Sleek Brickell condo. Sold in one weekend with multiple offers.',
    daysOnMarket: 2,
    content: makeContent([
      { type: 'reel', caption: 'How we sold this Brickell condo in ONE weekend.', thumbnailUrl: 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=400&h=700&fit=crop', duration: 55, views: 14200, saves: 445 },
    ]),
  } as SoldPin,

  // NEIGHBORHOODS
  {
    id: 'pin-nh-wynwood', agentId: 'agent-carolina', type: 'spotlight',
    coordinates: { lat: 25.7743, lng: -80.1937 }, address: 'Wynwood Arts District, Miami, FL',
    neighborhoodId: 'wynwood', geohash: 'dhwfjx', enabled: true,
    createdAt: daysAgo(10), updatedAt: daysAgo(0), views: 4820, taps: 312, saves: 89,
    name: 'Wynwood', description: 'Miami\'s creative heartbeat. Galleries, murals, restaurants.',
    heroPhotoUrl: 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=800&h=600&fit=crop',
    content: makeContent([
      { type: 'reel', caption: 'Sunday vibes in Wynwood. New gallery opening next week!', thumbnailUrl: 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=400&h=700&fit=crop', duration: 32, views: 8400, saves: 213 },
      { type: 'photo', caption: 'Best coffee spots in Wynwood — my top 3', thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=700&fit=crop', views: 3180, saves: 87 },
      { type: 'reel', caption: 'Wynwood market update: what\'s selling and why now is the time.', duration: 48, views: 6700, saves: 178 },
    ]),
  } as SpotlightPin,
  {
    id: 'pin-nh-keybiscayne', agentId: 'agent-carolina', type: 'spotlight',
    coordinates: { lat: 25.7520, lng: -80.1340 }, address: 'Key Biscayne, FL 33149',
    neighborhoodId: 'key-biscayne', geohash: 'dhwf3m', enabled: true,
    createdAt: daysAgo(8), updatedAt: daysAgo(2), views: 3200, taps: 198, saves: 67,
    name: 'Key Biscayne', description: 'Island living minutes from downtown. Family-friendly beaches, top schools.',
    heroPhotoUrl: 'https://images.unsplash.com/photo-1600573472556-e636c2acda9e?w=800&h=600&fit=crop',
    content: makeContent([
      { type: 'reel', caption: 'Why Key Biscayne is Miami\'s best-kept secret for families.', thumbnailUrl: 'https://images.unsplash.com/photo-1600573472556-e636c2acda9e?w=400&h=700&fit=crop', duration: 52, views: 11200, saves: 312 },
    ]),
  } as SpotlightPin,
]

// ── Helpers ──

export function getMockAgent(username: string): UserDoc | null {
  return MOCK_AGENTS.find((a) => a.username === username) || null
}

export function getMockPins(agentId: string): Pin[] {
  if (agentId === 'agent-carolina') return MOCK_PINS_CAROLINA
  return []
}

export function getAllContent(pins: Pin[]): { content: ContentItem; pin: Pin }[] {
  const items: { content: ContentItem; pin: Pin }[] = []
  const now = Date.now()
  for (const pin of pins) {
    for (const c of pin.content) {
      // Hide content scheduled for the future from the public feed
      const publishMs = (c.publishAt as any)?.toMillis?.() ?? null
      if (publishMs != null && publishMs > now) continue
      items.push({ content: c, pin })
    }
  }
  items.sort((a, b) => {
    const aMs = typeof a.content.createdAt?.toMillis === 'function' ? a.content.createdAt.toMillis() : 0
    const bMs = typeof b.content.createdAt?.toMillis === 'function' ? b.content.createdAt.toMillis() : 0
    return bMs - aMs
  })
  return items
}
