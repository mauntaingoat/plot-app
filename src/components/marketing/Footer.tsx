import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer
      className="bg-midnight border-t border-white/[0.06]"
      style={{ fontFamily: 'var(--font-humanist)' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-9 flex flex-col md:flex-row items-center justify-between gap-5 text-white/55">
        <div className="flex items-center gap-2.5 text-[13px]" style={{ letterSpacing: '-0.005em' }}>
          <img src="/reelst-logo.png" alt="Reelst" className="w-5 h-5 opacity-85" />
          <span
            className="text-white/80"
            style={{ fontWeight: 500, letterSpacing: '-0.015em' }}
          >
            Reelst
          </span>
          <span className="text-white/25 mx-1">·</span>
          <span style={{ fontWeight: 400 }}>&copy; {new Date().getFullYear()} Avigage LLC</span>
        </div>

        <div
          className="flex items-center gap-5 text-[13px]"
          style={{ fontWeight: 400, letterSpacing: '-0.005em' }}
        >
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <a
            href="https://instagram.com/reelst"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            @reelst
          </a>
          <span className="text-white/25 hidden md:inline">·</span>
          <span
            className="hidden md:inline text-white/45 italic"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '13.5px' }}
          >
            Built in Miami
          </span>
        </div>
      </div>
    </footer>
  )
}
