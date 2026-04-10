import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, BarChart3, Radio, Bell, CalendarDays, ChevronDown } from 'lucide-react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { HeroMap } from '@/components/marketing/HeroMap'
import { CityScape } from '@/components/marketing/CityScape'
import { PhoneCarousel } from '@/components/marketing/PhoneCarousel'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// Feature toggle data
const FEATURES = [
  {
    id: 'live',
    label: 'Live Streaming',
    icon: Radio,
    color: '#FF3B30',
    title: 'Go live from any listing',
    desc: 'Stream open houses and walkthroughs directly from your pin. Followers get notified instantly. Recordings auto-save as reels.',
  },
  {
    id: 'openhouse',
    label: 'Open Houses',
    icon: CalendarDays,
    color: '#FFAA00',
    title: 'Schedule and share open houses',
    desc: 'Add sessions with one-click calendar export. Visitors RSVP directly from the listing. Recurring weekly support built in.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    color: '#3B82F6',
    title: 'Never miss a lead',
    desc: 'Push notifications for new followers, showing requests, and saved listings. Real-time inbox in your dashboard.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    color: '#34C759',
    title: 'Know what\'s working',
    desc: 'Per-pin views, taps, saves. Content conversion rates. Geographic heatmaps. Follower growth trends. All in one dashboard.',
  },
]

// FAQ data
const FAQ_ITEMS = [
  { q: 'Is Reelst free?', a: 'Yes. The free plan includes 5 active pins and 3 content items per pin. Upgrade to Pro ($19/mo) or Studio ($39/mo) for higher limits, analytics, and live streaming.' },
  { q: 'What makes Reelst different?', a: 'Reelst is a live, interactive map — not a list of links. Every pin is tied to a real address with content, analytics, and lead capture built in. One link replaces your bio, website, and listing page.' },
  { q: 'Can I import content from Instagram or TikTok?', a: 'Connected platforms are coming soon. You\'ll be able to sync reels and stories from Instagram, TikTok, YouTube, and Facebook directly into your map pins.' },
  { q: 'Do homebuyers need an account to view my map?', a: 'No. Your Reelst is a public page — anyone with the link can browse your map, watch reels, and view listings. They only need an account to follow you or save pins.' },
  { q: 'How do showing requests work?', a: 'Visitors fill out a quick form (name, email, phone, preferred date). You get a push notification + it appears in your dashboard inbox. No third-party tools needed.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  const { open: openAuth } = useAuthModalStore()
  const [heroUsername, setHeroUsername] = useState('')
  const [activeFeature, setActiveFeature] = useState('live')
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  useScrollReveal()

  function handleClaim() {
    const u = heroUsername.trim()
    navigate(u ? `/sign-up?username=${encodeURIComponent(u)}` : '/sign-up')
  }

  useEffect(() => {
    if (userDoc?.role === 'agent' && userDoc.onboardingComplete) navigate('/dashboard', { replace: true })
  }, [userDoc, navigate])

  const currentFeature = FEATURES.find((f) => f.id === activeFeature) || FEATURES[0]

  return (
    <MarketingLayout>
      <SEOHead path="/" />
      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — HERO: Generative cityscape + centered CTA
          ════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[600px] md:min-h-[700px]">
        {/* 3D cityscape background */}
        <CityScape />

        {/* Content — centered */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 sm:px-8 pt-32 md:pt-44 pb-16 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-[620px] text-center mx-auto"
          >
            <h1 className="font-extrabold text-ink tracking-tight leading-[0.97] mb-5" style={{ fontSize: 'clamp(2.75rem, 5.5vw, 5.2rem)' }}>
              Where listings{' '}
              <span className="text-gradient">come alive.</span>
            </h1>

            <p className="text-graphite leading-[1.4] mb-9 max-w-[520px] mx-auto" style={{ fontSize: 'clamp(1.06rem, 1.5vw, 1.4rem)' }}>
              One link. A live map of your listings, stories, reels, and open houses. The modern agent's profile, built for content.
            </p>

            {/* Inline claim form */}
            <div className="flex items-center max-w-[460px] mx-auto bg-white/85 backdrop-blur-md border border-border-light rounded-[14px] p-2 focus-within:border-tangerine/50 focus-within:shadow-[0_0_20px_rgba(255,107,61,0.1)] transition-all">
              <span className="font-bold text-ink pl-4 shrink-0 select-none" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.2rem)' }}>reel.st/</span>
              <input
                type="text"
                value={heroUsername}
                onChange={(e) => setHeroUsername(e.target.value.replace(/[^a-z0-9._-]/gi, '').toLowerCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
                placeholder="yourname"
                className="flex-1 bg-transparent text-tangerine font-bold py-3.5 px-1 outline-none placeholder:text-tangerine/40 min-w-0"
                style={{ fontSize: 'clamp(1rem, 1.3vw, 1.2rem)' }}
              />
              <button
                onClick={handleClaim}
                className="shrink-0 h-12 px-6 rounded-[10px] bg-gradient-to-r from-tangerine to-ember text-white text-[15px] font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-glow-tangerine"
              >
                Claim it <ArrowRight size={16} />
              </button>
            </div>

            <p className="text-[12px] text-ash mt-3">Free forever. No credit card required.</p>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — ARCHITECTURE: Video + text (Linktree-style split)
          ════════════════════════════════════════════════════════════ */}
      <section className="below-fold bg-obsidian">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 md:px-8 py-20 md:py-28">
          <div className="reveal grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* Left — 3D rotating phone carousel */}
            <PhoneCarousel className="py-8" />

            {/* Right — copy */}
            <div>
              <span className="text-[11px] font-bold text-tangerine uppercase tracking-[0.15em] mb-3 block">How it works</span>
              <h2 className="text-[28px] md:text-[40px] font-extrabold text-white tracking-tight leading-tight mb-4">
                Your listings, pinned to the real world.
              </h2>
              <p className="text-[15px] md:text-[17px] text-mist leading-relaxed mb-6">
                Every pin lives on a real address. Tap a pin to see the listing details, swipe through reels and stories, view open house dates, or request a showing — all without leaving the map.
              </p>
              <ul className="space-y-3">
                {['Pin listings to real addresses on an interactive map', 'Attach reels, stories, and photos to each pin', 'Visitors tap, swipe, save, and follow — all from one link'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-tangerine/20 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-tangerine" />
                    </div>
                    <span className="text-[14px] text-mist leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3 — PLATFORM SYNC: Mascot + flowing social icons
          ════════════════════════════════════════════════════════════ */}
      <section className="below-fold">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 md:px-8 py-20 md:py-28">
          <div className="reveal text-center mb-12">
            <span className="text-[11px] font-bold text-tangerine uppercase tracking-[0.15em] mb-3 block">Connected platforms</span>
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight leading-tight mb-3">
              Your content already exists.<br className="hidden md:block" />
              <span className="text-gradient">Bring it to your map.</span>
            </h2>
            <p className="text-[15px] md:text-[17px] text-smoke max-w-[540px] mx-auto leading-relaxed">
              Connect Instagram, TikTok, YouTube, and more. Your existing reels and posts flow directly into your listing pins.
            </p>
          </div>

          {/* Mascot + sign + flowing icons — full width, no container */}
          <div className="reveal relative overflow-hidden" data-delay="2" style={{ minHeight: '420px' }}>
            {/* Mascot placeholder + sign — left/center */}
            <div className="absolute left-1/2 md:left-[30%] top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                {/* Sign post */}
                <div className="w-2 h-44 bg-gradient-to-b from-graphite to-smoke mx-auto rounded-full" />
                {/* Sign board */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-52 bg-white rounded-xl shadow-xl border border-border-light p-4 text-center">
                  <img src="/reelst-logo.png" alt="" className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-ink mb-1">OPEN HOUSE</p>
                  <p className="text-[11px] text-tangerine font-semibold">reel.st/yourname</p>
                  <div className="w-14 h-14 bg-cream rounded-lg mx-auto mt-2 flex items-center justify-center">
                    <div className="w-10 h-10 bg-ink/10 rounded" />
                  </div>
                  <p className="text-[9px] text-ash mt-1">Scan QR</p>
                </div>
                {/* Mascot placeholder */}
                <div className="absolute -bottom-4 -left-20 w-28 h-36 bg-cream rounded-2xl border-2 border-dashed border-tangerine/30 flex items-center justify-center">
                  <span className="text-[10px] text-tangerine font-bold text-center px-2">Your mascot here</span>
                </div>
              </div>
            </div>

            {/* Flowing social icons — single-file from right edge */}
            <FlowingIcons />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4 — FEATURES: Toggle tabs + product screenshots
          ════════════════════════════════════════════════════════════ */}
      <section className="below-fold bg-cream/50 border-y border-border-light">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 md:px-8 py-20 md:py-28">
          <div className="reveal text-center mb-12">
            <span className="text-[11px] font-bold text-tangerine uppercase tracking-[0.15em] mb-3 block">Features</span>
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="reveal grid md:grid-cols-[280px_1fr] gap-8 md:gap-12 items-start" data-delay="2">
            {/* Left — toggle buttons */}
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-5 px-5 md:mx-0 md:px-0">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                const isActive = activeFeature === feature.id
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`
                      shrink-0 flex items-center gap-3 px-4 py-3.5 rounded-[14px] text-left cursor-pointer transition-all duration-200
                      ${isActive
                        ? 'bg-white shadow-md border border-border-light'
                        : 'bg-transparent hover:bg-white/50'
                      }
                    `}
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: isActive ? `${feature.color}18` : 'transparent' }}
                    >
                      <Icon size={18} style={{ color: isActive ? feature.color : '#9CA3AF' }} />
                    </div>
                    <span className={`text-[14px] font-semibold whitespace-nowrap ${isActive ? 'text-ink' : 'text-smoke'}`}>
                      {feature.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Right — product screenshot + info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFeature.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {/* Product screenshot placeholder — no container, sits on section bg */}
                <div
                  className="aspect-[16/10] rounded-[18px] flex items-center justify-center mb-6"
                  style={{ background: `linear-gradient(135deg, ${currentFeature.color}08, ${currentFeature.color}15)` }}
                >
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `${currentFeature.color}20` }}
                    >
                      <currentFeature.icon size={28} style={{ color: currentFeature.color }} />
                    </div>
                    <p className="text-[13px] font-semibold text-smoke">Product screenshot</p>
                    <p className="text-[11px] text-ash mt-1">Placeholder</p>
                  </div>
                </div>

                <h3 className="text-[22px] md:text-[26px] font-extrabold text-ink tracking-tight mb-2">
                  {currentFeature.title}
                </h3>
                <p className="text-[14px] md:text-[16px] text-smoke leading-relaxed max-w-[520px]">
                  {currentFeature.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5 — FAQ
          ════════════════════════════════════════════════════════════ */}
      <section className="below-fold max-w-[720px] mx-auto px-6 sm:px-8 md:px-8 py-20 md:py-28">
        <div className="reveal text-center mb-10">
          <h2 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-3">
            Frequently asked questions
          </h2>
        </div>
        <div className="reveal space-y-2" data-delay="1">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>
    </MarketingLayout>
  )
}

// ── FAQ accordion item ──

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-cream rounded-[14px] border border-border-light overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
      >
        <span className="text-[15px] font-semibold text-ink pr-4">{question}</span>
        <ChevronDown
          size={18}
          className={`text-smoke shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              <p className="text-[14px] text-smoke leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Flowing social icons — single-file from right screen edge ──

const FLOW_ICONS = [
  { name: 'Instagram', color: '#E4405F', svg: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z' },
  { name: 'TikTok', color: '#010101', svg: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  { name: 'YouTube', color: '#FF0000', svg: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  { name: 'Facebook', color: '#1877F2', svg: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
]

function FlowingIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle curved path guide line */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path
          d="M 100% 25% Q 60% 35%, 30% 50%"
          fill="none"
          stroke="url(#flow-grad)"
          strokeWidth="1"
          opacity="0.15"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="flow-grad" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#FF6B3D" stopOpacity="0" />
            <stop offset="40%" stopColor="#FF6B3D" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF6B3D" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Icons in single-file, staggered on same path */}
      {FLOW_ICONS.map((icon, i) => (
        <div
          key={icon.name}
          className="absolute"
          style={{
            right: '-60px',
            top: '22%',
            animation: `iconFlow 5s cubic-bezier(0.4, 0, 0.2, 1) ${i * 1.1}s infinite`,
          }}
        >
          <div
            className="w-12 h-12 rounded-[14px] shadow-xl flex items-center justify-center"
            style={{ background: icon.color }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
              <path d={icon.svg} />
            </svg>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes iconFlow {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          50% {
            transform: translate(calc(-50vw + 100px), 12vh) scale(0.85);
            opacity: 1;
          }
          80% {
            transform: translate(calc(-70vw + 60px), 20vh) scale(0.5);
            opacity: 0.6;
          }
          95% {
            transform: translate(calc(-75vw + 40px), 24vh) scale(0.2);
            opacity: 0;
          }
          100% {
            transform: translate(calc(-75vw + 40px), 24vh) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
