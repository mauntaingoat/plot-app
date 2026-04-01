import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapPin, Play, Radio, Home, BadgeCheck, BarChart3, Users, Link2, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'

const FEATURES = [
  { icon: MapPin, title: 'Listing Pins', desc: 'Every active listing pinned to its exact address. Price, photos, specs — all visible on your map.', color: '#3B82F6' },
  { icon: Play, title: 'Reels & Stories', desc: 'Post vertical video content tied to addresses. Stories vanish in 24 hours. Reels stay forever.', color: '#A855F7' },
  { icon: Radio, title: 'Go Live', desc: 'Broadcast open houses and walkthroughs live from any address. Viewers see you on the map in real-time.', color: '#FF3B30' },
  { icon: Home, title: 'Open Houses', desc: 'Pulsating pins with date, time, and price. Automatically expire when the event ends.', color: '#FFAA00' },
  { icon: BadgeCheck, title: 'Sold Pins', desc: 'Showcase your track record. Every sale stays on your map as social proof of your expertise.', color: '#34C759' },
  { icon: BarChart3, title: 'Analytics', desc: 'Views, taps, saves, followers — track what\'s working across all your content week over week.', color: '#FF6B3D' },
  { icon: Users, title: 'Audience Tools', desc: 'See your followers, connected platforms, and growing audience in one place.', color: '#3B82F6' },
  { icon: Link2, title: 'One Link', desc: 'reeltor.co/you — put it in your Instagram bio, email signature, business card, everywhere.', color: '#FF6B3D' },
]

const COMPARISON = [
  { feature: 'Link in bio', traditional: true, reeltor: true },
  { feature: 'Interactive map', traditional: false, reeltor: true },
  { feature: 'Listings on real addresses', traditional: false, reeltor: true },
  { feature: 'Stories & Reels', traditional: false, reeltor: true },
  { feature: 'Live streaming', traditional: false, reeltor: true },
  { feature: 'Follower analytics', traditional: false, reeltor: true },
  { feature: 'One tap to contact', traditional: true, reeltor: true },
]

const APP_SCREENSHOTS = [
  { src: '/screenshots/map-view.png', label: 'Map View', desc: 'Your listings, stories, and open houses — all pinned to real addresses.' },
  { src: '/screenshots/content-feed.png', label: 'Content Feed', desc: 'Full-screen reels and stories that consumers can scroll through.' },
  { src: '/screenshots/listing-detail.png', label: 'Listing Detail', desc: 'Tap any pin to see photos, price, specs, and contact info.' },
]

/* Phone frame wrapper */
function PhoneFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto ${className}`} style={{ maxWidth: 260 }}>
      <div className="rounded-[32px] overflow-hidden border-[5px] border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[20px] bg-[#1a1a1a] rounded-b-[12px] z-10" />
        <div className="rounded-[27px] overflow-hidden aspect-[9/19.5] bg-ivory relative">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function ForAgents() {
  const navigate = useNavigate()

  return (
    <MarketingLayout>
      <SEOHead
        title="For Agents"
        description="The modern real estate agent's profile. Map pins, reels, stories, live streams, analytics — all in one link."
        path="/for-agents"
      />

      {/* ════════ HERO ════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tangerine/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-32 pb-20 md:pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tangerine-soft text-tangerine text-[12px] font-bold uppercase tracking-wider mb-6">
              Built for agents
            </span>
            <h1 className="text-[34px] md:text-[54px] lg:text-[64px] font-extrabold text-ink tracking-tight leading-[1.06] mb-6 max-w-[740px] mx-auto">
              Your listings deserve more than a{' '}
              <span className="text-gradient">link in bio.</span>
            </h1>
            <p className="text-[17px] md:text-[20px] text-smoke max-w-[560px] mx-auto mb-10 leading-relaxed">
              Reeltor gives you an interactive map profile where every piece of content lives at a real address. Consumers don't just see your listings — they explore your neighborhood.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" size="xl" onClick={() => navigate('/sign-up')} iconRight={<ArrowRight size={18} />}>
                Claim your Reeltor — free
              </Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/pricing')}>
                View pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════ FEATURES GRID ════════ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 md:py-36">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-[30px] md:text-[44px] font-extrabold text-ink tracking-tight mb-4">Everything you need</h2>
          <p className="text-[16px] md:text-[18px] text-smoke max-w-[500px] mx-auto">
            Pin it, film it, stream it, track it. All from one dashboard.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                viewport={{ once: true }}
                className="bg-cream rounded-[20px] p-6 hover:shadow-sm transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}12` }}
                >
                  <Icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-[16px] font-bold text-ink mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-smoke leading-relaxed">{f.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ════════ APP SCREENSHOTS ════════ */}
      <section className="bg-cream/50 border-y border-border-light">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[30px] md:text-[44px] font-extrabold text-ink tracking-tight mb-4">
              See it in action
            </h2>
            <p className="text-[16px] md:text-[18px] text-smoke max-w-[480px] mx-auto">
              A real map, real content, real addresses. Here's what your profile looks like.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 md:gap-8">
            {APP_SCREENSHOTS.map((screen, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className="flex flex-col items-center"
              >
                <PhoneFrame className="mb-6">
                  <img
                    src={screen.src}
                    alt={screen.label}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {/* Fallback placeholder */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cream to-pearl flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="w-10 h-10 rounded-full bg-tangerine/10 flex items-center justify-center mx-auto mb-2">
                        <MapPin size={18} className="text-tangerine" />
                      </div>
                      <p className="text-[11px] text-ash font-medium">{screen.label}</p>
                    </div>
                  </div>
                </PhoneFrame>
                <h3 className="text-[17px] font-bold text-ink mb-1">{screen.label}</h3>
                <p className="text-[13px] text-smoke text-center max-w-[260px] leading-relaxed">{screen.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ BEFORE / AFTER COMPARISON ════════ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 py-24 md:py-36">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-[30px] md:text-[44px] font-extrabold text-ink tracking-tight mb-4">
            Traditional vs Reeltor
          </h2>
          <p className="text-[16px] md:text-[18px] text-smoke">What your link in bio could actually be.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[620px] mx-auto"
        >
          <div className="bg-white rounded-[24px] shadow-sm border border-border-light overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 border-b border-border-light">
              <div className="p-4 md:p-5" />
              <div className="p-4 md:p-5 text-center border-x border-border-light">
                <p className="text-[11px] text-smoke font-semibold uppercase tracking-wider">Before</p>
                <p className="text-[14px] font-bold text-ash">Traditional</p>
              </div>
              <div className="p-4 md:p-5 text-center bg-tangerine-soft">
                <p className="text-[11px] text-tangerine font-semibold uppercase tracking-wider">After</p>
                <p className="text-[14px] font-bold text-tangerine">Reeltor</p>
              </div>
            </div>

            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i < COMPARISON.length - 1 ? 'border-b border-border-light' : ''}`}>
                <div className="p-3 md:p-4 flex items-center">
                  <p className="text-[13px] md:text-[14px] text-ink font-medium">{row.feature}</p>
                </div>
                <div className="p-3 md:p-4 flex items-center justify-center border-x border-border-light">
                  {row.traditional ? (
                    <Check size={16} className="text-ash" />
                  ) : (
                    <span className="w-4 h-0.5 bg-pearl rounded" />
                  )}
                </div>
                <div className="p-3 md:p-4 flex items-center justify-center bg-tangerine-soft/50">
                  <Check size={16} className="text-tangerine" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ════════ BOTTOM CTA ════════ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pb-24 md:pb-36">
        <div className="bg-gradient-to-br from-midnight to-obsidian rounded-[28px] p-10 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-tangerine/8 rounded-full blur-[100px]" />
          </div>
          <div className="relative">
            <h2 className="text-[28px] md:text-[48px] font-extrabold text-white tracking-tight mb-4">
              Your neighborhood is waiting.
            </h2>
            <p className="text-[16px] md:text-[18px] text-mist mb-10 max-w-[460px] mx-auto">
              Free to start. Pro when you're ready. Claim your link in 30 seconds.
            </p>
            <Button variant="primary" size="xl" onClick={() => navigate('/sign-up')} iconRight={<ArrowRight size={18} />}>
              Claim your Reeltor
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
