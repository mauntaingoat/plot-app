import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { useAuthStore } from '@/stores/authStore'

/* ════════════════════════════════════════════════════════════════
   PRICING — two tiers (Free + Pro), comparison table, FAQ.
   Typography mirrors Hero/FeatureShowcase:
     fontFamily: var(--font-humanist), weight 500 (600 for the
     brand-grad accent on the second line), letterSpacing -0.035em,
     lineHeight 0.98. No mono "eyebrow" labels.
   Background is bg-marketing (#F6F1E9) so the page feels continuous
   with the rest of the marketing site.
   ════════════════════════════════════════════════════════════════ */

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Build your portfolio on your own link.',
    cta: 'Start free',
    featured: false,
    features: [
      { text: '3 active pins on your map', included: true },
      { text: '3-min reels & carousels', included: true },
      { text: 'Your own reel.st link', included: true },
      { text: 'MLS data auto-fill', included: true },
      { text: 'Showing request inbox', included: true },
      { text: 'Email subscribers', included: true },
      { text: 'Basic customization', included: true },
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/ mo',
    desc: 'For agents serious about their pipeline.',
    cta: 'Go Pro',
    featured: true,
    features: [
      { text: 'Everything in Free, plus:', included: true, header: true },
      { text: 'Unlimited pins', included: true },
      { text: 'Open house scheduling', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Audience Crossover insights', included: true },
      { text: 'Expanded customization', included: true },
      { text: 'Priority support', included: true },
    ],
  },
]

const FAQS = [
  {
    q: 'Do I need a real estate license to use Reelst?',
    a: 'Yes. Every agent profile is verified before going live — we check your license number, legal name, and state against your state\'s licensure data. Profiles stay hidden from the public until verification clears.',
  },
  {
    q: 'What\'s the difference between Free and Pro?',
    a: 'Free covers the basics: up to 3 active pins, full content per pin (reels, photo carousels, photos), and core stats — visits, taps, saves, and waves. Pro at $19/mo unlocks unlimited pins, the full insights dashboard (peak hours, visitor cities, audience crossover, content conversion), open-house scheduling, email digests to your subscribers, and the expanded customization library — extra palettes, fonts, and map shapes.',
  },
  {
    q: 'Can I import my existing listings?',
    a: 'Just type the address. Reelst auto-fills beds, baths, sqft, home type, year built, list price, days on market, and MLS # from public records. Drop your reels and walkthroughs on top.',
  },
  {
    q: 'What can visitors do on my profile?',
    a: 'Visitors don\'t need an account to interact. They can save your profile (drops their email so we send a digest when you post new listings or content), wave on a listing (sends you their name, email, phone, and an optional question), or request a showing. Everything lands in your inbox.',
  },
  {
    q: 'What can I post on a pin?',
    a: 'Each pin is a container for your reels (videos up to 3 minutes), photo carousels, and standalone photos. Video is processed through Mux for adaptive streaming so playback stays smooth on any connection. Listing photos auto-pull from MLS when available.',
  },
  {
    q: 'Do I keep my leads, or does Reelst?',
    a: 'You keep them. Showing requests, email subscribers, and waves all land in your inbox under your account — your contacts, your relationship. Reelst never resells leads or routes them to a competing agent.',
  },
  {
    q: 'What happens when a listing sells?',
    a: 'Mark it sold from the dashboard. The pin\'s type flips from For Sale to Sold, the price card switches to your sold price and sold date, and the listing stays on your map as part of your portfolio — every reel and walkthrough you attached stays put.',
  },
  {
    q: 'Can I cancel or downgrade anytime?',
    a: 'Yes. Cancel from your dashboard — you keep Pro through the end of the billing period, then drop to Free. Your pins, content, and subscribers stay with you.',
  },
  {
    q: 'Is there a team or brokerage plan?',
    a: 'Coming soon. If you\'re running a team or a brokerage, reach out at hello@reelst.co for early access and volume pricing.',
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCta = () => {
    if (userDoc) navigate('/dashboard')
    else navigate('/sign-up')
  }

  return (
    <MarketingLayout>
      <SEOHead
        title="Pricing"
        description="Reelst is free to start. Go Pro at $19/mo for unlimited pins, full analytics, and expanded customization."
        path="/pricing"
      />

      <div className="bg-marketing">
        {/* ── HERO CARD — same map-grid framing as Home hero ─────── */}
        <section className="pt-20 md:pt-24 pb-12 md:pb-16">
          <div className="max-w-[1320px] mx-auto px-4 md:px-6">
            <div
              className="map-grid relative rounded-[28px] md:rounded-[36px] px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-20 text-center"
              style={{
                border: '1px solid rgba(255,133,82,0.22)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.8) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
              }}
            >
              <h1
                className="text-ink mb-6 max-w-[860px] mx-auto"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(2.5rem, 5.4vw, 5rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.035em',
                  lineHeight: 0.98,
                }}
              >
                Start free.
                <br />
                <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                  Grow when you're ready.
                </span>
              </h1>
              <p
                className="text-graphite max-w-[560px] mx-auto"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
                  fontWeight: 400,
                  lineHeight: 1.55,
                }}
              >
                No hidden fees, no contracts. Upgrade when you're ready to grow.
              </p>
            </div>
          </div>
        </section>

        {/* ── PRICING TIERS ─────────────────────────────────────── */}
        <section className="max-w-[860px] mx-auto px-6 md:px-10 pb-20 md:pb-28">
          <div className="grid md:grid-cols-2 gap-5 md:gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative rounded-[24px] p-7 md:p-8 flex flex-col ${
                  plan.featured
                    ? 'bg-gradient-to-br from-midnight to-obsidian text-ivory ring-1 ring-tangerine/40 shadow-[0_24px_60px_-22px_rgba(10,14,23,0.45)]'
                    : 'bg-white'
                }`}
                style={
                  !plan.featured
                    ? {
                        border: '1px solid rgba(255,133,82,0.22)',
                        boxShadow:
                          '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
                      }
                    : undefined
                }
              >
                <h3
                  className={`mb-2 ${plan.featured ? 'text-ivory' : 'text-ink'}`}
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: '1.4rem',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {plan.name}
                </h3>

                <div className="flex items-baseline gap-1.5 mb-1">
                  <span
                    className={`${plan.featured ? 'text-ivory' : 'text-ink'}`}
                    style={{
                      fontFamily: 'var(--font-humanist)',
                      fontSize: '2.6rem',
                      fontWeight: 500,
                      letterSpacing: '-0.035em',
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-[13.5px] ${plan.featured ? 'text-white/55' : 'text-smoke'}`}
                    style={{ fontFamily: 'var(--font-humanist)', fontWeight: 400 }}
                  >
                    {plan.period}
                  </span>
                </div>

                <p
                  className={`mb-6 ${plan.featured ? 'text-white/65' : 'text-smoke'}`}
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: '0.95rem',
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {plan.desc}
                </p>

                <Button
                  variant={plan.featured ? 'primary' : 'secondary'}
                  size="lg"
                  fullWidth
                  onClick={handleCta}
                  iconRight={<ArrowRight size={15} />}
                >
                  {plan.cta}
                </Button>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => {
                    const isHeader = (f as { header?: boolean }).header
                    if (isHeader) {
                      return (
                        <li
                          key={f.text}
                          className={`text-[12px] uppercase tracking-[0.14em] pt-0.5 pb-1 ${plan.featured ? 'text-white/55' : 'text-smoke'}`}
                          style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                        >
                          {f.text}
                        </li>
                      )
                    }
                    return (
                      <li key={f.text} className="flex items-start gap-2.5">
                        {f.included ? (
                          <Check weight="bold"
                            size={15}
                            className={`shrink-0 mt-0.5 ${plan.featured ? 'text-tangerine' : 'text-sold-green'}`}
                          />
                        ) : (
                          <X size={15} className="shrink-0 mt-0.5 text-ash/40" />
                        )}
                        <span
                          className={
                            f.included
                              ? plan.featured ? 'text-white/85' : 'text-graphite'
                              : 'text-ash/55 line-through'
                          }
                          style={{
                            fontFamily: 'var(--font-humanist)',
                            fontSize: '0.92rem',
                            fontWeight: 400,
                            lineHeight: 1.45,
                          }}
                        >
                          {f.text}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FAQ — magazine-style numbered list ─────────────────── */}
        <section className="max-w-[860px] mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-24 md:pb-32">
          <div className="text-center mb-12 md:mb-16">
            <h2
              className="text-ink"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 0.98,
              }}
            >
              Frequently asked{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                questions.
              </span>
            </h2>
            <p
              className="text-graphite mt-5 max-w-[460px] mx-auto"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              The questions agents actually ask before signing up.
            </p>
          </div>

          <div className="border-t border-black/[0.08]">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div key={i} className="border-b border-black/[0.08]">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-start gap-5 md:gap-8 py-6 md:py-7 text-left cursor-pointer group"
                    style={{ fontFamily: 'var(--font-humanist)' }}
                  >
                    <span
                      className="shrink-0 pt-[7px] md:pt-[9px] w-10 md:w-12"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.16em',
                        color: '#D94A1F',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="flex-1 text-ink"
                      style={{
                        fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)',
                        fontWeight: 500,
                        letterSpacing: '-0.015em',
                        lineHeight: 1.32,
                      }}
                    >
                      {faq.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                      className="shrink-0 mt-[6px] md:mt-[10px] w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isOpen ? 'rgba(217,74,31,0.1)' : 'rgba(10,14,23,0.05)',
                      }}
                    >
                      <Plus weight="bold"
                        size={15}
                        className={isOpen ? 'text-tangerine' : 'text-graphite group-hover:text-tangerine transition-colors'}
                      />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-5 md:gap-8 pb-7 md:pb-8 -mt-1">
                          <span className="shrink-0 w-10 md:w-12" aria-hidden />
                          <p
                            className="flex-1 text-graphite max-w-[640px]"
                            style={{
                              fontFamily: 'var(--font-humanist)',
                              fontSize: '15.5px',
                              fontWeight: 400,
                              lineHeight: 1.65,
                              letterSpacing: '-0.005em',
                            }}
                          >
                            {faq.a}
                          </p>
                          <span className="shrink-0 w-7" aria-hidden />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </MarketingLayout>
  )
}

