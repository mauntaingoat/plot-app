import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Play, BarChart3, Users, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { MOCK_AGENTS } from '@/lib/mock'

const FEATURES = [
  { icon: MapPin, title: 'Map Pins', desc: 'Every listing, open house, and story — pinned to a real address.' },
  { icon: Play, title: 'Reels & Stories', desc: 'Full-screen video content that auto-plays as homebuyers scroll your map.' },
  { icon: BarChart3, title: 'Agent Analytics', desc: 'Views, taps, saves, followers — know what\'s working.' },
  { icon: Users, title: 'Audience Growth', desc: 'Followers, connected platforms, one link to rule them all.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  const { open: openAuth } = useAuthModalStore()
  const agents = MOCK_AGENTS
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Initialize scroll reveals for below-fold content
  useScrollReveal()

  function handleClaimClick() {
    if (isMobile) openAuth('signup')
    else navigate('/sign-up')
  }

  useEffect(() => {
    if (userDoc?.role === 'agent' && userDoc.onboardingComplete) navigate('/dashboard', { replace: true })
  }, [userDoc, navigate])

  return (
    <MarketingLayout>
      <SEOHead path="/" />

      {/* ════════ HERO — above fold, uses Framer for initial load only ════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] md:w-[800px] md:h-[800px] bg-tangerine/6 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-ember/4 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-12 md:pt-24 pb-16 md:pb-28">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Hero copy — Framer for initial page load (above fold) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-[36px] md:text-[56px] lg:text-[64px] font-extrabold text-ink tracking-tight leading-[1.05] mb-5">
                Where listings{' '}
                <span className="text-gradient">come alive.</span>
              </h1>
              <p className="text-[13px] text-smoke/70 font-medium tracking-wide mb-3">ree·list — because the agents here are the realest you'll find.</p>
              <p className="text-[16px] md:text-[19px] text-smoke leading-relaxed mb-8 max-w-[480px]">
                One link. A live map of your listings, stories, reels, and open houses. The modern agent's profile, built for content.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button variant="primary" size="xl" onClick={handleClaimClick} iconRight={<ArrowRight size={18} />}>
                  Claim your Reelst
                </Button>
                <Button variant="secondary" size="xl" onClick={() => navigate('/explore')} icon={<Globe size={18} />}>
                  Explore agents
                </Button>
              </div>
              <p className="text-[13px] text-ash">Free forever. No credit card required.</p>
            </motion.div>

            {/* Hero visual — Framer for initial load */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <div className="bg-obsidian rounded-[24px] overflow-hidden shadow-2xl border border-border-dark aspect-[9/16] max-h-[520px] md:max-h-[600px] relative mx-auto max-w-[320px] md:max-w-[340px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0C1E35] via-[#0F2847] to-[#0A1628]">
                  {[
                    { x: 20, y: 15, color: '#3B82F6', s: 12 }, { x: 55, y: 25, color: '#FF6B3D', s: 16 },
                    { x: 75, y: 18, color: '#34C759', s: 12 }, { x: 15, y: 45, color: '#FF3B30', s: 14 },
                    { x: 60, y: 55, color: '#FFAA00', s: 12 }, { x: 40, y: 70, color: '#A855F7', s: 14 },
                    { x: 80, y: 42, color: '#3B82F6', s: 12 }, { x: 35, y: 35, color: '#34C759', s: 10 },
                  ].map((pin, i) => (
                    <div key={i} className="absolute rounded-full animate-[fadeIn_0.3s_ease_forwards]"
                      style={{ left: `${pin.x}%`, top: `${pin.y}%`, width: pin.s, height: pin.s, background: pin.color, boxShadow: `0 0 14px ${pin.color}50`, animationDelay: `${0.4 + i * 0.05}s`, opacity: 0 }} />
                  ))}
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full flex items-center gap-2 pl-1.5 pr-3 py-1.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tangerine to-ember" />
                      <div className="flex-1"><div className="h-2.5 w-20 bg-white/20 rounded-full" /><div className="h-2 w-14 bg-white/10 rounded-full mt-1" /></div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-16 pb-4 px-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
                      <div className="flex gap-2"><div className="w-16 h-16 rounded-xl bg-white/10" /><div className="flex-1"><div className="h-3 w-24 bg-white/20 rounded-full" /><div className="h-2 w-16 bg-white/10 rounded-full mt-2" /><div className="h-2 w-20 bg-white/10 rounded-full mt-1" /></div></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badges — CSS animation, no Framer */}
              <div className="absolute -left-4 md:-left-12 top-1/4 bg-white rounded-2xl shadow-xl p-3 border border-border-light animate-[fadeIn_0.4s_ease_0.8s_forwards]" style={{ opacity: 0 }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-sold-green/15 flex items-center justify-center"><span className="text-sold-green text-[14px] font-bold">$</span></div>
                  <div><p className="text-[11px] font-bold text-ink">SOLD $1.2M</p><p className="text-[9px] text-smoke">Coral Gables</p></div>
                </div>
              </div>
              <div className="absolute -right-4 md:-right-8 top-2/3 bg-white rounded-2xl shadow-xl p-3 border border-border-light animate-[fadeIn_0.4s_ease_1s_forwards]" style={{ opacity: 0 }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-live-red/15 flex items-center justify-center"><Play size={12} className="text-live-red" /></div>
                  <div><p className="text-[11px] font-bold text-ink">LIVE NOW</p><p className="text-[9px] text-smoke">23 watching</p></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════ FEATURES — CSS scroll reveal (GPU compositor) ════════ */}
      <section className="below-fold max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="reveal text-center mb-14">
          <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Everything an agent needs. One link.</h2>
          <p className="text-[15px] md:text-[17px] text-smoke max-w-[520px] mx-auto">Pin listings to real addresses. Post stories and reels. Go live from open houses. All on your map.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div key={i} className="reveal bg-cream rounded-[20px] p-6 md:p-7 group hover:bg-tangerine-soft transition-colors duration-300" data-delay={i + 1}>
                <div className="w-12 h-12 rounded-[14px] bg-tangerine/10 flex items-center justify-center mb-4 group-hover:bg-tangerine/20 transition-colors"><Icon size={22} className="text-tangerine" /></div>
                <h3 className="text-[16px] md:text-[17px] font-bold text-ink mb-1.5">{feature.title}</h3>
                <p className="text-[13px] md:text-[14px] text-smoke leading-relaxed">{feature.desc}</p>
              </div>
            )
          })}
        </div>
        <div className="reveal text-center mt-10" data-delay="5">
          <Button variant="secondary" size="lg" onClick={() => navigate('/for-agents')} iconRight={<ArrowRight size={16} />}>See all features</Button>
        </div>
      </section>

      {/* ════════ HOW IT WORKS — CSS scroll reveal ════════ */}
      <section className="below-fold bg-cream/50 border-y border-border-light">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="reveal text-center mb-14">
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-ink tracking-tight mb-3">Three steps to your Reelst</h2>
            <p className="text-[15px] md:text-[17px] text-smoke">Set up in under 2 minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { step: '01', title: 'Claim your link', desc: 'Pick a username. Your Reelst lives at reelst.co/you. Share it everywhere.' },
              { step: '02', title: 'Drop pins', desc: 'Add listings, stories, reels, open houses. Each pinned to a real address.' },
              { step: '03', title: 'Grow your audience', desc: 'Homebuyers follow you, save listings, and discover your expertise.' },
            ].map((item, i) => (
              <div key={i} className="reveal bg-white rounded-[20px] p-6 md:p-8 shadow-sm border border-border-light" data-delay={i + 1}>
                <span className="text-[48px] md:text-[56px] font-extrabold text-tangerine/15 leading-none font-mono block mb-3">{item.step}</span>
                <h3 className="text-[18px] md:text-[20px] font-bold text-ink mb-2">{item.title}</h3>
                <p className="text-[14px] md:text-[15px] text-smoke leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURED AGENTS — CSS scroll reveal ════════ */}
      <section className="below-fold max-w-[1200px] mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="reveal flex items-end justify-between mb-8">
          <div>
            <h2 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Featured agents</h2>
            <p className="text-[15px] text-smoke">See how top agents use Reelst.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/explore')} className="hidden md:flex">View all</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {agents.map((agent, i) => (
            <div key={agent.uid} className="reveal-scale cursor-pointer" data-delay={i + 1} onClick={() => navigate(`/${agent.username}`)}>
              <div className="bg-cream rounded-[20px] p-5 md:p-6 flex flex-col items-center gap-3 text-center hover:shadow-md transition-shadow active:scale-[0.97] transition-transform">
                <Avatar src={agent.photoURL} name={agent.displayName} size={64} ring="story" />
                <div><p className="text-[15px] md:text-[16px] font-bold text-ink">{agent.displayName}</p><p className="text-[12px] text-tangerine font-medium">@{agent.username}</p></div>
                <p className="text-[12px] text-smoke line-clamp-2">{agent.bio}</p>
                <p className="text-[11px] text-ash">{agent.followerCount.toLocaleString()} followers</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ BOTTOM CTA ════════ */}
      <section className="below-fold max-w-[1200px] mx-auto px-5 md:px-8 pb-20 md:pb-28">
        <div className="reveal bg-gradient-to-br from-midnight to-obsidian rounded-[28px] p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"><div className="absolute top-0 right-0 w-[300px] h-[300px] bg-tangerine/8 rounded-full blur-[80px]" /></div>
          <div className="relative">
            <img src="/reelst-logo.png" alt="" className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-6" />
            <h2 className="text-[24px] md:text-[40px] font-extrabold text-white tracking-tight mb-3">Ready to go live?</h2>
            <p className="text-[15px] md:text-[17px] text-mist mb-8 max-w-[440px] mx-auto">Join agents who are turning their Instagram bio into a live, interactive map.</p>
            <Button variant="primary" size="xl" onClick={handleClaimClick} iconRight={<ArrowRight size={18} />}>Claim your Reelst — free</Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
