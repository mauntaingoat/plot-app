import { useNavigate } from 'react-router-dom'
import { ArrowRight, House as HomeIcon, SealCheck as BadgeCheck, Compass } from '@phosphor-icons/react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { ScrollFadeText, Glyph } from '@/components/marketing/ScrollFadeText'

/* ════════════════════════════════════════════════════════════════
   ABOUT — long-form essay. Tangerine prose "lights up" word-by-word
   as it sweeps past the scroll trigger. Inline tangerine glyphs pop
   in at key nouns (reels, map, pins, chess, toys, link).
   ════════════════════════════════════════════════════════════════ */

const ACT_TEXT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-humanist)',
  fontSize: 'clamp(1.5rem, 2.6vw, 2.4rem)',
  fontWeight: 500,
  letterSpacing: '-0.02em',
  lineHeight: 1.32,
  color: '#FF6B3D',
}

/* Inline pin chip — for-sale / sold / spotlight rendered in the
   same icon-square format as <Glyph>. No text label, just the
   coloured pin marker centred on the cream squircle. */
function PinChip({ kind }: { kind: 'for-sale' | 'sold' | 'spotlight' }) {
  const cfg = {
    'for-sale': { color: '#3B82F6', Icon: HomeIcon },
    sold: { color: '#34C759', Icon: BadgeCheck },
    spotlight: { color: '#FF6B3D', Icon: Compass },
  }[kind]
  const { Icon } = cfg
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1em',
        height: '1em',
        borderRadius: '0.24em',
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(217,74,31,0.18)',
        boxShadow:
          '0 3px 8px -3px rgba(217,74,31,0.18), 0 1px 0 rgba(255,255,255,0.85) inset',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '0.7em',
          height: '0.7em',
          borderRadius: '50%',
          background: cfg.color,
        }}
      >
        <Icon
          width="0.42em"
          height="0.42em"
          color="white"
          strokeWidth={3}
          style={{ display: 'block' }}
        />
      </span>
    </span>
  )
}


export default function About() {
  const navigate = useNavigate()

  return (
    <MarketingLayout>
      <SEOHead
        title="About"
        description="Real estate found its creator economy. Reelst is the home base — a live map of your listings, your reels, your pins, on a single shareable link."
        path="/about"
      />

      <div className="bg-marketing relative">
        {/* ── Hero — centered headline + description. The pin scene
              lives outside the document flow as a fixed-to-viewport
              overlay, so it travels with the reader for the entire
              page length. */}
        <section className="pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="max-w-[860px] mx-auto px-6 md:px-10 text-center">
            <h1
              className="text-ink"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.5rem, 5.4vw, 4.6rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1.0,
              }}
            >
              The home base for the{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                agent creator economy
              </span>
              .
            </h1>
            <p
              className="text-graphite mt-6 max-w-[560px] mx-auto"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              A link-in-bio tool built specifically for real estate agents —
              your listings, your portfolio, your brand, all in one place.
            </p>
          </div>
        </section>

        <section className="max-w-[860px] mx-auto px-6 md:px-10 pt-12 pb-32 md:pb-40">
          {/* ── Act 1 — the shift ──────────────────────────────── */}
          <ScrollFadeText className="mb-24 md:mb-32" style={ACT_TEXT_STYLE}>
            Real estate just became a creator economy.{' '}
            <Glyph name="chart" /> 96% of buyers start their search
            online. 58% expect to see a <Glyph name="reel" /> video
            of the home before they ever step inside. Listings with reels pull
            403% more inquiries. A new generation of agents is figuring this
            out — building audiences on TikTok, YouTube, and Instagram, and
            pulling in $100K+ in additional commission within months once they
            start showing up.
          </ScrollFadeText>

          {/* ── Act 2 — the fragmentation ──────────────────────── */}
          <ScrollFadeText className="mb-24 md:mb-32" style={ACT_TEXT_STYLE}>
            But the toolkit hasn't caught up. Reels live on Instagram.
            Walkthroughs live on TikTok. Listings live on the MLS. The bio link
            points to a <Glyph name="link" /> static landing page. Buyers find
            a clip they love and then have to detective their way through five
            platforms to figure out who the agent is, where the home is,
            whether it's still for sale. Agents are creators now — and nothing
            is built for them to be one.
          </ScrollFadeText>

          {/* ── Act 3 — Reelst ─────────────────────────────────── */}
          <ScrollFadeText className="mb-24 md:mb-32" style={ACT_TEXT_STYLE}>
            Reelst is the one place it all clicks together. A{' '}
            <Glyph name="map" /> live map of your listings. The reels and
            walkthroughs you already make, attached to the pin they're about.
            Your pins <PinChip kind="for-sale" /> <PinChip kind="sold" />{' '}
            <PinChip kind="spotlight" /> — searchable, shareable, on a single
            shareable link in your bio.
          </ScrollFadeText>

          {/* ── Act 4 — founder note ───────────────────────────── */}
          <ScrollFadeText className="mb-12" style={ACT_TEXT_STYLE}>
            I'm Mauricio. I've spent the last decade working with creators in
            niche worlds — <Glyph name="chess" /> chess grandmasters,{' '}
            <Glyph name="robot" /> toy enthusiasts, the kinds of communities
            where deep expertise lives but mainstream attention doesn't. I've
            helped scale channels, taken creators from endemic into
            non-endemic audiences, and built infrastructure so a person with a
            real point of view could get heard outside their corner of the
            internet.
          </ScrollFadeText>

          <ScrollFadeText className="mb-24 md:mb-32" style={ACT_TEXT_STYLE}>
            Real estate agents are creators with the same problem on a bigger
            scale. Local expertise, real product, genuine voice — and platforms
            that flatten all of it into a feed. Reelst is a link-in-bio tool
            built specifically for real estate agents — your listings, your
            portfolio, your brand, your personality, all on a single shareable
            page.
          </ScrollFadeText>

          {/* ── Act 5 — close ──────────────────────────────────── */}
          <div className="pt-8 md:pt-12" style={{ borderTop: '1px solid rgba(10,14,23,0.08)' }}>
            <p
              className="text-ink mb-10"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2rem, 4.4vw, 3.5rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1.0,
              }}
            >
              Drop your pin.{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                Show your work.
              </span>{' '}
              Get found.
            </p>

            <button
              onClick={() => navigate('/sign-up')}
              className="brand-btn h-12 px-6 rounded-full text-[14px] md:text-[15px] inline-flex items-center gap-2 cursor-pointer"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontWeight: 600,
                boxShadow:
                  '0 8px 22px -4px rgba(217,74,31,0.48), inset 0 1px 0 rgba(255,255,255,0.24)',
              }}
            >
              Claim your link <ArrowRight weight="bold" size={15} />
            </button>
          </div>
        </section>
      </div>
    </MarketingLayout>
  )
}
