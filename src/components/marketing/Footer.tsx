import { Link } from 'react-router-dom'

function InstagramGlyph({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer
      className="bg-marketing"
      style={{ fontFamily: 'var(--font-humanist)' }}
    >
      <FooterContent />
    </footer>
  )
}

export function FooterContent() {
  return (
    <div style={{ fontFamily: 'var(--font-humanist)' }}>
      <div className="max-w-[1240px] mx-auto px-6 md:px-10 pt-16 md:pt-20 pb-9">
        {/* ── Top row: brand left, socials right ───────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 md:gap-6 pb-12 md:pb-14 border-b border-black/[0.06]">
          <div className="flex items-start gap-3.5">
            <img src="/reelst-logo.png" alt="Reelst" className="w-11 h-11 mt-0.5" />
            <div>
              <div
                className="text-ink"
                style={{
                  fontSize: 'clamp(2rem, 3.4vw, 2.85rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  lineHeight: 1,
                }}
              >
                Reelst
              </div>
              <p
                className="text-smoke mt-2"
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  letterSpacing: '-0.005em',
                }}
              >
                Your portfolio, your block, your link.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://instagram.com/reelst"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center text-ink/70 hover:text-tangerine hover:border-tangerine/30 transition-colors"
              style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset' }}
            >
              <InstagramGlyph size={17} />
            </a>
            <a
              href="mailto:hello@reelst.co"
              aria-label="Email"
              className="h-10 px-4 rounded-full bg-white border border-black/[0.06] flex items-center text-ink/70 hover:text-tangerine hover:border-tangerine/30 transition-colors text-[13px]"
              style={{
                boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset',
                fontWeight: 500,
                letterSpacing: '-0.005em',
              }}
            >
              hello@reelst.co
            </a>
          </div>
        </div>

        {/* ── Link columns ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8 pt-12 md:pt-14">
          <FooterColumn title="Product">
            <FooterLink to="/about">About</FooterLink>
            <FooterLink to="/pricing">Pricing</FooterLink>
            <FooterLink to="/blog">Blog</FooterLink>
          </FooterColumn>

          <FooterColumn title="For Agents">
            <FooterLink to="/sign-up">Sign up</FooterLink>
            <FooterLink to="/sign-in">Sign in</FooterLink>
            <FooterLink to="/pricing">Plans &amp; tiers</FooterLink>
          </FooterColumn>

          <FooterColumn title="Legal">
            <FooterLink to="/terms">Terms of Use</FooterLink>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
          </FooterColumn>

          <FooterColumn title="Connect">
            <FooterExternal href="https://instagram.com/reelst">@reelst</FooterExternal>
            <FooterExternal href="mailto:hello@reelst.co">hello@reelst.co</FooterExternal>
          </FooterColumn>
        </div>

        {/* ── Bottom row: copyright ────────────────────────────────── */}
        <div
          className="mt-14 md:mt-16 pt-6 border-t border-black/[0.06] flex flex-col md:flex-row items-center justify-between gap-3 text-smoke/80"
          style={{ fontSize: '12.5px', fontWeight: 400, letterSpacing: '-0.005em' }}
        >
          <span>&copy; {new Date().getFullYear()} Avigage LLC DBA Reelst. All rights reserved.</span>
          <span
            className="italic text-smoke/70"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '13px' }}
          >
            Built in Miami
          </span>
        </div>
      </div>
    </div>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <h4
        className="text-ink/85"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </h4>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  )
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-smoke hover:text-ink transition-colors"
        style={{
          fontSize: '13.5px',
          fontWeight: 400,
          letterSpacing: '-0.005em',
        }}
      >
        {children}
      </Link>
    </li>
  )
}

function FooterAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="text-smoke hover:text-ink transition-colors"
        style={{
          fontSize: '13.5px',
          fontWeight: 400,
          letterSpacing: '-0.005em',
        }}
      >
        {children}
      </a>
    </li>
  )
}

function FooterExternal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
        className="text-smoke hover:text-ink transition-colors"
        style={{
          fontSize: '13.5px',
          fontWeight: 400,
          letterSpacing: '-0.005em',
        }}
      >
        {children}
      </a>
    </li>
  )
}
