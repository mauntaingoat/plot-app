import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight } from 'lucide-react'
import { useAuthModalStore } from '@/stores/authModalStore'
import { useAuthStore } from '@/stores/authStore'

/*
 * Clay-style full-width nav. Not a floating pill — sits flush across the
 * top on an off-white bar with a soft downward shadow for the 3D float.
 * Auto-hides on scroll-down, returns on scroll-up.
 */
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
      setScrolled(currentY > 12)
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
      <header
        className="fixed top-0 left-0 right-0 z-[70] will-change-transform"
        style={{
          transform: hidden ? 'translateY(-120%)' : 'translateY(0)',
          transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          fontFamily: 'var(--font-humanist)',
        }}
      >
        <nav
          className="w-full transition-[background-color,box-shadow] duration-300"
          style={{
            /* Match the marketing page bg exactly — nav is seamless, no border.
               On scroll, a very faint shadow hints at depth without introducing
               a visible color seam. */
            backgroundColor: scrolled
              ? 'rgba(246, 241, 233, 0.92)'
              : 'rgba(246, 241, 233, 0.0)',
            backdropFilter: scrolled ? 'blur(18px) saturate(180%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(180%)' : 'none',
            boxShadow: scrolled
              ? '0 10px 32px -20px rgba(10,14,23,0.14)'
              : 'none',
          }}
        >
          <div className="max-w-[1320px] mx-auto px-4 md:px-6 h-[68px] md:h-[78px] flex items-center justify-between gap-8">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 shrink-0 group"
              aria-label="Reelst home"
            >
              <img
                src="/reelst-logo.png"
                alt=""
                className="w-8 h-8 md:w-9 md:h-9 transition-transform duration-300 group-hover:rotate-[-6deg]"
              />
              <span
                className="text-[20px] md:text-[22px] text-ink tracking-[-0.02em]"
                style={{ fontWeight: 600 }}
              >
                Reelst
              </span>
            </Link>

            {/* Center — desktop links */}
            <div className="hidden md:flex items-center gap-0.5 flex-1 justify-start pl-6">
              <NavLink to="/#features">Features</NavLink>
              <NavLink to="/#closer-look">Explore</NavLink>
              <NavLink to="/pricing" active={pathname === '/pricing'}>
                Pricing
              </NavLink>
            </div>

            {/* Right cluster — desktop */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {userDoc ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="brand-btn h-11 px-5 rounded-full text-[14px] cursor-pointer flex items-center gap-1.5"
                  style={{
                    fontWeight: 600,
                    boxShadow:
                      '0 6px 18px -4px rgba(217,74,31,0.45), inset 0 1px 0 rgba(255,255,255,0.24)',
                  }}
                >
                  Dashboard
                  <ArrowRight size={15} strokeWidth={2.25} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/sign-in')}
                    className="group relative h-11 px-4 rounded-[14px] inline-flex items-center text-[14px] text-graphite hover:text-ink transition-colors cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ backgroundColor: 'rgba(10,14,23,0.05)' }}
                    />
                    <span className="relative">Sign in</span>
                  </button>
                  <span aria-hidden className="w-px h-5 bg-ink/15" />
                  <button
                    onClick={() => navigate('/sign-up')}
                    className="brand-btn h-11 px-5 rounded-full text-[14px] cursor-pointer flex items-center gap-1.5"
                    style={{
                      fontWeight: 600,
                      boxShadow:
                        '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
                    }}
                  >
                    Get started
                    <ArrowRight size={15} strokeWidth={2.25} />
                  </button>
                </>
              )}
            </div>

            {/* Right cluster — mobile */}
            <div className="md:hidden flex items-center gap-2">
              {!userDoc && (
                <button
                  onClick={() => navigate('/sign-up')}
                  className="brand-btn h-10 px-4 rounded-full text-[13px] cursor-pointer flex items-center gap-1"
                  style={{
                    fontWeight: 600,
                    boxShadow:
                      '0 6px 16px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
                  }}
                >
                  Start
                  <ArrowRight size={13} strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-black/[0.05] transition-colors cursor-pointer"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile dropdown */}
      <div
        className="fixed top-[80px] left-4 right-4 z-[65] bg-ivory/95 backdrop-blur-2xl border border-black/[0.06] rounded-[20px] shadow-xl md:hidden will-change-transform"
        style={{
          transform: mobileOpen ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.97)',
          opacity: mobileOpen ? 1 : 0,
          transition: 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s ease',
          pointerEvents: mobileOpen ? 'auto' : 'none',
          fontFamily: 'var(--font-humanist)',
        }}
      >
        <div className="px-3 py-3 space-y-1">
          <Link
            to="/pricing"
            onClick={() => setMobileOpen(false)}
            className={`block px-4 py-3 rounded-xl text-[15px] ${
              pathname === '/pricing' ? 'brand-grad-text' : 'text-graphite'
            }`}
            style={{ fontWeight: 500 }}
          >
            Pricing
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false)
              if (isMobile) openAuth('login')
              else navigate('/sign-in')
            }}
            className="block w-full text-left px-4 py-3 rounded-xl text-[15px] text-graphite cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            Sign in
          </button>
        </div>
      </div>
    </>
  )
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string
  active?: boolean
  children: React.ReactNode
}) {
  /*
   * Clay-style hover: a soft rounded rectangle appears behind the
   * item, sized to the item's text. We render it as an absolute
   * `::before` via an inline span — drives background opacity so
   * the pill fades in/out smoothly on hover (no layout shift).
   */
  return (
    <Link
      to={to}
      className={`group relative h-11 px-4 inline-flex items-center rounded-[14px] text-[14.5px] transition-colors ${
        active ? 'text-ink' : 'text-graphite hover:text-ink'
      }`}
      style={{ fontWeight: active ? 600 : 500 }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[14px] transition-[background-color,transform] duration-200 ease-out"
        style={{
          backgroundColor: active ? 'rgba(10,14,23,0.055)' : 'transparent',
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: 'rgba(10,14,23,0.05)' }}
      />
      <span className="relative">{children}</span>
    </Link>
  )
}
