import { Link } from 'react-router-dom'

const PRODUCT_LINKS = [
  { label: 'For Agents', to: '/for-agents' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Explore', to: '/explore' },
]

const COMPANY_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact', href: 'mailto:hello@reelst.co' },
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
  return (
    <footer className="bg-midnight text-white">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 pt-16 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 mb-4">
              <img src="/reelst-logo.png" alt="Reelst" className="w-8 h-8" />
              <span className="text-[18px] font-extrabold tracking-tight">Reelst</span>
            </div>
            <p className="text-[13px] text-ghost leading-relaxed max-w-[260px]">
              The modern real estate agent's profile. One link, a live map, all your content.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[12px] font-bold text-ghost uppercase tracking-widest mb-4">Product</h4>
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
            <h4 className="text-[12px] font-bold text-ghost uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  {'to' in link ? (
                    <Link to={link.to} className="text-[14px] text-mist hover:text-white transition-colors">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="text-[14px] text-mist hover:text-white transition-colors">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[12px] font-bold text-ghost uppercase tracking-widest mb-4">Legal</h4>
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
            <h4 className="text-[12px] font-bold text-ghost uppercase tracking-widest mb-4">Connect</h4>
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
        <div className="border-t border-border-dark pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
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
    </footer>
  )
}
