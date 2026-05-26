import { Link } from 'react-router-dom'
import { DeviceMobile, Desktop, AppleLogo, House, ArrowRight } from '@phosphor-icons/react'
import { ReelstLogo } from '@/components/ui/ReelstLogo'

/**
 * Mobile-browser dashboard block.
 *
 * Shown to signed-in agents who hit /dashboard, /sign-in, /sign-up,
 * or /welcome on a phone-width browser. The dashboard's interaction
 * model doesn't fit a 375px viewport, and the native iOS app is the
 * path forward — this page tells them that, points them to desktop
 * for now, and previews the iOS app.
 *
 * Note: visitors who AREN'T signed in still get the full marketing
 * site, public agent profiles, and the auth surfaces on mobile —
 * this block is specifically for the agent dashboard flow.
 */
export function MobileBlockPage() {
  return (
    <div className="min-h-[100dvh] bg-ivory flex flex-col">
      <div className="px-6 pt-10 pb-4 flex items-center justify-center">
        <ReelstLogo size="md" />
      </div>

      <main className="flex-1 px-6 pt-4 pb-10 max-w-md mx-auto w-full flex flex-col">
        {/* Hero icon block */}
        <div className="relative w-full h-44 flex items-center justify-center mb-6">
          <div
            className="absolute inset-0 rounded-[28px]"
            style={{
              background:
                'radial-gradient(120% 90% at 50% 0%, rgba(255,107,61,0.12) 0%, rgba(255,107,61,0) 60%)',
            }}
          />
          <div className="relative flex items-end gap-3">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-tangerine border-2 border-tangerine/20 shadow-sm"
              style={{ background: 'rgba(255,107,61,0.08)' }}
            >
              <Desktop weight="regular" size={36} />
            </div>
            <div className="text-ash text-2xl pb-3 select-none">→</div>
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-tangerine border-2 border-tangerine/20 shadow-sm"
              style={{ background: 'rgba(255,107,61,0.08)' }}
            >
              <DeviceMobile weight="regular" size={36} />
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="text-ink text-center mb-3"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: '28px',
            lineHeight: 1.18,
            letterSpacing: '-0.025em',
            fontWeight: 600,
          }}
        >
          Reelst dashboard is for desktop.
        </h1>
        <p
          className="text-smoke text-center mb-7"
          style={{ fontFamily: 'var(--font-humanist)', fontSize: '15px', lineHeight: 1.55 }}
        >
          Managing pins, content, and your style customization works best on
          a bigger screen. Open Reelst on your laptop to keep building.
        </p>

        {/* iOS app coming-soon callout */}
        <div className="rounded-[20px] border-2 border-tangerine/20 bg-tangerine/[0.06] p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-ink text-warm-white flex items-center justify-center shrink-0">
              <AppleLogo weight="fill" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-ink mb-1"
                style={{ fontFamily: 'var(--font-humanist)', fontSize: '14.5px', fontWeight: 600 }}
              >
                Reelst for iOS — coming soon
              </p>
              <p
                className="text-smoke"
                style={{ fontFamily: 'var(--font-humanist)', fontSize: '12.5px', lineHeight: 1.5 }}
              >
                The native app lets you post reels and listings directly from
                your phone. Launching on the App Store this quarter.
              </p>
            </div>
          </div>
        </div>

        {/* Secondary CTAs */}
        <div className="mt-auto space-y-3">
          <Link
            to="/"
            className="w-full h-12 rounded-full bg-cream border border-border-light flex items-center justify-center gap-2 text-ink hover:bg-pearl/40 transition-colors"
            style={{ fontFamily: 'var(--font-humanist)', fontSize: '14px', fontWeight: 600 }}
          >
            <House size={15} weight="regular" />
            Back to home
            <ArrowRight size={14} weight="bold" />
          </Link>
          <p
            className="text-ash text-center px-4"
            style={{ fontFamily: 'var(--font-humanist)', fontSize: '11.5px' }}
          >
            Open <span className="text-graphite font-semibold">reel.st</span> on a computer to access your dashboard.
          </p>
        </div>
      </main>
    </div>
  )
}
