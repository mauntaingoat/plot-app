import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, ArrowUpRight, ChevronDown, Mail } from 'lucide-react'
import { useAuthModalStore } from '@/stores/authModalStore'
import { useAuthStore } from '@/stores/authStore'
import {
  InstagramLogo,
  TikTokLogo,
  YouTubeLogo,
  LinkedInLogo,
} from '@/components/icons/PlatformLogos'

function XLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#0A0E17" />
      <path
        d="M16.5 5.5h2.4l-5.25 6 6.18 7h-4.84l-3.79-4.96L6.85 18.5H4.45l5.62-6.42L4.13 5.5h4.96l3.43 4.54L16.5 5.5zm-.85 11.06h1.33L8.45 6.86H7.02l8.63 9.7z"
        fill="white"
      />
    </svg>
  )
}

type Channel = {
  href: string
  title: string
  tagline: string
  icon: React.ReactNode
  external?: boolean
}

const COMMUNITY_CHANNELS: Channel[] = [
  {
    href: 'https://instagram.com/reelst',
    title: 'Instagram',
    tagline: 'Daily reels and pin drops',
    icon: <InstagramLogo size={22} />,
    external: true,
  },
  {
    href: 'https://tiktok.com/@reelst',
    title: 'TikTok',
    tagline: 'See agents in the wild',
    icon: <TikTokLogo size={22} />,
    external: true,
  },
  {
    href: 'https://youtube.com/@reelst',
    title: 'YouTube',
    tagline: 'Walkthroughs and deep dives',
    icon: <YouTubeLogo size={22} />,
    external: true,
  },
  {
    href: 'https://x.com/reelst',
    title: 'X',
    tagline: 'Product launches and news',
    icon: <XLogo size={22} />,
    external: true,
  },
  {
    href: 'https://linkedin.com/company/reelst',
    title: 'LinkedIn',
    tagline: 'Hiring and team updates',
    icon: <LinkedInLogo size={22} />,
    external: true,
  },
  {
    href: 'mailto:hello@reelst.co',
    title: 'Email',
    tagline: 'Say hello — hello@reelst.co',
    icon: (
      <div
        className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center"
        style={{ background: 'var(--brand-grad)' }}
      >
        <Mail size={13} color="white" strokeWidth={2.4} />
      </div>
    ),
  },
]

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
              <NavLink to="/about" active={pathname === '/about'}>
                About
              </NavLink>
              <NavLink to="/pricing" active={pathname === '/pricing'}>
                Pricing
              </NavLink>
              <NavLink to="/blog" active={pathname.startsWith('/blog')}>
                Blog
              </NavLink>
              <CommunityDropdown />
            </div>

            {/* Right cluster — desktop */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {userDoc ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="brand-btn h-11 px-5 rounded-full text-[14px] cursor-pointer flex items-center gap-1.5"
                  style={{
                    fontFamily: 'var(--font-humanist)',
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
                    style={{
                      fontFamily: 'var(--font-humanist)',
                      fontWeight: 500,
                    }}
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
                      fontFamily: 'var(--font-humanist)',
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
                    fontFamily: 'var(--font-humanist)',
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
            to="/about"
            onClick={() => setMobileOpen(false)}
            className={`block px-4 py-3 rounded-xl text-[15px] ${
              pathname === '/about' ? 'brand-grad-text' : 'text-graphite'
            }`}
            style={{ fontWeight: 500 }}
          >
            About
          </Link>
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
          <Link
            to="/blog"
            onClick={() => setMobileOpen(false)}
            className={`block px-4 py-3 rounded-xl text-[15px] ${
              pathname.startsWith('/blog') ? 'brand-grad-text' : 'text-graphite'
            }`}
            style={{ fontWeight: 500 }}
          >
            Blog
          </Link>
          <div className="pt-2">
            <p
              className="px-4 pb-1 text-[11px] uppercase tracking-[0.12em] text-smoke/80"
              style={{ fontWeight: 600 }}
            >
              Community
            </p>
            <div className="space-y-0.5">
              {COMMUNITY_CHANNELS.map((c) => (
                <a
                  key={c.title}
                  href={c.href}
                  target={c.external ? '_blank' : undefined}
                  rel={c.external ? 'noopener noreferrer' : undefined}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-black/[0.03] transition-colors"
                >
                  <span
                    className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0 border border-black/[0.05]"
                    style={{
                      boxShadow:
                        '0 1px 0 rgba(255,255,255,0.85) inset, 0 4px 14px -10px rgba(217,74,31,0.22)',
                    }}
                  >
                    {c.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-ink"
                      style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.005em' }}
                    >
                      {c.title}
                    </span>
                    <span
                      className="block text-smoke truncate"
                      style={{ fontSize: '12px', fontWeight: 400 }}
                    >
                      {c.tagline}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
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

/* ────────────────────────────────────────────────────────────────
   CommunityDropdown — hover-revealed channel list (Huly-flavored).
   Trigger is a NavLink-shaped button; panel drops below with the
   same row geometry as the Community section: cream squircle ·
   brand glyph · title · tagline · ArrowUpRight on hover.
   Open/close has a small grace timer so moving cursor from trigger
   into panel doesn't snap-close it.
   ──────────────────────────────────────────────────────────────── */
function CommunityDropdown() {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const queueClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }
  const openNow = () => {
    cancelClose()
    setOpen(true)
  }

  return (
    <div
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={queueClose}
      onFocus={openNow}
      onBlur={queueClose}
    >
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative h-11 px-4 inline-flex items-center gap-1 rounded-[14px] text-graphite hover:text-ink transition-colors cursor-pointer select-none"
        style={{ fontWeight: 500, fontSize: '14.5px', letterSpacing: 'normal', lineHeight: 1 }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: 'rgba(10,14,23,0.05)' }}
        />
        <span className="relative">Community</span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          className="relative transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>

      {/* Hover bridge — invisible strip between trigger and panel so
          the cursor can travel without leaving hover state. */}
      <span
        aria-hidden
        className="absolute left-0 right-0 top-full h-3"
        style={{ pointerEvents: open ? 'auto' : 'none' }}
      />

      <div
        role="menu"
        className="absolute left-0 top-[calc(100%+10px)] w-[360px] rounded-[20px] p-2 will-change-transform"
        style={{
          backgroundColor: 'rgba(255,255,255,0.96)',
          border: '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow:
            '0 24px 60px -28px rgba(10,14,23,0.22), 0 12px 28px -22px rgba(217,74,31,0.18), 0 1px 0 rgba(255,255,255,0.95) inset',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          pointerEvents: open ? 'auto' : 'none',
          transition:
            'opacity 0.18s ease, transform 0.22s cubic-bezier(0.25, 0.1, 0.25, 1)',
          fontFamily: 'var(--font-humanist)',
        }}
      >
        {COMMUNITY_CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.external ? '_blank' : undefined}
            rel={c.external ? 'noopener noreferrer' : undefined}
            role="menuitem"
            className="group/row relative flex items-center gap-3 px-2.5 py-2.5 rounded-[14px] transition-colors hover:bg-black/[0.04]"
          >
            <span
              className="w-10 h-10 rounded-[12px] bg-white flex items-center justify-center shrink-0 border border-black/[0.05] transition-transform duration-200 group-hover/row:scale-[1.04]"
              style={{
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.85) inset, 0 6px 18px -12px rgba(217,74,31,0.22)',
              }}
            >
              {c.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className="block text-ink"
                style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.005em' }}
              >
                {c.title}
              </span>
              <span
                className="block text-smoke truncate"
                style={{ fontSize: '12.5px', fontWeight: 400, letterSpacing: '-0.005em' }}
              >
                {c.tagline}
              </span>
            </span>
            <ArrowUpRight
              size={15}
              strokeWidth={2.25}
              className="shrink-0 text-ash transition-all duration-200 group-hover/row:text-tangerine group-hover/row:-translate-y-0.5 group-hover/row:translate-x-0.5"
            />
          </a>
        ))}
      </div>
    </div>
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
