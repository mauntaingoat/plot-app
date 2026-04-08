# Reelst

**Where listings come alive.**

Reelst is the modern real estate agent's profile — an interactive, map-based platform where agents pin their listings, stories, reels, and open houses to real addresses, all accessible through a single shareable link.

## The Problem

Real estate agents are fragmented across platforms. Their Instagram is for likes, their Zillow is for leads, their Linktree is a dead-end list of links. None of these show what an agent actually does — sell homes in specific neighborhoods with real content.

Homebuyers have no way to discover agents spatially. They can't see who's active in their target neighborhood, what content an agent creates, or what their track record looks like — all in one place.

## The Solution

One link: `reel.st/username`

An agent's Reelst is a live, interactive map profile. Every listing is a pin on the map. Every pin contains content — walkthrough reels, story updates, video notes, live streams. Homebuyers explore the map, watch content, follow agents, and save listings — all from one link.

**For Agents:**
- Pin listings to real addresses with MLS data, photos, and video content
- Post reels, stories, and video notes attached to each listing
- Go live from open houses with real-time viewer engagement
- Track views, taps, saves, and follower growth with built-in analytics
- Connect Instagram, TikTok, YouTube, and Facebook
- One link for your bio, email signature, and business card

**For Homebuyers:**
- Discover agents by neighborhood, not just by name
- Watch listing content in a TikTok-style vertical feed
- Follow multiple agents and see all their pins on one map
- Save listings across agents into a personal saved map
- Get notified when followed agents post new content or go live

## Core Concept: The Listing IS the Pin

Every pin on the map is a listing (for sale, sold, or neighborhood). Content lives inside listings, not as separate posts. This means every piece of content an agent creates is anchored to a real location — making discovery spatial, not algorithmic.

### Pin Types
- **For Sale** — active listings with MLS data, photos, price, specs, and attached content
- **Sold** — closed sales showcasing track record, with before/after content
- **Neighborhood** — area guides, market updates, and lifestyle content for specific zones

### Animated Pin Indicators
- **Open House** — pins morph from circle to house shape with a door cutout and shake animation
- **Livestream** — pulsing gradient rings radiate from the pin

## View Modes

Reelst supports four ways to explore the map:

- **Select Agent** — view a single agent's pins and content
- **Following** — multi-select agents you follow, see all their pins overlaid
- **Explore All** — discover every agent in the current map viewport
- **Saved** — your personal collection of bookmarked listings across all agents

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4
- **Maps:** Mapbox GL JS with custom canvas-rendered pins and sprite animations
- **Animation:** Framer Motion (gestures, page load), CSS transitions (scroll reveals, UI)
- **State:** Zustand (auth, map filters), React Query (data caching)
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Icons:** Lucide React

## Brand

- **Name:** Reelst (ree-list) — "because the agents here are the realest you'll find"
- **Legal Entity:** Avigage LLC DBA Reelst
- **URL:** reel.st/{username}
- **Colors:** Tangerine `#FF6B3D`, Ember `#E8522A`, Midnight `#0A0E17`, Ivory `#FAFAF8`
- **Typography:** Outfit (UI), JetBrains Mono (stats/prices)
- **Pricing:** Free (5 pins, basic analytics) / Pro $19/mo (unlimited everything)

## Development

```bash
# Install dependencies
npm install

# Start dev server (accessible on local network for mobile testing)
npx vite --host --port 8081

# Type check
npx tsc --noEmit

# Build for production
npx vite build
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:
- `VITE_FIREBASE_API_KEY` — Firebase project API key
- `VITE_FIREBASE_AUTH_DOMAIN` — Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` — Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` — Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` — Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` — Firebase app ID
- `VITE_MAPBOX_TOKEN` — Mapbox GL JS access token

## Vision

Reelst starts as an agent profile tool — the best way for a real estate agent to showcase their work online. But the consumer side (follow, save, explore) seeds a discovery platform. As agents populate their maps with content, homebuyers gain a new way to find agents and neighborhoods — spatially, through content, not through search forms.

The long-term vision: Reelst becomes where real estate content lives. Not Instagram (generic), not Zillow (data-only), not TikTok (no location context). Reelst — where every piece of content is pinned to a place.
