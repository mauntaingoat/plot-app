import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, CursorClick as MousePointerClick, BookmarkSimple as Bookmark, Users, Clock, MapTrifold as MapIcon, SealCheck as BadgeCheck, Heart, House as HomeIcon, Compass, HandWaving, Key } from '@phosphor-icons/react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { FooterContent } from '@/components/marketing/Footer'
import { SEOHead } from '@/components/marketing/SEOHead'
import { useAuthStore } from '@/stores/authStore'
import { useScrollReveal } from '@/hooks/useScrollReveal'

/* ════════════════════════════════════════════════════════════════
   SHARED, cream color, tuned to match the generated illustrations'
   baked-in background so there's no seam between image + section.
   ════════════════════════════════════════════════════════════════ */
const HERO_CREAM = '#F0E8D0'

export default function Home() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  useScrollReveal()
  useEffect(() => {
    if (userDoc?.role === 'agent' && userDoc.onboardingComplete) {
      navigate('/dashboard', { replace: true })
    }
  }, [userDoc, navigate])

  return (
    <MarketingLayout noFooter>
      <SEOHead path="/" />
      <Hero />
      <FeatureShowcase />
      <CloserLook />
      <PinAnalyticsSection />
      <OneLinkCard />
      <PortfolioShowcase />
      <Ready />
    </MarketingLayout>
  )
}

/* ════════════════════════════════════════════════════════════════
   THE PIN
   ════════════════════════════════════════════════════════════════ */

function PinSVG({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} viewBox="0 0 60 84" fill="none" className={className} aria-hidden>
      <path
        d="M 30 3 C 14.5 3, 3 14.5, 3 30 C 3 50, 30 80, 30 80 S 57 50, 57 30 C 57 14.5, 45.5 3, 30 3 Z"
        fill="#FF6B3D"
        stroke="#0A0E17"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="28" r="8.5" fill={HERO_CREAM} stroke="#0A0E17" strokeWidth="2" />
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════
   CHOREOGRAPHY, simple zigzag path driven by document scroll
   progress, with continuous RAF smoothing so the rendered pin
   position LAGS the scroll target. Result: pin feels lazy and
   floaty regardless of how fast the user scrolls.
   ════════════════════════════════════════════════════════════════ */

type PinPose = { x: number; y: number; rotate: number }

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function rectOf(selector: string) {
  const el = document.querySelector(selector)
  return el ? (el as HTMLElement).getBoundingClientRect() : null
}

/*
 * Path keyframes, coords in viewport units (vw / vh fractions).
 * The pin is always positioned in-viewport, no off-screen moments,
 * no opacity fades. Just a continuous zigzag with gentle rotation.
 */
const PATH: Array<{ p: number; xf: number; yf: number; rotate: number }> = [
  { p: 0.000, xf: 0.72, yf: 0.55, rotate: -6  }, // in the pinch (hero image ~45%, 55%; image occupies right half)
  { p: 0.040, xf: 0.72, yf: 0.60, rotate: -2  }, // slipping
  { p: 0.090, xf: 0.70, yf: 0.72, rotate: 14  }, // falling below hero
  { p: 0.160, xf: 0.40, yf: 0.42, rotate: -18 }, // enter Step 1 area
  { p: 0.240, xf: 0.68, yf: 0.50, rotate: 16  }, // over toward Step 2
  { p: 0.320, xf: 0.32, yf: 0.45, rotate: -14 }, // back to Step 3 left side
  { p: 0.400, xf: 0.60, yf: 0.52, rotate: 12  }, // bottom of Steps
  { p: 0.500, xf: 0.30, yf: 0.48, rotate: -10 }, // Closer Look left
  { p: 0.600, xf: 0.65, yf: 0.44, rotate: 10  }, // Closer Look right
  { p: 0.680, xf: 0.42, yf: 0.55, rotate: -8  }, // Closer Look bottom
  { p: 0.760, xf: 0.55, yf: 0.50, rotate: 6   }, // Compared
  { p: 0.850, xf: 0.50, yf: 0.48, rotate: -4  }, // Priced center
  { p: 0.930, xf: 0.50, yf: 0.55, rotate: 2   }, // approach
  { p: 1.000, xf: 0.50, yf: 0.72, rotate: 0   }, // land below final CTA
]

/* If the hero image is visible on screen, override the first keyframe so
 * the pin sits in the actual pinch-point of the image (responsive). */
function getHeroPinchTarget(): PinPose | null {
  const hero = rectOf('[data-pin="hero-img"]')
  if (!hero) return null
  // Pinch in the generated illustration is at ~45% horiz, 55% vert of image.
  const x = hero.left + hero.width * 0.45
  const y = hero.top + hero.height * 0.55 + 30 // +30 so pin TOP is at pinch
  return { x, y, rotate: -6 }
}

function scrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? clamp(window.scrollY / max) : 0
}

function targetPose(): PinPose {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const p = scrollProgress()

  // At the very top while hero is visible, lock the pin to the actual
  // pinch-point of the illustration (responsive to layout).
  if (p < 0.05) {
    const herotarget = getHeroPinchTarget()
    if (herotarget) {
      // Blend out of the hero pinch between p=0.03 and p=0.05 so transition to
      // the general path is smooth.
      const blend = clamp((p - 0.03) / 0.02)
      const pathPose = interpolatePath(p)
      return {
        x: lerp(herotarget.x, pathPose.x, blend),
        y: lerp(herotarget.y, pathPose.y, blend),
        rotate: lerp(herotarget.rotate, pathPose.rotate, blend),
      }
    }
  }

  return interpolatePath(p)
}

function interpolatePath(p: number): PinPose {
  const vw = window.innerWidth
  const vh = window.innerHeight
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1]
    if (p >= a.p && p <= b.p) {
      const tRaw = (p - a.p) / Math.max(0.0001, b.p - a.p)
      // Ease-in-out for each segment, gentle
      const t = tRaw < 0.5
        ? 2 * tRaw * tRaw
        : 1 - Math.pow(-2 * tRaw + 2, 2) / 2
      return {
        x: lerp(a.xf, b.xf, t) * vw,
        y: lerp(a.yf, b.yf, t) * vh,
        rotate: lerp(a.rotate, b.rotate, t),
      }
    }
  }
  const last = PATH[PATH.length - 1]
  return { x: last.xf * vw, y: last.yf * vh, rotate: last.rotate }
}

/* Flipbook cadence, commit a new rendered position at a fixed
 * step rate so the pin moves in discrete frames rather than a
 * smooth 60fps glide. Target position is still read continuously
 * from scroll; only the paint is throttled. */
const STEP_MS = 90 // ~11fps, choppy but steady

function TravelingPin() {
  const pinRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([])
  const burstKeys = useRef<Set<string>>(new Set())
  const burstId = useRef(0)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    let raf = 0
    let lastStep = 0
    let rx = 0, ry = 0, rr = 0 // last committed pose

    const tick = (now: number) => {
      if (now - lastStep >= STEP_MS) {
        lastStep = now
        const target = targetPose()
        rx = target.x; ry = target.y; rr = target.rotate

        const el = pinRef.current
        if (el) {
          el.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) rotate(${rr}deg)`
        }

        // Confetti milestones, fire once per crossing (forward only)
        const p = scrollProgress()
        const milestones: Array<{ key: string; at: number }> = [
          { key: 'hero-drop',   at: 0.10 },
          { key: 'steps-done',  at: 0.44 },
          { key: 'pricing-in',  at: 0.82 },
          { key: 'final-land',  at: 0.96 },
        ]
        for (const m of milestones) {
          if (p >= m.at && !burstKeys.current.has(m.key)) {
            burstKeys.current.add(m.key)
            const id = ++burstId.current
            setBursts((b) => [...b, { id, x: rx, y: ry }])
            setTimeout(() => {
              setBursts((b) => b.filter((x) => x.id !== id))
            }, 1400)
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <>
      <div
        ref={pinRef}
        className="fixed pointer-events-none"
        style={{
          top: 0,
          left: 0,
          zIndex: 30,
          willChange: 'transform',
        }}
      >
        <PinSVG size={60} />
      </div>

      {bursts.map((b) => (
        <ConfettiBurst key={b.id} x={b.x} y={b.y} />
      ))}
    </>
  )
}

/* ════════════════════════════════════════════════════════════════
   CONFETTI, hand-drawn squiggle paths, tumbling outward
   ════════════════════════════════════════════════════════════════ */

const CONFETTI_PIECES = [
  // [path, color]
  { d: 'M 0 0 Q 6 -4 12 0 T 24 0', color: '#FF6B3D' },           // wave
  { d: 'M 0 0 L 14 -4 L 28 0',     color: '#0A0E17' },           // zigzag line
  { d: 'M 0 0 C 6 -8 14 -8 20 0',  color: '#F5C58C' },           // arch
  { d: 'M 0 0 C 4 4 10 -4 14 0 S 22 4 28 0', color: '#FF6B3D' }, // S
  { d: 'M 0 0 Q 4 -8 8 0 T 16 0 T 24 0',     color: '#FF3B7A' }, // double wave
  { d: 'M 0 0 L 18 0',             color: '#0A0E17' },           // straight
  { d: 'M 0 0 C 3 -6 9 -6 12 0 C 15 6 21 6 24 0', color: '#FFAA00' }, // loop
  { d: 'M 0 0 Q 8 -10 16 0',       color: '#FF6B3D' },           // hop
  { d: 'M 0 0 C 6 4 6 -4 12 0',    color: '#0A0E17' },           // squiggle
  { d: 'M 0 0 Q 5 -4 10 0 T 20 0', color: '#F5C58C' },           // small wave
  { d: 'M 0 0 L 6 -4 L 12 0 L 18 -4 L 24 0', color: '#FF3B7A' }, // peaked
  { d: 'M 0 0 Q 6 6 12 0 Q 18 -6 24 0', color: '#FF6B3D' },      // big S
]

function ConfettiBurst({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="fixed pointer-events-none z-20"
      style={{ top: 0, left: 0, transform: `translate3d(${x}px, ${y}px, 0)` }}
    >
      {CONFETTI_PIECES.map((piece, i) => {
        // Random-ish direction and spin per piece
        const angleDeg = (i / CONFETTI_PIECES.length) * 360 + (i % 3 === 0 ? 12 : -8)
        const dist = 70 + (i % 4) * 18
        const dx = Math.cos((angleDeg * Math.PI) / 180) * dist
        const dy = Math.sin((angleDeg * Math.PI) / 180) * dist * 0.9 - 20
        const startRot = (i * 47) % 360
        const spin = (i % 2 === 0 ? 1 : -1) * (240 + i * 40)
        const delay = i * 18
        return (
          <svg
            key={i}
            className="confetti-piece"
            width="32"
            height="16"
            viewBox="-2 -10 32 20"
            style={
              {
                animationDelay: `${delay}ms`,
                ['--dx' as any]: `${dx}px`,
                ['--dy' as any]: `${dy}px`,
                ['--start-rot' as any]: `${startRot}deg`,
                ['--spin' as any]: `${spin}deg`,
              } as React.CSSProperties
            }
          >
            <path
              d={piece.d}
              fill="none"
              stroke={piece.color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
      })}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SHARED, claim input
   ════════════════════════════════════════════════════════════════ */

function ClaimInput({
  variant,
  className = '',
  'data-pin': dataPin,
}: {
  variant: 'dark' | 'light'
  className?: string
  'data-pin'?: string
}) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClaim() {
    const u = username.trim()
    navigate(u ? `/sign-up?username=${encodeURIComponent(u)}` : '/sign-up')
  }

  const isDark = variant === 'dark'

  return (
    <div
      data-pin={dataPin}
      className={`flex items-center w-full max-w-[460px] p-1.5 rounded-[14px] transition-all ${className} ${
        isDark
          ? 'bg-white/[0.06] border border-white/[0.12] backdrop-blur-sm focus-within:border-tangerine/60 focus-within:bg-white/[0.09]'
          : 'bg-white border border-black/[0.08] focus-within:border-tangerine/40 focus-within:shadow-[0_0_0_5px_rgba(255,133,82,0.10)]'
      }`}
      style={
        isDark
          ? undefined
          : { boxShadow: '0 8px 20px -12px rgba(10,14,23,0.10), 0 1px 0 rgba(255,255,255,0.8) inset' }
      }
      onClick={() => inputRef.current?.focus()}
    >
      <span
        className={`pl-5 text-[14px] md:text-[15px] select-none shrink-0 ${
          isDark ? 'text-white/55' : 'text-smoke'
        }`}
        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
      >
        reel.st/
      </span>
      <input
        ref={inputRef}
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9._-]/gi, '').toLowerCase())}
        onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
        placeholder="yourname"
        className={`flex-1 bg-transparent py-3 px-1 outline-none min-w-0 text-[14px] md:text-[15px] ${
          isDark ? 'text-tangerine placeholder:text-white/25' : 'text-tangerine placeholder:text-smoke/45'
        }`}
        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
      />
      {/* Layered button — on hover all three layers translate up-right,
          with the foreground moving most and each layer behind moving a
          uniform step less, so the reveals stay evenly spaced (4px
          between each). Test version for the homepage Claim button
          only; can apply elsewhere if it lands well. */}
      <div className="relative inline-flex shrink-0 group">
        {/* Layer 3 (deepest, moves least) — ember */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-[8px] border border-ink transition-transform duration-200 ease-out group-hover:translate-x-1 group-hover:-translate-y-1"
          style={{ background: 'rgb(239, 139, 94)' }}
        />
        {/* Layer 2 (middle, moves a step more) — light peach */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-[8px] border border-ink transition-transform duration-200 ease-out group-hover:translate-x-2 group-hover:-translate-y-2"
          style={{ background: 'rgb(248, 214, 181)' }}
        />
        {/* Layer 1 (foreground, moves the most) — brand-gradient button */}
        <button
          onClick={handleClaim}
          className="relative h-11 px-5 rounded-[8px] text-[13px] md:text-[14px] flex items-center gap-1.5 cursor-pointer transition-transform duration-200 ease-out group-hover:translate-x-3 group-hover:-translate-y-3"
          style={{
            background: 'var(--brand-grad)',
            color: '#fff',
            fontFamily: 'var(--font-humanist)',
            fontWeight: 600,
            boxShadow: '0 6px 16px -6px rgba(217,74,31,0.40), inset 0 1px 0 rgba(255,255,255,0.24)',
          }}
        >
          Claim it <ArrowRight weight="bold" size={14} />
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   01, HERO
   Centered. Off-white page bg with a rounded inner "card" carrying
   a faint tangerine topographic-wave texture. Three clay pins live
   at the bottom corners, one leaning on the left, a pair leaning
   on each other on the right.
   ════════════════════════════════════════════════════════════════ */

function Hero() {
  return (
    <section className="relative bg-marketing pt-20 md:pt-24 pb-20 md:pb-28">
      <div className="max-w-[1320px] mx-auto px-4 md:px-6">
        <div
          className="map-grid hero-pin-stage relative rounded-[28px] md:rounded-[36px] overflow-hidden"
          style={{
            border: '1px solid rgba(255,133,82,0.22)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.8) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
          }}
        >
          {/* Content, generous bottom padding leaves room below the
              text for the pins to sit inside the card with their tips
              touching the bottom interior border. */}
          <div className="relative z-10 px-6 md:px-10 pt-20 md:pt-28 pb-44 md:pb-52 flex flex-col items-center text-center">
            <h1
              className="text-ink mb-7 max-w-[1080px]"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.5rem, 5.6vw, 5.5rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 0.98,
              }}
            >
              The link in your bio,{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                built for real estate agents
              </span>
            </h1>

            <p
              className="text-graphite max-w-[640px] mb-10 leading-[1.55]"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
                fontWeight: 400,
              }}
            >
              A live map of your listings married to the reels, walkthroughs,
              and neighborhood spotlights you already make, every part of
              your agent brand on one shareable link.
            </p>

            <div className="w-full flex justify-center">
              <ClaimInput variant="light" />
            </div>

            <p
              className="text-[11px] text-smoke mt-5 tracking-[0.18em] uppercase"
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}
            >
              Free forever · 2 min setup · No card
            </p>
          </div>

          {/* Pins, children of the card so overflow-hidden contains
              them. Left pin is a single image, right side is a pre-
              composed pair that already leans against itself. Both
              sit with bottom: 0 so tips touch the bottom interior
              border. Widths scale proportionally on mobile so the
              right pair keeps its internal spacing. */}
          {/* All three pins are sized and positioned from a single
              viewport-driven unit (`--pin-u` on the card), so their
              relationship to each other and to the card's interior
              borders is locked at every viewport width. The rotations
              stay fixed; all spatial values scale proportionally. */}
          <img
            src="/marketing/hero-pin.png"
            alt=""
            aria-hidden
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="hero-pin hero-pin--left pointer-events-none select-none absolute"
          />
          <img
            src="/marketing/hero-pin.png"
            alt=""
            aria-hidden
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="hero-pin hero-pin--right-a pointer-events-none select-none absolute"
          />
          <img
            src="/marketing/hero-pin.png"
            alt=""
            aria-hidden
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="hero-pin hero-pin--right-b pointer-events-none select-none absolute"
          />
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   02, FEATURE SHOWCASE
   Dark section with curved top corners. Left column: meta headline +
   chip picker (sticky on desktop). Right column: per-feature graphic
   placeholder + punchy headline + description. Chip click swaps the
   right content; no tilt on active, just the brand gradient fill.
   Ordered by agent-workflow priority: what you create first (pins,
   content) → how you work (open houses, showings) → how you measure
   (analytics) → how you grow (explore, spotlights).
   ════════════════════════════════════════════════════════════════ */

type Feature = {
  key: string
  label: string
  title: string
  desc: string
  /** Still image or transparent PNG. Rendered as <img>. */
  img?: string
  /** Video path (.mov / .mp4 / .webm). Autoplay, loop, muted, inline.
   *  Takes precedence over `img` when both are set. */
  video?: string
}

const FEATURES: Feature[] = [
  {
    key: 'pins',
    label: 'Map Pins',
    title: 'Your listings, and your neighborhoods, on a real map.',
    desc: 'Drop a pin for a property and MLS auto-fills beds, baths, sqft, price, days on market, and more. Or drop a neighborhood pin to sell the area itself, the streets, the parks, the block that makes the zip code feel like home.',
    video: '/marketing/mappins.mp4',
  },
  {
    key: 'content',
    label: 'Content',
    title: 'Every reel, inside a pin.',
    desc: "Shoot walkthroughs. Drop carousels. Go live from the open house. Tap any pin and the listing comes alive with the content you've attached, reels, photos, the whole drawer.",
    video: '/marketing/content.mp4',
  },
  {
    key: 'open-houses',
    label: 'Open Houses',
    title: 'Schedule. Share. Fill the room.',
    desc: 'Create an open house from a pin in two taps. Auto-post to your map and email your subscribers. RSVPs land in your inbox, not on a clipboard.',
    video: '/marketing/openhouse.mp4',
  },
  {
    key: 'inbox',
    label: 'Inbox',
    title: 'Every signal in one feed.',
    desc: 'Showing requests, new saves, and waves all land in one inbox, sorted by recency, grouped by day, marked unread until you act on them. The back-and-forth ends here.',
    video: '/marketing/inbox.mp4',
  },
  {
    key: 'connect',
    label: 'Connect',
    title: 'Saves bring them back. Waves bring them in.',
    desc: 'Buyers save you to get your weekly digest and wave at any listing to ask questions, two opt-in channels, both private, both straight to your inbox. No public comments to police.',
    video: '/marketing/Connect.mp4',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    title: "Know what's actually working.",
    desc: 'Visits per reel and photo. Taps and saves per pin. Save growth, peak hours, and audience crossover, every signal in one place.',
    video: '/marketing/analytics.mp4',
  },
  {
    key: 'customization',
    label: 'Customization',
    title: 'A profile that looks as distinct as you do.',
    desc: 'Pick the typeface, palette, and map shape that match your personal brand. Tune the accent, swap fonts, reorder sections, your Reelst link in bio adapts to you, not the other way around.',
    video: '/marketing/customization.mp4',
  },
]

function FeatureShowcase() {
  const [activeKey, setActiveKey] = useState<string>(FEATURES[0].key)
  const active = FEATURES.find((f) => f.key === activeKey) || FEATURES[0]
  // Refs to every mounted <video> so chip-click can restart the active
  // clip from frame 0 + pause the others. All videos stay mounted (just
  // hidden) so the browser preloads them in parallel on first paint;
  // switching is then instant from cache instead of a fresh fetch.
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([key, el]) => {
      if (!el) return
      if (key === activeKey) {
        try { el.currentTime = 0 } catch { /* not yet ready */ }
        el.play().catch(() => { /* autoplay may block, harmless */ })
      } else {
        el.pause()
      }
    })
  }, [activeKey])

  return (
    <div className="bg-marketing">
    <section
      id="features"
      className="pt-12 md:pt-14 pb-10 md:pb-14 rounded-t-[40px] md:rounded-t-[64px] scroll-mt-24"
      style={{ background: '#0A0E17' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 md:gap-12 items-center">
          {/* ── Left: meta headline + chips ── */}
          <div>
            <h2
              className="text-white mb-8 md:mb-10"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.5rem, 5.2vw, 4.75rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 0.98,
              }}
            >
              Your listings on a map.{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                Your content inside them.
              </span>
            </h2>

            <div className="flex flex-wrap gap-2.5 max-w-[520px]">
              {FEATURES.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveKey(f.key)}
                  className={`chip-btn ${activeKey === f.key ? 'chip-btn--active' : ''}`}
                  type="button"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: active feature ── */}
          <div>
            {/* Packaged screen-recording panel, macOS-style window frame.
                The video: autoplays on chip change (key remounts it),
                muted, inline, no loop (stays on last frame), fully
                non-interactive (pointer-events none + no controls +
                context menu + PIP disabled). Aspect 16:10 reads as a
                screen. */}
            <div
              key={`graphic-${active.key}`}
              className="feature-panel aspect-[16/9] rounded-[14px] mb-6 relative overflow-hidden flex flex-col"
              style={{
                background: '#0A0E17',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow:
                  '0 30px 60px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,133,82,0.04), 0 40px 80px -60px rgba(217,74,31,0.35)',
              }}
            >
              {/* Window chrome, compact bar with 3 traffic-light dots */}
              <div
                className="shrink-0 flex items-center px-3 h-[22px] border-b border-white/[0.06]"
                style={{ background: 'linear-gradient(180deg, #14181F 0%, #0E1219 100%)' }}
              >
                <div className="flex items-center gap-[5px]">
                  <span className="w-[8px] h-[8px] rounded-full" style={{ background: '#FF5F57' }} />
                  <span className="w-[8px] h-[8px] rounded-full" style={{ background: '#FEBC2E' }} />
                  <span className="w-[8px] h-[8px] rounded-full" style={{ background: '#28C840' }} />
                </div>
                <div className="flex-1 text-center">
                  <span
                    className="text-[9px] tracking-[0.18em] uppercase text-white/30"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    reel.st · {active.label.toLowerCase()}
                  </span>
                </div>
                {/* Spacer to balance the dots on the left */}
                <div className="w-[46px]" />
              </div>

              {/* Media area */}
              <div className="relative flex-1 overflow-hidden" style={{ background: '#05080E' }}>
                {/* Mount every video up front so they preload in parallel.
                    Only the active chip's clip is visible + playing — the
                    rest are paused and opacity:0. This is what makes
                    chip-clicks feel instant: no fresh fetch, no remount. */}
                {FEATURES.filter((f) => f.video).map((f) => (
                  <video
                    key={f.key}
                    ref={(el) => { videoRefs.current[f.key] = el }}
                    src={f.video}
                    autoPlay={f.key === FEATURES[0].key}
                    muted
                    playsInline
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-150"
                    style={{ opacity: f.key === activeKey ? 1 : 0 }}
                  />
                ))}
                {!active.video && (active.img ? (
                  <img
                    src={active.img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div
                        className="text-[10px] uppercase tracking-[0.24em] mb-3"
                        style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,133,82,0.55)' }}
                      >
                        Graphic · {active.label}
                      </div>
                      <div className="text-white/45 text-[13px] max-w-[260px] mx-auto leading-[1.5]">
                        Product snapshot coming.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Text block, key prop restarts the CSS fade on chip switch.
                min-height reserves space for the longest feature's copy so
                the section doesn't jump height when the user toggles chips.
                Tune the min-height if new/longer descriptions are added. */}
            <div
              key={`copy-${active.key}`}
              className="feature-content min-h-[140px] md:min-h-[160px]"
            >
              <h3
                className="text-white mb-3"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(1.4rem, 2.3vw, 2rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.08,
                }}
              >
                {active.title}
              </h3>
              <p className="text-white/60 text-[14.5px] md:text-[15.5px] leading-[1.55] max-w-[500px]">
                {active.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Subtle mock-data disclaimer */}
        <p
          className="text-white/30 mt-8 md:mt-10"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Listings, agents, and analytics shown are illustrative, not real data.
        </p>
      </div>
    </section>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   03, WHY REELST (single hero-style stat card)
   Cream section sharing the hero's bg. One row: cropped Pin it line
   illustration (man's upper body + pin + house) on the LEFT, with a
   centered hero-style grid card on the RIGHT carrying a punchy stat
   about why this works for agents. The illustration is sized so the
   man fits within the card's vertical extent while the house deliber-
   ately bleeds out below the card's bottom edge for a dynamic feel.
   ════════════════════════════════════════════════════════════════ */

function OneLinkCard() {
  return (
    <section className="relative bg-marketing">
      <div className="relative max-w-[1240px] mx-auto px-6 md:px-10 pt-8 md:pt-10 pb-12 md:pb-16">
        <div className="relative">
          <div
            className="map-grid relative rounded-[24px] md:rounded-[32px] px-7 md:px-14 pt-6 md:pt-8 pb-[260px] sm:pb-[300px] lg:pb-10"
            style={{
              border: '1px solid rgba(255,133,82,0.22)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
            }}
          >
            <div className="relative lg:max-w-[560px] lg:ml-auto" style={{ zIndex: 5 }}>
              <p
                className="text-graphite mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                One link
              </p>
              <h2
                className="text-ink mb-5"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(2rem, 4.4vw, 3.75rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.035em',
                  lineHeight: 0.98,
                }}
              >
                Everything that makes you,{' '}
                <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                  you
                </span>
                .
              </h2>
              <p
                className="text-graphite"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(1rem, 1.18vw, 1.12rem)',
                  fontWeight: 400,
                  lineHeight: 1.55,
                }}
              >
                Your sold, for-sale, and spotlight pins. Your reels and
                walkthroughs. Your socials, your broker, your verified badge
               , every piece of your agent presence on a single shareable
                link.
              </p>
            </div>

            <img
              src="/marketing/customize-line-cropped.png"
              alt=""
              aria-hidden
              draggable={false}
              loading="lazy"
              decoding="async"
              className="absolute h-auto pointer-events-none select-none
                         bottom-0 left-1/2 -translate-x-1/2
                         lg:left-[16px] lg:translate-x-0"
              style={{
                zIndex: 4,
                width: 'clamp(200px, 30vw, 340px)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CloserLook() {
  return (
    <section
      id="closer-look"
      className="relative bg-marketing scroll-mt-24"
    >
      <div className="relative max-w-[1240px] mx-auto px-6 md:px-10 pt-8 md:pt-10 pb-40 md:pb-44 lg:pb-24">
        <div className="relative">
          {/* Card uses NO overflow-hidden so the figure's lower half
              (pin + house + trail) can bleed past the card's bottom and
              right edges. The grid background remains clipped to the
              rounded box via background-clip. */}
          <div
            className="map-grid relative rounded-[24px] md:rounded-[32px] px-7 md:px-14 pt-6 md:pt-8 pb-[120px] sm:pb-[170px] lg:pb-10"
            style={{
              border: '1px solid rgba(255,133,82,0.22)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
            }}
          >
            {/* ── Text column: full width on narrow viewports, capped on
                 lg+ to leave room for the figure on the right. */}
            <div className="relative lg:max-w-[560px]" style={{ zIndex: 5 }}>
              <p
                className="text-graphite mb-3"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Why agents pick Reelst
              </p>
              <h2
                className="text-ink mb-5"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(2rem, 4.4vw, 3.75rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.035em',
                  lineHeight: 0.98,
                }}
              >
                <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                  3×
                </span>{' '}
                more buyer inquiries.
              </h2>
              <p
                className="text-graphite"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(1rem, 1.18vw, 1.12rem)',
                  fontWeight: 400,
                  lineHeight: 1.55,
                }}
              >
                Agents whose reels, walkthroughs, and neighborhood
                spotlights live inside their listings, not scattered
                across feeds and profiles, report 3× the inbound
                inquiries of agents using a static link-in-bio.
              </p>
            </div>

            <img
              src="/marketing/howitworks-pin-cropped.png"
              alt=""
              aria-hidden
              draggable={false}
              loading="lazy"
              decoding="async"
              className="absolute h-auto pointer-events-none select-none
                         left-1/2 -translate-x-1/2
                         lg:left-auto lg:translate-x-0 lg:-right-[16px]"
              style={{
                zIndex: 4,
                width: 'clamp(220px, 32vw, 440px)',
                bottom: 'calc(clamp(220px, 32vw, 440px) * -0.421)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* PinAnalyticsSection, wraps the bento `<PinAnalytics />` in its own
   marketing-bg, max-width container so it can be slotted into the page
   flow independently of CloserLook. PinAnalytics renders its own inner
   `<section>` with top margin, so this wrapper adds no top padding. */
function PinAnalyticsSection() {
  return (
    <div className="relative bg-marketing">
      <div className="relative max-w-[1240px] mx-auto px-6 md:px-10 pb-20 md:pb-24">
        <PinAnalytics />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   PinAnalytics, left column hosts a 6-card bento collage of stat
   tiles in tangerine/ember shades; right column carries the headline
   (no underline), subhead, and brand CTA. On scroll the cards fly in
   from their own off-axis directions and converge to their final
   bento positions; on scroll-up they fly back out. Card aspect
   ratios are locked (2:1 for col-span-2, 1:1 for col-span-1) so
   they keep their proportions on resize.
   ──────────────────────────────────────────────────────────────── */
function PinAnalytics() {
  const navigate = useNavigate()
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])

  // Each card's "exploded" offset (px). Mutated in place by the scroll
  // handler, at p=0 the card sits at this offset, at p=1 it's at 0,0.
  const explosions = [
    { ox: -14, oy: -10 }, // 0 Visits     , top-left
    { ox:  16, oy: -12 }, // 1 Taps       , top-right
    { ox: -18, oy:   0 }, // 2 Save rate  , left
    { ox:  14, oy:   0 }, // 3 Subscribers, right
    { ox: -10, oy:  14 }, // 4 Active   , bottom-left
    { ox:  20, oy:  10 }, // 5 Co-saves , bottom-right
  ]

  useEffect(() => {
    let raf = 0
    const update = () => {
      const sec = sectionRef.current
      if (!sec) return
      const rect = sec.getBoundingClientRect()
      const vh = window.innerHeight
      const center = rect.top + rect.height / 2
      const triggerStart = vh * 1.35
      const triggerEnd = vh * 0.80
      let p = (triggerStart - center) / (triggerStart - triggerEnd)
      p = Math.max(0, Math.min(1, p))
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const e = explosions[i]
        const x = e.ox * (1 - p)
        const y = e.oy * (1 - p)
        card.style.transform = `translate(${x}px, ${y}px)`
      })
      raf = 0
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      cancelAnimationFrame(raf)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial inline transform per card so first paint has the cards
  // already at their exploded position (no flash before the scroll
  // handler runs).
  const initialStyle = (i: number) => ({
    transform: `translate(${explosions[i].ox}px, ${explosions[i].oy}px)`,
  } as const)

  return (
    <section
      ref={sectionRef}
      className="relative"
    >
      <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* RIGHT (header), placed first in DOM so on mobile it stacks
            on top of the bento. On lg+ we re-order it to col 2. */}
        <div className="text-center lg:text-left lg:order-2">
          <p
            className="text-graphite mb-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            What your profile says
          </p>
          <h2
            className="text-ink mb-5"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: 'clamp(2rem, 4.4vw, 3.75rem)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 1.0,
            }}
          >
            See what your listings are doing.
          </h2>
          <p
            className="text-graphite mb-9 max-w-[520px] mx-auto lg:mx-0"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: 'clamp(1rem, 1.18vw, 1.12rem)',
              fontWeight: 400,
              lineHeight: 1.55,
            }}
          >
            Visits, taps, save rate, subscriber growth, when your visitors
            are active, and which neighborhoods buyers save yours alongside,
            every signal in one place.
          </p>
          <button
            onClick={() => navigate('/sign-up')}
            className="brand-btn h-12 px-6 rounded-full text-[14px] md:text-[15px] inline-flex items-center gap-2 cursor-pointer"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontWeight: 600,
              boxShadow:
                '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
            }}
          >
            Become a Reelst agent <ArrowRight weight="bold" size={15} />
          </button>
        </div>

        {/* LEFT (bento), second in DOM, ordered to col 1 on lg+. */}
        <div className="relative w-full max-w-[560px] mx-auto lg:order-1">
          <div className="relative grid grid-cols-3 gap-3 md:gap-4">
            {/* Visits, col-span 2, deep tangerine */}
            <StatCard
              cardRef={(el) => { cardRefs.current[0] = el }}
              initialStyle={initialStyle(0)}
              span="col-span-2"
              aspect="2 / 1"
              bg="#FF6B3D"
              fg="white"
              icon={<Eye size={16} />}
              label="Visits"
              value="12,408"
              caption="+18% week / week"
              graphic={<GrowthBars color="rgba(255,255,255,0.85)" />}
            />

            {/* Taps, peach, ink text */}
            <StatCard
              cardRef={(el) => { cardRefs.current[1] = el }}
              initialStyle={initialStyle(1)}
              aspect="1 / 1"
              bg="#FFD4B0"
              fg="#1A0703"
              icon={<MousePointerClick size={16} />}
              label="Taps"
              value="3,217"
              caption="taps to open your pins"
            />

            {/* Save rate, ember, donut */}
            <StatCard
              cardRef={(el) => { cardRefs.current[2] = el }}
              initialStyle={initialStyle(2)}
              aspect="1 / 1"
              bg="#D94A1F"
              fg="white"
              icon={<Heart weight="fill" size={16} />}
              label="Save rate"
              value="27.4%"
              caption="of visitors save"
              graphic={<Donut color="rgba(255,255,255,0.92)" track="rgba(255,255,255,0.18)" />}
            />

            {/* Subscribers, col-span 2, mid tangerine */}
            <StatCard
              cardRef={(el) => { cardRefs.current[3] = el }}
              initialStyle={initialStyle(3)}
              span="col-span-2"
              aspect="2 / 1"
              bg="#FF8552"
              fg="white"
              icon={<Users size={16} />}
              label="Subscribers"
              value="1,842"
              caption="+184 this month"
              graphic={<Sparkline color="rgba(255,255,255,0.92)" />}
            />

            {/* Active hours, col-span 2, deep ember-coral */}
            <StatCard
              cardRef={(el) => { cardRefs.current[4] = el }}
              initialStyle={initialStyle(4)}
              span="col-span-2"
              aspect="2 / 1"
              bg="#A8341A"
              fg="white"
              icon={<Clock size={16} />}
              label="Active hours"
              value="7–10 PM"
              caption="when your visitors tap"
              graphic={<HourBars color="rgba(255,255,255,0.78)" highlight="#FFD4B0" />}
            />

            {/* Crosslist insight, chip cluster shows the *kinds* of
                listings buyers who save yours also save. Mixes a
                feature, a neighborhood, and a price band so the point
                lands without explaining it. */}
            <StatCard
              cardRef={(el) => { cardRefs.current[5] = el }}
              initialStyle={initialStyle(5)}
              aspect="1 / 1"
              bg="#FFE6D1"
              fg="#1A0703"
              icon={<MapIcon size={16} />}
              label="Crosslist"
              value="67%"
              valueSize="clamp(1.05rem, 1.75vw, 1.5rem)"
              caption="of savers also save"
              graphic={<CrosslistChips />}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* StatCard, one bento tile. `aspect` locks proportions on resize.
   `cardRef` + `initialStyle` are wired by PinAnalytics so the scroll
   handler can mutate transform / opacity directly. */
function StatCard({
  cardRef,
  initialStyle,
  span,
  aspect,
  bg,
  fg,
  icon,
  label,
  value,
  valueSize,
  caption,
  graphic,
}: {
  cardRef?: (el: HTMLDivElement | null) => void
  initialStyle?: CSSProperties
  span?: string
  aspect: string
  bg: string
  fg: string
  icon: ReactNode
  label: string
  value: string
  valueSize?: string
  caption: string
  graphic?: ReactNode
}) {
  // Mobile (<sm) cards are very tight (~98px wide in the 3-col bento).
  // Shrink padding/text/icons only on mobile so the label, value,
  // caption, and bottom graphic all fit inside the `overflow-hidden`
  // clip without anything getting cut.
  return (
    <div
      ref={cardRef}
      className={`relative rounded-[18px] p-2 sm:p-3.5 md:p-4 overflow-hidden flex flex-col ${span || ''}`}
      style={{
        background: bg,
        color: fg,
        aspectRatio: aspect,
        boxShadow:
          '0 14px 32px -16px rgba(217,74,31,0.30), 0 6px 16px -8px rgba(10,14,23,0.10), inset 0 1px 0 rgba(255,255,255,0.10)',
        willChange: 'transform, opacity',
        ...initialStyle,
      }}
    >
      <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 opacity-90 min-w-0 [&>span:first-child>svg]:w-3 [&>span:first-child>svg]:h-3 sm:[&>span:first-child>svg]:w-4 sm:[&>span:first-child>svg]:h-4">
        <span className="shrink-0" style={{ opacity: 0.85 }}>{icon}</span>
        <span
          className="truncate min-w-0 text-[8.5px] sm:text-[10px] tracking-[0.06em] sm:tracking-[0.16em] uppercase"
          style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-[1.05rem] sm:text-[1.35rem] md:text-[1.5rem] lg:text-[1.8rem]"
        style={{
          fontFamily: 'var(--font-humanist)',
          fontWeight: 600,
          fontSize: valueSize ? undefined : undefined,
          letterSpacing: '-0.025em',
          lineHeight: 1.0,
        }}
      >
        {valueSize
          ? <span style={{ fontSize: valueSize }}>{value}</span>
          : value}
      </div>
      <div
        className="opacity-80 mt-0.5 sm:mt-1 text-[9.5px] sm:text-[11.5px] line-clamp-2"
        style={{
          fontFamily: 'var(--font-humanist)',
          fontWeight: 400,
          lineHeight: 1.25,
        }}
      >
        {caption}
      </div>
      {graphic && (
        <div className="mt-auto pt-1 sm:pt-1.5 -mx-0.5 sm:-mx-1 flex items-end overflow-hidden min-h-0 flex-shrink scale-[0.78] origin-bottom-left sm:scale-100">
          {graphic}
        </div>
      )}
    </div>
  )
}

/* Sparkline, wavy line trending up. Pure SVG, no data. */
function Sparkline({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 32" className="w-full h-6" preserveAspectRatio="none">
      <path
        d="M0 24 C 14 22, 22 18, 36 16 S 60 12, 72 14 S 96 6, 120 4"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="120" cy="4" r="2.5" fill={color} />
    </svg>
  )
}

/* Donut, single arc representing save rate. */
function Donut({ color, track }: { color: string; track: string }) {
  const r = 14
  const c = 2 * Math.PI * r
  const pct = 0.274
  return (
    <svg viewBox="0 0 36 36" className="w-8 h-8">
      <circle cx="18" cy="18" r={r} fill="none" stroke={track} strokeWidth={4} />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  )
}

/* GrowthBars, 8 ascending bars implying subscriber growth. */
function GrowthBars({ color }: { color: string }) {
  const heights = [22, 28, 26, 38, 44, 50, 58, 70]
  return (
    <svg viewBox="0 0 200 80" className="w-full h-8" preserveAspectRatio="none">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 24 + 4}
          y={80 - h}
          width={16}
          height={h}
          rx={3}
          fill={color}
          opacity={0.55 + i * 0.055}
        />
      ))}
    </svg>
  )
}

/* HourBars, 24 thin bars hinting at hour-of-day distribution. The
   evening peak is highlighted to match "7-10 PM". */
function HourBars({ color, highlight }: { color: string; highlight: string }) {
  const data = [
    8, 6, 5, 4, 4, 5, 8, 14, 22, 28, 32, 36, 40, 38, 36, 38, 42, 50, 64, 70, 66, 50, 30, 18,
  ]
  const peakIdx = new Set([18, 19, 20, 21]) // 7-10 PM
  return (
    <svg viewBox="0 0 200 36" className="w-full h-7" preserveAspectRatio="none">
      {data.map((h, i) => (
        <rect
          key={i}
          x={i * (200 / 24) + 1}
          y={36 - (h * 36) / 80}
          width={(200 / 24) - 2}
          height={(h * 36) / 80}
          rx={1.2}
          fill={peakIdx.has(i) ? highlight : color}
        />
      ))}
    </svg>
  )
}

/* CrosslistChips, small wrapped chip cluster representing the
   "kinds" of listings co-saved alongside the agent's: a feature
   (pool), a neighborhood (Brickell), a price band ($1.2M+). The
   chip styles inherit the card's ink/peach palette so they read
   in both light- and dark-card variants. */
function CrosslistChips() {
  const chips = ['Pools', 'Brickell', '$1.2M+']
  return (
    <div className="flex flex-wrap gap-1 w-full">
      {chips.map((c) => (
        <span
          key={c}
          className="inline-block px-1.5 py-[3px] rounded-full whitespace-nowrap"
          style={{
            background: 'rgba(217,74,31,0.12)',
            color: '#7A2A12',
            border: '1px solid rgba(217,74,31,0.24)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: '9px',
            letterSpacing: '0.04em',
            lineHeight: 1.3,
          }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}


/* ════════════════════════════════════════════════════════════════
   06, READY
   Scroll-driven paintbrush underline on "yours". Pin lands below
   the claim CTA.
   ════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════
   PortfolioShowcase, section 4. Text on the LEFT, animated 3D
   exploded-view composition on the RIGHT: a tilted Reelst profile
   mockup with floating chips orbiting it (verified badge, broker,
   socials, and SOLD/FOR SALE/SPOTLIGHT pins), each on its own
   bob timer so the scene feels alive.
   ════════════════════════════════════════════════════════════════ */

// Single-variant phone mockup mirroring the live AgentProfile layout:
// centered avatar, name + verified, bio, map preview, content grid.
// Top bar carries the same wave-left / save-right FAB pair the real
// profile uses.
function PhoneMock() {
  return (
    <div className="ph-variant">
      <div className="ph-status">9:41</div>

      <div className="ph-topbar">
        <button className="ph-iconbtn" aria-label="Wave">
          <HandWaving weight="fill" size={11} />
        </button>
        <button className="ph-iconbtn" aria-label="Save">
          <Heart weight="fill" size={11} />
        </button>
      </div>

      <div className="ph-hero">
        <div className="ph-avatar" />
        <div className="ph-name">
          Maya Chen
          <BadgeCheck weight="fill" size={11} />
        </div>
        <div className="ph-city">Brickell · Miami</div>
        <div className="ph-bio">Helping families call Brickell home.</div>
      </div>

      <div className="ph-map">
        <span className="ph-map-grid" />
        <span className="ph-mp" style={{ left: '22%', top: '40%', background: '#FF6B3D' }} />
        <span className="ph-mp" style={{ left: '54%', top: '28%', background: '#1A8A6B' }} />
        <span className="ph-mp" style={{ left: '76%', top: '60%', background: '#E0A547' }} />
      </div>

      <div className="ph-grid">
        <div className="ph-tile" style={{ background: 'linear-gradient(135deg,#FFD4B0,#FF8552)' }} />
        <div className="ph-tile" style={{ background: 'linear-gradient(135deg,#FFE6D1,#D94A1F)' }} />
        <div className="ph-tile" style={{ background: 'linear-gradient(135deg,#FF8552,#A8341A)' }} />
        <div className="ph-tile" style={{ background: 'linear-gradient(135deg,#FFD4B0,#FF6B3D)' }} />
      </div>
    </div>
  )
}

function PortfolioShowcase() {
  const navigate = useNavigate()
  const groupRef = useRef<HTMLDivElement>(null)

  // Scroll-driven 3D tilt, applied to the whole 3D group (phone +
  // orbs) so the entire composition rotates as one rigid body. Group
  // enters with rotateY(-25°) and resolves face-on as it scrolls into
  // view, then continues to +25° as it leaves the top.
  useEffect(() => {
    let raf = 0
    const update = () => {
      const group = groupRef.current
      if (!group) return
      const rect = group.getBoundingClientRect()
      const vh = window.innerHeight
      let p = (vh - rect.top) / (vh + rect.height)
      p = Math.max(0, Math.min(1, p))
      const rotY = -25 + 50 * p
      group.style.transform = `rotateY(${rotY}deg)`
      raf = 0
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="relative bg-marketing pt-2 md:pt-4 pb-24 md:pb-32">
      <div className="max-w-[1240px] mx-auto px-6 md:px-10">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* ── LEFT: text ── */}
          <div className="reveal text-center lg:text-left">
            <p
              className="text-graphite mb-4"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Make it yours
            </p>
            <h2
              className="text-ink mb-5"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2rem, 4.4vw, 3.75rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1.0,
              }}
            >
              Your fonts.{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                Your colors.
              </span>{' '}
              Your flair.
            </h2>
            <p
              className="text-graphite mb-9 max-w-[520px] mx-auto lg:mx-0"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(1rem, 1.18vw, 1.12rem)',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              Pick the typeface, palette, and layout that match your personal
              brand. Tune the accent, swap fonts, reorder sections, your
              Reelst link in bio should look as distinct as you do.
            </p>
            <button
              onClick={() => navigate('/sign-up')}
              className="brand-btn h-12 px-6 rounded-full text-[14px] md:text-[15px] inline-flex items-center gap-2 cursor-pointer"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontWeight: 600,
                boxShadow:
                  '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
              }}
            >
              Claim your link <ArrowRight weight="bold" size={15} />
            </button>
          </div>

          {/* ── RIGHT: animated stage ── */}
          <div className="portfolio-stage reveal mx-auto" data-delay="1">
            <div
              ref={groupRef}
              className="portfolio-3d"
              style={{ transform: 'rotateY(-22deg)' }}
            >
              {/* Phone mock, single AgentProfile-shaped layout */}
              <div className="portfolio-phone">
                <PhoneMock />
              </div>

              {/* Real-estate orbs, same chip language as PinCreate */}
              <div className="orb" style={{ left: '4%', bottom: '14%' }}>
                <div className="orb-card orb-pin">
                  <span className="orb-pin-icon" style={{ background: '#3B82F6' }}>
                    <HomeIcon weight="bold" size={12} />
                  </span>
                  <span>For sale</span>
                </div>
              </div>

              <div className="orb" style={{ right: '4%', bottom: '6%' }}>
                <div className="orb-card orb-pin">
                  <span className="orb-pin-icon" style={{ background: '#34C759' }}>
                    <Key weight="bold" size={12} />
                  </span>
                  <span>Sold</span>
                </div>
              </div>

              <div className="orb" style={{ left: '20%', bottom: '-2%' }}>
                <div className="orb-card orb-pin">
                  <span className="orb-pin-icon" style={{ background: '#FF6B3D' }}>
                    <Compass weight="bold" size={12} />
                  </span>
                  <span>Spotlight</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Ready() {
  return (
    <div className="bg-marketing">
    <section className="ready-section relative overflow-hidden pb-8 md:pb-12 rounded-t-[40px] md:rounded-t-[64px]">
      <div className="relative z-10 max-w-[1240px] mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-20 md:pb-28 text-center">
        <h2
          className="reveal text-white mb-7 md:mb-8"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: 'clamp(2.75rem, 7vw, 6.5rem)',
            fontWeight: 500,
            letterSpacing: '-0.035em',
            lineHeight: 0.98,
          }}
        >
          Drop your{' '}
          <ScrollBrushWord>pin</ScrollBrushWord>
          .
        </h2>

        <p
          className="reveal max-w-[520px] mx-auto mb-9"
          style={{
            color: 'rgba(244, 245, 248, 0.68)',
            fontFamily: 'var(--font-humanist)',
            fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
            fontWeight: 400,
            lineHeight: 1.55,
          }}
          data-delay="1"
        >
          Claim your link in 2 minutes. Build your portfolio the same day.
          <br className="hidden md:block" />
          No card. No contract. Always free to start.
        </p>

        <div className="reveal flex justify-center" data-delay="2">
          <ClaimInput variant="light" data-pin="ready-cta" />
        </div>
      </div>

      <div className="ready-footer-card map-grid">
        <FooterContent />
      </div>
    </section>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   ScrollBrushWord, draws underline via scroll (retracts on scroll up)
   ════════════════════════════════════════════════════════════════ */

function ScrollBrushWord({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      const host = hostRef.current
      const path = pathRef.current
      if (!host || !path) return
      const rect = host.getBoundingClientRect()
      const vh = window.innerHeight
      const center = rect.top + rect.height / 2
      // Start drawing when word is 85% down viewport, done when 35% down.
      const triggerStart = vh * 0.85
      const triggerEnd = vh * 0.35
      let p = (triggerStart - center) / (triggerStart - triggerEnd)
      p = Math.max(0, Math.min(1, p))
      path.style.strokeDashoffset = String(600 * (1 - p))
      raf = 0
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <span
      ref={hostRef}
      className="brush-scroll text-tangerine"
      style={{
        fontFamily: 'var(--font-humanist)',
        fontWeight: 600,
        letterSpacing: '-0.035em',
      }}
    >
      {children}
      <svg viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden>
        <path ref={pathRef} d="M 8 28 C 60 16, 140 34, 210 22 S 340 30, 392 18" />
      </svg>
    </span>
  )
}

