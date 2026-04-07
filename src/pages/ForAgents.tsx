import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapPin, Play, Radio, Home, BadgeCheck, BarChart3, Users, Link2, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const FEATURES = [
  { icon: MapPin, title: 'Listing Pins', desc: 'Every active listing pinned to its exact address. Price, photos, specs — all visible on your map.', color: '#3B82F6' },
  { icon: Play, title: 'Reels & Stories', desc: 'Post vertical video content tied to addresses. Stories vanish in 24 hours. Reels stay forever.', color: '#A855F7' },
  { icon: Radio, title: 'Go Live', desc: 'Broadcast open houses and walkthroughs live from any address. Viewers see you on the map in real-time.', color: '#FF3B30' },
  { icon: Home, title: 'Open Houses', desc: 'Pulsating pins with date, time, and price. Automatically expire when the event ends.', color: '#FFAA00' },
  { icon: BadgeCheck, title: 'Sold Pins', desc: 'Showcase your track record. Every sale stays on your map as social proof.', color: '#34C759' },
  { icon: BarChart3, title: 'Analytics', desc: 'Views, taps, saves, followers — track what\'s working across all your content week over week.', color: '#FF6B3D' },
  { icon: Users, title: 'Audience Tools', desc: 'See your followers, connected platforms, and growing audience in one place.', color: '#3B82F6' },
  { icon: Link2, title: 'One Link', desc: 'reel.st/you — put it in your Instagram bio, email signature, business card, everywhere.', color: '#FF6B3D' },
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

export default function ForAgents() {
  const navigate = useNavigate()
  useScrollReveal()

  return (
    <MarketingLayout>
      <SEOHead title="For Agents" description="The modern real estate agent's profile. Map pins, reels, stories, live streams, analytics — all in one link." path="/for-agents" />

      {/* Hero — above fold, Framer for initial load */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tangerine/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-16 md:pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tangerine-soft text-tangerine text-[12px] font-bold uppercase tracking-wider mb-5">Built for agents</span>
            <h1 className="text-[32px] md:text-[52px] lg:text-[60px] font-extrabold text-ink tracking-tight leading-[1.08] mb-5 max-w-[700px] mx-auto">
              Your listings deserve more than a{' '}<span className="text-gradient">link in bio.</span>
            </h1>
            <p className="text-[16px] md:text-[19px] text-smoke max-w-[540px] mx-auto mb-8">
              Reelst gives you an interactive map profile where every piece of content lives at a real address. Homebuyers don't just see your listings — they explore your neighborhood.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" size="xl" onClick={() => navigate('/sign-up')} iconRight={<ArrowRight size={18} />}>Claim your Reelst — free</Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/pricing')}>View pricing</Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features — CSS scroll reveal */}
      <section className="below-fold max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="reveal text-center mb-14">
          <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Everything you need</h2>
          <p className="text-[15px] md:text-[17px] text-smoke max-w-[480px] mx-auto">Pin it, film it, stream it, track it. All from one dashboard.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="reveal bg-cream rounded-[20px] p-6" data-delay={Math.min(i + 1, 7)}>
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ backgroundColor: `${f.color}15` }}>
                  <Icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-[15px] font-bold text-ink mb-1">{f.title}</h3>
                <p className="text-[13px] text-smoke leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Comparison — CSS scroll reveal */}
      <section className="below-fold bg-cream/50 border-y border-border-light">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="reveal text-center mb-14">
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Traditional vs Reelst</h2>
            <p className="text-[15px] md:text-[17px] text-smoke">What your link in bio could actually be.</p>
          </div>
          <div className="reveal max-w-[600px] mx-auto bg-white rounded-[24px] shadow-sm border border-border-light overflow-hidden" data-delay="1">
            <div className="grid grid-cols-3 border-b border-border-light">
              <div className="p-4 md:p-5" />
              <div className="p-4 md:p-5 text-center border-x border-border-light">
                <p className="text-[12px] text-smoke font-semibold uppercase tracking-wider">Before</p>
                <p className="text-[14px] font-bold text-ash">Traditional</p>
              </div>
              <div className="p-4 md:p-5 text-center bg-tangerine-soft">
                <p className="text-[12px] text-tangerine font-semibold uppercase tracking-wider">After</p>
                <p className="text-[14px] font-bold text-tangerine">Reelst</p>
              </div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i < COMPARISON.length - 1 ? 'border-b border-border-light' : ''}`}>
                <div className="p-3 md:p-4 flex items-center"><p className="text-[13px] md:text-[14px] text-ink font-medium">{row.feature}</p></div>
                <div className="p-3 md:p-4 flex items-center justify-center border-x border-border-light">
                  {row.traditional ? <Check size={16} className="text-ash" /> : <span className="w-4 h-0.5 bg-pearl rounded" />}
                </div>
                <div className="p-3 md:p-4 flex items-center justify-center bg-tangerine-soft/50"><Check size={16} className="text-tangerine" /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="below-fold max-w-[1200px] mx-auto px-5 md:px-8 pb-20 md:pb-28 pt-20 md:pt-28">
        <div className="reveal bg-gradient-to-br from-midnight to-obsidian rounded-[28px] p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-tangerine/8 rounded-full blur-[100px]" /></div>
          <div className="relative">
            <h2 className="text-[24px] md:text-[40px] font-extrabold text-white tracking-tight mb-3">Your neighborhood is waiting.</h2>
            <p className="text-[15px] md:text-[17px] text-mist mb-8 max-w-[440px] mx-auto">Free to start. Pro when you're ready. Claim your link in 30 seconds.</p>
            <Button variant="primary" size="xl" onClick={() => navigate('/sign-up')} iconRight={<ArrowRight size={18} />}>Claim your Reelst</Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
