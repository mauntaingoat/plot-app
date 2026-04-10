import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { open: openAuth } = useAuthModalStore()
  const { userDoc } = useAuthStore()

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setScrolled(currentY > 20)
      if (currentY < 20) setHidden(false)
      else if (currentY > lastScrollY.current + 10) setHidden(true)
      else if (currentY < lastScrollY.current - 10) setHidden(false)
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <>
      {/* ── Floating pill nav ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[70] flex justify-center will-change-transform"
        style={{
          paddingTop: '12px',
          transform: hidden ? 'translateY(-120%)' : 'translateY(0)',
          transition: 'transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        <nav
          className={`
            flex items-center justify-between gap-2
            h-[58px] md:h-[64px] px-3.5 md:px-5
            rounded-[16px]
            transition-all duration-300
            border-[1.5px] border-tangerine/30
            ${scrolled
              ? 'bg-ivory/90 backdrop-blur-2xl shadow-lg'
              : 'bg-ivory/70 backdrop-blur-xl'
            }
          `}
          style={{
            width: 'min(calc(100vw - 24px), 820px)',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0 pl-2">
            <img src="/reelst-logo.png" alt="Reelst" className="w-8 h-8 md:w-9 md:h-9" />
            <span className="text-[18px] md:text-[20px] font-extrabold text-ink tracking-tight">Reelst</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`
                  px-4 py-2 rounded-full text-[15px] font-medium transition-colors
                  ${pathname === link.to
                    ? 'text-tangerine bg-tangerine-soft'
                    : 'text-graphite hover:text-ink hover:bg-black/[0.04]'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-1.5 pr-0.5">
            {userDoc ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="h-11 px-5.5 rounded-[10px] bg-gradient-to-r from-tangerine to-ember text-white text-[15px] font-bold cursor-pointer hover:brightness-110 transition-all"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/sign-in')}
                  className="h-11 px-4.5 rounded-[10px] text-[15px] font-medium text-graphite hover:text-ink hover:bg-black/[0.04] transition-colors cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/sign-up')}
                  className="h-11 px-5.5 rounded-[10px] bg-gradient-to-r from-tangerine to-ember text-white text-[15px] font-bold cursor-pointer hover:brightness-110 transition-all shadow-glow-tangerine"
                >
                  Get started
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-ink hover:bg-black/[0.04] transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
      </div>

      {/* ── Mobile dropdown (slides from under the pill) ── */}
      <div
        className="fixed top-[72px] left-3 right-3 z-[65] bg-white/95 backdrop-blur-2xl border border-black/[0.06] rounded-[20px] shadow-xl md:hidden will-change-transform"
        style={{
          transform: mobileOpen ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.97)',
          opacity: mobileOpen ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s ease',
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
      >
        <div className="px-4 py-4 space-y-1">
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
          <div className="pt-3 flex gap-2">
            {userDoc ? (
              <Button variant="primary" size="lg" fullWidth onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => { setMobileOpen(false); if (isMobile) openAuth('login'); else navigate('/sign-in') }}>
                  Sign in
                </Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={() => { setMobileOpen(false); if (isMobile) openAuth('signup'); else navigate('/sign-up') }}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
