import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const PRODUCT_LINKS = [
  { label: 'For Agents', to: '/for-agents' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Explore', to: '/explore' },
]

const COMPANY_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const LEGAL_LINKS = [
  { label: 'Terms of Use', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
]

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/reelst' },
  { label: 'TikTok', href: 'https://tiktok.com/@reelst' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/reelst' },
  { label: 'X', href: 'https://x.com/reelst' },
]

export function Footer() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')

  const handleClaim = () => {
    if (username.trim()) {
      navigate(`/sign-up?username=${encodeURIComponent(username.trim())}`)
    } else {
      navigate('/sign-up')
    }
  }

  return (
    <footer className="relative overflow-hidden">
      {/* Background with gradient mesh */}
      <div className="absolute inset-0 bg-midnight" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-tangerine/6 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-ember/4 rounded-full blur-[100px]" />
      </div>

      <div className="relative">
        {/* ── Claim CTA block (Linktree-inspired) ── */}
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 pt-20 md:pt-28 pb-16 md:pb-20">
          <div className="text-center max-w-[600px] mx-auto">
            <img src="/reelst-logo.png" alt="" className="w-12 h-12 mx-auto mb-5" />
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-white tracking-tight leading-tight mb-3">
              Your neighborhood is waiting.
            </h2>
            <p className="text-[15px] md:text-[17px] text-mist mb-8 leading-relaxed">
              Join agents who are turning their Instagram bio into a live, interactive map.
            </p>

            {/* Inline claim form */}
            <div className="flex items-center max-w-[440px] mx-auto bg-white/8 backdrop-blur-sm border border-white/12 rounded-full p-1.5 focus-within:border-tangerine/50 transition-colors">
              <span className="text-[14px] font-semibold text-mist pl-4 shrink-0 select-none">reel.st/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9._-]/gi, '').toLowerCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
                placeholder="yourname"
                className="flex-1 bg-transparent text-white text-[14px] font-medium py-2.5 px-1 outline-none placeholder:text-white/25 min-w-0"
              />
              <button
                onClick={handleClaim}
                className="shrink-0 h-10 px-5 rounded-full bg-gradient-to-r from-tangerine to-ember text-white text-[13px] font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-glow-tangerine"
              >
                Claim it <ArrowRight size={14} />
              </button>
            </div>

            <p className="text-[12px] text-ghost mt-4">Free forever. No credit card required.</p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="max-w-[1200px] mx-auto px-5 md:px-8">
          <div className="h-px bg-white/8" />
        </div>

        {/* ── Link columns ── */}
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 pt-12 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-1.5 mb-4">
                <img src="/reelst-logo.png" alt="Reelst" className="w-8 h-8" />
                <span className="text-[18px] font-extrabold text-white tracking-tight">Reelst</span>
              </div>
              <p className="text-[13px] text-ghost leading-relaxed max-w-[260px]">
                The modern real estate agent's profile. One link, a live map, all your content.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[11px] font-bold text-ghost uppercase tracking-[0.12em] mb-4">Product</h4>
              <ul className="space-y-2.5">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[14px] text-mist hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[11px] font-bold text-ghost uppercase tracking-[0.12em] mb-4">Company</h4>
              <ul className="space-y-2.5">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-[14px] text-mist hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[11px] font-bold text-ghost uppercase tracking-[0.12em] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[14px] text-mist hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-[11px] font-bold text-ghost uppercase tracking-[0.12em] mb-4">Connect</h4>
              <ul className="space-y-2.5">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-mist hover:text-white transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-ghost">
              &copy; {new Date().getFullYear()} Avigage LLC DBA Reelst. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-[12px] text-ghost hover:text-mist transition-colors">Terms</Link>
              <Link to="/privacy" className="text-[12px] text-ghost hover:text-mist transition-colors">Privacy</Link>
              <a href="mailto:hello@reelst.co" className="text-[12px] text-ghost hover:text-mist transition-colors">hello@reelst.co</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
