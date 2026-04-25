import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-midnight border-t border-white/[0.06]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-white/55">
        <div className="flex items-center gap-2">
          <img src="/reelst-logo.png" alt="Reelst" className="w-5 h-5 opacity-80" />
          <span className="font-semibold text-white/70 tracking-[-0.01em]">Reelst</span>
          <span className="text-white/25 mx-1">·</span>
          <span>&copy; {new Date().getFullYear()} Avigage LLC</span>
        </div>

        <div className="flex items-center gap-5">
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
          <span className="hidden md:inline italic" style={{ fontFamily: 'var(--font-serif)' }}>Built in Miami</span>
        </div>
      </div>
    </footer>
  )
}
