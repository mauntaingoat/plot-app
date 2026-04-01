import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < 10) {
        setVisible(true)
      } else if (currentY > lastScrollY.current) {
        setVisible(false) // scrolling down
      } else {
        setVisible(true) // scrolling up
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={false}
        animate={{ y: visible ? 0 : -80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 right-0 z-[70] bg-ivory/80 backdrop-blur-xl border-b border-border-light"
      >
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <img src="/reeltor-logo-4b.png" alt="Reeltor" className="w-7 h-7 md:w-8 md:h-8" />
            <span className="text-[18px] md:text-[20px] font-extrabold text-ink tracking-tight">Reeltor</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-[14px] font-medium transition-colors ${
                  pathname === link.to
                    ? 'text-tangerine bg-tangerine-soft'
                    : 'text-graphite hover:text-ink hover:bg-cream'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/sign-in')}>
              Sign in
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/sign-up')}>
              Get started
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-ink hover:bg-cream"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-14 left-0 right-0 z-[65] bg-ivory border-b border-border-light shadow-lg md:hidden"
          >
            <div className="px-5 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[15px] font-medium ${
                    pathname === link.to ? 'text-tangerine bg-tangerine-soft' : 'text-graphite'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 flex gap-3">
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => { navigate('/?auth=login'); setMobileOpen(false) }}>
                  Sign in
                </Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={() => { navigate('/?auth=signup'); setMobileOpen(false) }}>
                  Get started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
