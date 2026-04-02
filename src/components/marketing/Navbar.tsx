import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthModalStore } from '@/stores/authModalStore'
import { useAuthStore } from '@/stores/authStore'

const NAV_LINKS = [
  { label: 'For Agents', to: '/for-agents' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Explore', to: '/explore' },
  { label: 'About', to: '/about' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { open: openAuth } = useAuthModalStore()
  const { userDoc } = useAuthStore()

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 20) setVisible(true)
      else if (currentY > lastScrollY.current + 8) setVisible(false)
      else if (currentY < lastScrollY.current - 8) setVisible(true)
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const handleSignIn = () => {
    setMobileOpen(false)
    if (isMobile) openAuth('login')
    else navigate('/sign-in')
  }

  const handleGetStarted = () => {
    setMobileOpen(false)
    if (isMobile) openAuth('signup')
    else navigate('/sign-up')
  }

  return (
    <>
      <motion.nav
        initial={false}
        animate={{ y: visible ? 0 : -80 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-[70] bg-ivory/80 backdrop-blur-xl border-b border-border-light"
      >
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <img src="/reelst-logo.png" alt="Reelst" className="w-7 h-7 md:w-8 md:h-8" />
            <span className="text-[18px] md:text-[20px] font-extrabold text-ink tracking-tight">Reelst</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to}
                className={`px-4 py-2 rounded-xl text-[14px] font-medium transition-colors ${pathname === link.to ? 'text-tangerine bg-tangerine-soft' : 'text-graphite hover:text-ink hover:bg-cream'}`}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {userDoc ? (
              <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/sign-in')}>Sign in</Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/sign-up')}>Get started</Button>
              </>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-ink hover:bg-cream">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-14 left-0 right-0 z-[65] bg-ivory border-b border-border-light shadow-lg md:hidden">
            <div className="px-5 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[15px] font-medium ${pathname === link.to ? 'text-tangerine bg-tangerine-soft' : 'text-graphite'}`}>
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 flex gap-3">
                {userDoc ? (
                  <Button variant="primary" size="lg" fullWidth onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}>Dashboard</Button>
                ) : (
                  <>
                    <Button variant="secondary" size="lg" className="flex-1" onClick={handleSignIn}>Sign in</Button>
                    <Button variant="primary" size="lg" className="flex-1" onClick={handleGetStarted}>Get started</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
