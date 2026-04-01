import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapPin, ArrowRight, Sparkles, Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useAuthStore } from '@/stores/authStore'
import { firebaseConfigured } from '@/config/firebase'
import { MOCK_AGENTS } from '@/lib/mock'
import type { UserDoc } from '@/lib/types'

export default function Home() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  const [agents] = useState<UserDoc[]>(MOCK_AGENTS)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')

  // If already signed in agent, go to dashboard
  useEffect(() => {
    if (userDoc?.role === 'agent' && userDoc.onboardingComplete) {
      navigate('/dashboard', { replace: true })
    }
  }, [userDoc, navigate])

  const handleClaimPlot = () => {
    setAuthMode('signup')
    setShowAuth(true)
  }

  const handleSignIn = () => {
    setAuthMode('login')
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-tangerine/8 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-ember/6 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        </div>

        <div className="relative px-6 pt-[calc(env(safe-area-inset-top,20px)+20px)] pb-12">
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-16"
          >
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Reeltor" className="w-8 h-8" />
              <span className="text-[20px] font-extrabold text-ink tracking-tight">Reeltor</span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleSignIn}>
              Sign in
            </Button>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: 'spring', damping: 25 }}
            className="max-w-[340px]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="story">
                <Sparkles size={12} /> New
              </Badge>
            </div>

            <h1 className="text-[42px] font-extrabold text-ink tracking-tight leading-[1.05] mb-4">
              Your neighborhood,{' '}
              <span className="text-gradient">plotted.</span>
            </h1>

            <p className="text-[17px] text-smoke leading-relaxed mb-8">
              One link. A live map of your listings, stories, reels, and open houses. Built for agents who move fast.
            </p>

            <div className="flex gap-3">
              <Button
                variant="primary"
                size="xl"
                onClick={handleClaimPlot}
                iconRight={<ArrowRight size={18} />}
                className="flex-1"
              >
                Claim your Reeltor
              </Button>
              <Button
                variant="secondary"
                size="xl"
                icon={<Compass size={18} />}
                onClick={() => navigate('/carolina')}
              />
            </div>
          </motion.div>

          {/* Map preview — tappable to Carolina's profile */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ delay: 0.4, type: 'spring', damping: 20 }}
            className="mt-8 bg-obsidian rounded-[24px] overflow-hidden shadow-xl border border-border-dark aspect-[4/3] relative cursor-pointer"
            onClick={() => navigate('/carolina')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#0C1E35] via-[#0F2847] to-[#0A1628]">
              {[
                { x: 30, y: 25, color: '#3B82F6', size: 10 },
                { x: 55, y: 40, color: '#FF6B3D', size: 14 },
                { x: 70, y: 30, color: '#34C759', size: 10 },
                { x: 25, y: 60, color: '#FF3B30', size: 12 },
                { x: 65, y: 65, color: '#FFAA00', size: 10 },
                { x: 45, y: 75, color: '#A855F7', size: 12 },
                { x: 80, y: 55, color: '#3B82F6', size: 10 },
              ].map((pin, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.08, type: 'spring', damping: 12 }}
                  className="absolute rounded-full"
                  style={{
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    width: pin.size,
                    height: pin.size,
                    background: pin.color,
                    boxShadow: `0 0 12px ${pin.color}60`,
                  }}
                />
              ))}
              <div className="absolute bottom-4 left-4 right-4 glass-heavy rounded-[16px] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tangerine to-ember" />
                <div className="flex-1">
                  <div className="h-3 w-24 bg-white/20 rounded-full" />
                  <div className="h-2 w-16 bg-white/10 rounded-full mt-1.5" />
                </div>
                <div className="h-3 w-12 bg-tangerine/30 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-[28px] font-extrabold text-ink tracking-tight mb-2">
            Three steps to your Reeltor
          </h2>
          <p className="text-[15px] text-smoke">Set up in under 2 minutes.</p>
        </motion.div>

        <div className="space-y-4">
          {[
            { step: '01', title: 'Claim your link', desc: 'Pick a username. Your Reeltor lives at reeltor.co/you.' },
            { step: '02', title: 'Drop pins', desc: 'Add listings, stories, reels, and open houses to your map.' },
            { step: '03', title: 'Share everywhere', desc: 'Put your Reeltor link in your bio, emails, and cards.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex gap-4 bg-cream rounded-[18px] p-5"
            >
              <span className="text-[36px] font-extrabold text-tangerine/20 leading-none shrink-0 font-mono">
                {item.step}
              </span>
              <div>
                <h3 className="text-[16px] font-bold text-ink mb-0.5">{item.title}</h3>
                <p className="text-[14px] text-smoke leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured agents */}
      <section className="py-12">
        <div className="px-6 mb-5">
          <h2 className="text-[22px] font-extrabold text-ink tracking-tight">Featured agents</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto px-6 pb-4">
          {agents.map((agent, i) => (
            <motion.button
              key={agent.uid}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/${agent.username}`)}
              className="shrink-0 w-[160px] bg-cream rounded-[18px] p-4 flex flex-col items-center gap-2 text-center cursor-pointer"
            >
              <Avatar src={agent.photoURL} name={agent.displayName} size={56} ring="story" />
              <p className="text-[14px] font-bold text-ink truncate w-full">{agent.displayName}</p>
              <p className="text-[12px] text-smoke">@{agent.username}</p>
              <p className="text-[11px] text-ash">{agent.followerCount} followers</p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-midnight to-obsidian rounded-[24px] p-8 text-center">
          <img src="/favicon.svg" alt="Reeltor" className="w-14 h-14 mx-auto mb-5" />
          <h2 className="text-[24px] font-extrabold text-white tracking-tight mb-2">
            Ready to get plotted?
          </h2>
          <p className="text-[15px] text-mist mb-6">
            Join agents who are turning their Instagram bio into a live map.
          </p>
          <Button
            variant="primary"
            size="xl"
            onClick={handleClaimPlot}
            iconRight={<ArrowRight size={18} />}
          >
            Claim your Reeltor — free
          </Button>
        </div>
      </section>

      <footer className="px-6 py-8 text-center border-t border-border-light">
        <p className="text-[12px] text-ash">&copy; {new Date().getFullYear()} Reeltor. All rights reserved.</p>
      </footer>

      {/* Auth sheet */}
      <AuthSheet
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        mode={authMode}
      />
    </div>
  )
}
