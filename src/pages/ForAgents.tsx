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
  { icon: BadgeCheck, title: 'Sold Pins', desc: 'Showcase your track record. Every sale stays on your map as social proof.', color: '#34C759' },
  { icon: BarChart3, title: 'Analytics', desc: 'Views, taps, saves, followers — track what\'s working across all your content week over week.', color: '#FF6B3D' },
  { icon: Users, title: 'Audience Tools', desc: 'See your followers, connected platforms, and growing audience in one place.', color: '#3B82F6' },
  { icon: Link2, title: 'One Link', desc: 'reeltor.co/you — put it in your Instagram bio, email signature, business card, everywhere.', color: '#FF6B3D' },
]

const TESTIMONIALS = [
  { name: 'Carolina Reyes', brokerage: 'Compass, Miami', quote: 'My clients find my listings before I even send them the link. The map just makes sense for real estate.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
  { name: 'David Hartman', brokerage: 'Douglas Elliman, Miami', quote: 'I replaced my Linktree with Reeltor and my engagement tripled. People actually explore my content now.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  { name: 'Lucia Fernandez', brokerage: 'The Keyes Company', quote: 'The stories and reels tied to addresses — that\'s what sets this apart. My followers feel like they\'re walking the neighborhood with me.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
]

const COMPARISON = [
  { feature: 'Link in bio', old: true, reeltor: true },
  { feature: 'Interactive map', old: false, reeltor: true },
  { feature: 'Listings on real addresses', old: false, reeltor: true },
  { feature: 'Stories & Reels', old: false, reeltor: true },
  { feature: 'Live streaming', old: false, reeltor: true },
  { feature: 'Follower analytics', old: false, reeltor: true },
  { feature: 'One tap to contact', old: true, reeltor: true },
]

export default function ForAgents() {
  const navigate = useNavigate()

  return (
    <MarketingLayout>
      <SEOHead title="For Agents" description="The modern real estate agent's profile. Map pins, reels, stories, live streams, analytics — all in one link." path="/for-agents" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tangerine/5 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-28 pb-16 md:pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tangerine-soft text-tangerine text-[12px] font-bold uppercase tracking-wider mb-5">
              Built for agents
            </span>
            <h1 className="text-[32px] md:text-[52px] lg:text-[60px] font-extrabold text-ink tracking-tight leading-[1.08] mb-5 max-w-[700px] mx-auto">
              Your listings deserve more than a{' '}
              <span className="text-gradient">link in bio.</span>
            </h1>
            <p className="text-[16px] md:text-[19px] text-smoke max-w-[540px] mx-auto mb-8">
              Reeltor gives you an interactive map profile where every piece of content lives at a real address. Consumers don't just see your listings — they explore your neighborhood.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" size="xl" onClick={() => navigate('/?auth=signup')} iconRight={<ArrowRight size={18} />}>
                Claim your Reeltor — free
              </Button>
              <Button variant="secondary" size="xl" onClick={() => navigate('/pricing')}>
                View pricing
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Everything you need</h2>
          <p className="text-[15px] md:text-[17px] text-smoke max-w-[480px] mx-auto">Pin it, film it, stream it, track it. All from one dashboard.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-cream rounded-[20px] p-6"
              >
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3" style={{ backgroundColor: `${f.color}12` }}>
                  <Icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-[15px] font-bold text-ink mb-1">{f.title}</h3>
                <p className="text-[13px] text-smoke leading-relaxed">{f.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Before / After comparison */}
      <section className="bg-cream/50 border-y border-border-light">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Linktree vs Reeltor</h2>
            <p className="text-[15px] md:text-[17px] text-smoke">What your link in bio could actually be.</p>
          </div>

          <div className="max-w-[600px] mx-auto bg-white rounded-[24px] shadow-sm border border-border-light overflow-hidden">
            <div className="grid grid-cols-3 border-b border-border-light">
              <div className="p-4 md:p-5" />
              <div className="p-4 md:p-5 text-center border-x border-border-light">
                <p className="text-[12px] text-smoke font-semibold uppercase tracking-wider">Before</p>
                <p className="text-[14px] font-bold text-ash">Link in Bio</p>
              </div>
              <div className="p-4 md:p-5 text-center bg-tangerine-soft">
                <p className="text-[12px] text-tangerine font-semibold uppercase tracking-wider">After</p>
                <p className="text-[14px] font-bold text-tangerine">Reeltor</p>
              </div>
            </div>

            {COMPARISON.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 ${i < COMPARISON.length - 1 ? 'border-b border-border-light' : ''}`}>
                <div className="p-3 md:p-4 flex items-center">
                  <p className="text-[13px] md:text-[14px] text-ink font-medium">{row.feature}</p>
                </div>
                <div className="p-3 md:p-4 flex items-center justify-center border-x border-border-light">
                  {row.old ? <Check size={16} className="text-ash" /> : <span className="w-4 h-0.5 bg-pearl rounded" />}
                </div>
                <div className="p-3 md:p-4 flex items-center justify-center bg-tangerine-soft/50">
                  <Check size={16} className="text-tangerine" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Agents love Reeltor</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-cream rounded-[20px] p-6 md:p-7"
            >
              <p className="text-[14px] md:text-[15px] text-graphite leading-relaxed mb-5 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-[13px] font-bold text-ink">{t.name}</p>
                  <p className="text-[11px] text-smoke">{t.brokerage}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pb-20 md:pb-28">
        <div className="bg-gradient-to-br from-midnight to-obsidian rounded-[28px] p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-tangerine/8 rounded-full blur-[100px]" />
          </div>
          <div className="relative">
            <h2 className="text-[24px] md:text-[40px] font-extrabold text-white tracking-tight mb-3">
              Your neighborhood is waiting.
            </h2>
            <p className="text-[15px] md:text-[17px] text-mist mb-8 max-w-[440px] mx-auto">
              Free to start. Pro when you're ready. Claim your link in 30 seconds.
            </p>
            <Button variant="primary" size="xl" onClick={() => navigate('/?auth=signup')} iconRight={<ArrowRight size={18} />}>
              Claim your Reeltor
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
