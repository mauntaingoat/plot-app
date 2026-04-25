import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { useAuthStore } from '@/stores/authStore'
import { useScrollReveal } from '@/hooks/useScrollReveal'

/* ════════════════════════════════════════════════════════════════
   SHARED — cream color, tuned to match the generated illustrations'
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
    <MarketingLayout>
      <SEOHead path="/" />
      <Hero />
      <FeatureShowcase />
      <CloserLook />
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
   CHOREOGRAPHY — simple zigzag path driven by document scroll
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
 * The pin is always positioned in-viewport — no off-screen moments,
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
      // Ease-in-out for each segment — gentle
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

/* Flipbook cadence — commit a new rendered position at a fixed
 * step rate so the pin moves in discrete frames rather than a
 * smooth 60fps glide. Target position is still read continuously
 * from scroll; only the paint is throttled. */
const STEP_MS = 90 // ~11fps — choppy but steady

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

        // Confetti milestones — fire once per crossing (forward only)
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
   CONFETTI — hand-drawn squiggle paths, tumbling outward
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
   SHARED — claim input
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
      className={`flex items-center w-full max-w-[460px] p-1.5 rounded-full transition-all ${className} ${
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
      <button
        onClick={handleClaim}
        className="brand-btn shrink-0 h-11 px-5 rounded-full text-[13px] md:text-[14px] flex items-center gap-1.5 cursor-pointer"
        style={{
          fontFamily: 'var(--font-humanist)',
          fontWeight: 600,
          boxShadow: '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
        }}
      >
        Claim it <ArrowRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   01 — HERO
   Centered. Off-white page bg with a rounded inner "card" carrying
   a faint tangerine topographic-wave texture. Three clay pins live
   at the bottom corners — one leaning on the left, a pair leaning
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
          {/* Content — generous bottom padding leaves room below the
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
              The map-based profile{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                every real estate agent needs
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
              Pin every listing to a real address, attach your reels, photos,
              and open houses, and send one link that turns your territory
              into a place buyers can actually scroll.
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

          {/* Pins — children of the card so overflow-hidden contains
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
            className="hero-pin hero-pin--left pointer-events-none select-none absolute"
          />
          <img
            src="/marketing/hero-pin.png"
            alt=""
            aria-hidden
            draggable={false}
            className="hero-pin hero-pin--right-a pointer-events-none select-none absolute"
          />
          <img
            src="/marketing/hero-pin.png"
            alt=""
            aria-hidden
            draggable={false}
            className="hero-pin hero-pin--right-b pointer-events-none select-none absolute"
          />
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   02 — FEATURE SHOWCASE
   Dark section with curved top corners. Left column: meta headline +
   chip picker (sticky on desktop). Right column: per-feature graphic
   placeholder + punchy headline + description. Chip click swaps the
   right content; no tilt on active — just the brand gradient fill.
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
    label: 'Listing Pins',
    title: 'Your listings, on a real map.',
    desc: 'Drop every listing on a real address. MLS data auto-fills beds, baths, sqft, price, days on market. Buyers scroll your territory — not a feed.',
    // Video file names are historical; the actual recording mapped to
    // each chip is rotated here:
    //   pins       → feature-content.mov   (actually the Listing recording)
    //   spotlights → feature-pins.mov      (actually the Spotlights recording)
    //   content    → feature-spotlights.mov (actually the Content recording)
    video: '/marketing/feature-content.mov',
  },
  {
    key: 'spotlights',
    label: 'Spotlights',
    title: 'Pin the neighborhood, not just the listing.',
    desc: 'A second pin type for the coffee shop, the playground, the block that makes the zip code feel like home. Not a property — a feel for the place. Attach a reel and sell the neighborhood, not just the house.',
    video: '/marketing/feature-pins.mov',
  },
  {
    key: 'content',
    label: 'Content',
    title: 'Every reel, inside a pin.',
    desc: 'Shoot walkthroughs. Drop carousels. Go live from the open house. Your content lives where the listing is — not floating in a feed that forgets it tomorrow.',
    video: '/marketing/feature-spotlights.mov',
  },
  {
    key: 'open-houses',
    label: 'Open Houses',
    title: 'Schedule. Share. Fill the room.',
    desc: 'Create an open house from a pin in two taps. Auto-post to your map and push to your followers. RSVPs land in your inbox, not on a clipboard.',
    video: '/marketing/feature-open-houses.mov',
  },
  {
    key: 'showings',
    label: 'Showing Requests',
    title: 'Leads, not likes.',
    desc: 'Private showing asks drop straight into your inbox with buyer context. Approve, reschedule, or decline in one tap — the back-and-forth ends here.',
    video: '/marketing/feature-showings.mov',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    title: "Know what's actually working.",
    desc: 'Views, taps, and saves per pin. Viewer cities and peak hours. Follower growth over time. Every number you need — none of the ones you don’t.',
    video: '/marketing/feature-analytics.mov',
  },
  {
    key: 'explore',
    label: 'Explore',
    title: 'Show up on the map buyers are already browsing.',
    desc: 'Pro agents surface on the live discovery map. A buyer pans into a city or a neighborhood and sees every Pro working it — your pins included. Free agents stay private; going Pro puts you in front of buyers actively looking.',
    video: '/marketing/feature-explore.mov',
  },
]

function FeatureShowcase() {
  const [activeKey, setActiveKey] = useState<string>(FEATURES[0].key)
  const active = FEATURES.find((f) => f.key === activeKey) || FEATURES[0]

  return (
    <section
      id="features"
      className="pt-16 md:pt-20 pb-16 md:pb-24 rounded-t-[40px] md:rounded-t-[64px] scroll-mt-24"
      style={{ background: '#0A0E17' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-12 md:gap-16 items-start">
          {/* ── Left: meta headline + chips ── */}
          <div>
            <h2
              className="text-white mb-10 md:mb-12"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.5rem, 5.2vw, 4.75rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 0.98,
              }}
            >
              One profile.{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                Every part of your brand.
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
            {/* Packaged screen-recording panel — macOS-style window frame.
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
              {/* Window chrome — compact bar with 3 traffic-light dots */}
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
                {active.video ? (
                  <video
                    key={active.video}
                    src={active.video}
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    onContextMenu={(e) => e.preventDefault()}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                  />
                ) : active.img ? (
                  <img
                    src={active.img}
                    alt=""
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
                )}
              </div>
            </div>

            {/* Text block — key prop restarts the CSS fade on chip switch.
                min-height reserves space for the longest feature's copy so
                the section doesn't jump height when the user toggles chips.
                Tune the min-height if new/longer descriptions are added. */}
            <div
              key={`copy-${active.key}`}
              className="feature-content min-h-[180px] md:min-h-[200px]"
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
          className="text-white/30 mt-12 md:mt-16"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Listings, agents, and analytics shown are illustrative — not real data.
        </p>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   03 — WHY REELST (single hero-style stat card)
   Cream section sharing the hero's bg. One row: cropped Pin it line
   illustration (man's upper body + pin + house) on the LEFT, with a
   centered hero-style grid card on the RIGHT carrying a punchy stat
   about why this works for agents. The illustration is sized so the
   man fits within the card's vertical extent while the house deliber-
   ately bleeds out below the card's bottom edge for a dynamic feel.
   ════════════════════════════════════════════════════════════════ */

function CloserLook() {
  return (
    <section
      id="closer-look"
      className="relative bg-marketing scroll-mt-24"
    >
      <div className="relative max-w-[1240px] mx-auto px-6 md:px-10 pt-8 md:pt-10 pb-28 md:pb-32">
        <div className="relative max-w-[1080px] mx-auto">
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
                Agents who pin every listing on a real map — with reels,
                photos, and live open houses attached — report 3× the
                inbound inquiries of agents using a static link-in-bio.
              </p>
            </div>

            {/* ── Pin it figure (cropped — partial legs visible, house
                 intact). Cut line at 55% of image height sits flush
                 against the card's bottom interior border. Pin + house
                 + trail + lower legs bleed BELOW the card.
                 < lg: centered beneath text. ≥ lg: anchored bottom-right.
                 Image aspect h/w = 0.935; cut at 55% →
                   upper-half = imgW × 0.514, lower-half = imgW × 0.421. */}
            <img
              src="/marketing/howitworks-pin-cropped.png"
              alt=""
              aria-hidden
              draggable={false}
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

/* ════════════════════════════════════════════════════════════════
   06 — READY
   Scroll-driven paintbrush underline on "yours". Pin lands below
   the claim CTA.
   ════════════════════════════════════════════════════════════════ */

function Ready() {
  return (
    <section className="relative bg-midnight grain overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 55%, rgba(255,107,61,0.16), transparent 60%)',
        }}
      />

      <div className="relative max-w-[1000px] mx-auto px-6 md:px-10 py-28 md:py-44 text-center">
        <span
          className="text-[11px] text-tangerine uppercase tracking-[0.18em] mb-6 inline-block"
          style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}
        >
          Ready
        </span>

        <h2
          className="reveal text-white mb-12 md:mb-14"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: 'clamp(2.75rem, 7vw, 6.5rem)',
            fontWeight: 500,
            letterSpacing: '-0.035em',
            lineHeight: 0.98,
          }}
        >
          Claim{' '}
          <ScrollBrushWord>yours</ScrollBrushWord>
          .
        </h2>

        <p
          className="reveal text-white/60 max-w-[560px] mx-auto mb-10"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
            fontWeight: 400,
            lineHeight: 1.55,
          }}
          data-delay="1"
        >
          Claim your handle in 2 minutes. Drop your first pin the same day.
          <br className="hidden md:block" />
          No card. No contract. Always free to start.
        </p>

        <div className="reveal flex justify-center" data-delay="2">
          <ClaimInput variant="dark" data-pin="ready-cta" />
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   ScrollBrushWord — draws underline via scroll (retracts on scroll up)
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
