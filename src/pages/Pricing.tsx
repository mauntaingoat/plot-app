import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, X, ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { useAuthStore } from '@/stores/authStore'

/* ════════════════════════════════════════════════════════════════
   PRICING — three tiers, then comparison table, then FAQ.
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
      { text: 'Discoverable in Explore', included: false },
      { text: 'Advanced analytics', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/ mo',
    desc: 'Get discovered. See who\'s watching.',
    cta: 'Go Pro',
    featured: true,
    features: [
      { text: 'Unlimited pins', included: true },
      { text: 'Listed in Explore', included: true },
      { text: 'Open house scheduling', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Email lead notifications', included: true },
      { text: 'Viewer cities & peak hours', included: true },
    ],
  },
  {
    name: 'Studio',
    price: '$39',
    period: '/ mo',
    badge: 'Best value',
    desc: 'The full kit for top producers.',
    cta: 'Go Studio',
    featured: false,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Saved map insights', included: true },
      { text: 'Cross-listing patterns', included: true },
      { text: 'Live streaming', included: true, comingSoon: true },
      { text: 'Priority support', included: true },
    ],
  },
]

type CompValue = boolean | 'partial' | string

const COMP_ROWS: Array<{
  feature: string
  reelst: CompValue
  zillow: CompValue
  instagram: CompValue
  linkbio: CompValue
}> = [
  { feature: 'Live map of your listings',          reelst: true, zillow: 'partial', instagram: false,     linkbio: false   },
  { feature: 'Reels & video walkthroughs on listings', reelst: true, zillow: 'partial', instagram: true,  linkbio: false   },
  { feature: 'Your own brand and URL',             reelst: true, zillow: false,     instagram: 'partial', linkbio: true    },
  { feature: 'You own every lead',                 reelst: true, zillow: false,     instagram: true,      linkbio: true    },
  { feature: 'MLS data auto-fill on listings',     reelst: true, zillow: true,      instagram: false,     linkbio: false   },
  { feature: 'Direct showing requests',            reelst: true, zillow: 'partial', instagram: false,     linkbio: false   },
  { feature: 'One link for your whole presence',   reelst: true, zillow: false,     instagram: 'partial', linkbio: true    },
  { feature: 'Per-listing analytics',              reelst: true, zillow: 'partial', instagram: false,     linkbio: 'partial' },
  { feature: 'Built for real estate agents',       reelst: true, zillow: 'partial', instagram: false,     linkbio: false   },
]

const FAQS = [
  {
    q: 'Do I need a real estate license to use Reelst?',
    a: 'Yes. Every agent profile is verified against state licensure data — we confirm the license number, name, and state before your Reelst goes live. If you\'re a consumer or aspiring agent, you can still browse other Reelsts, just not publish one.',
  },
  {
    q: 'Do I keep my leads, or does Reelst?',
    a: 'You keep them. Showing requests, saves, follows, and contact submissions land in your inbox — your contacts, your CRM, your relationship. Reelst never resells leads or sends them to a competing agent.',
  },
  {
    q: 'What happens if I switch brokerages?',
    a: 'Your Reelst goes with you. Your reel.st link, your followers, your pins, and your analytics are tied to you, not your brokerage. Update your brokerage on your profile and keep moving — no lost audience, no rebuilding.',
  },
  {
    q: 'Does Reelst replace my MLS or my CRM?',
    a: 'Neither. Reelst is your front door — the place you send buyers and the public to see your work. Your MLS is your sourcing layer, your CRM is your back office. We pull MLS data into your pins automatically and you can export leads to any CRM.',
  },
  {
    q: 'Will my license number and required disclaimers display?',
    a: 'Yes. License #, brokerage, and state are auto-displayed on your public profile. Fair-housing disclosure and equal-opportunity language are baked into the layout so your Reelst stays compliant in every state.',
  },
  {
    q: 'Can I import my existing listings?',
    a: 'Just enter the address. Reelst auto-fills property details — beds, baths, sqft, type, year built, listing price, days on market, MLS #. You drop the videos and walkthroughs on top.',
  },
  {
    q: 'Can I cancel or downgrade anytime?',
    a: 'Yes. Cancel or downgrade from your dashboard at any time — you keep your current plan through the end of the billing period, then drop to Free. Your pins, content, and followers stay with you.',
  },
  {
    q: 'Is there a team or brokerage plan?',
    a: 'Coming soon. If you\'re running a team or a brokerage, reach out at hello@reelst.co and we\'ll set you up with early access plus volume pricing.',
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
        description="Reelst is free to start. Go Pro at $19/mo for advanced analytics or Studio at $39/mo for live streaming and full insights."
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
        <section className="max-w-[1180px] mx-auto px-6 md:px-10 pb-20 md:pb-28">
          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
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
                {plan.featured && (
                  <span
                    className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-tangerine text-white text-[10px] uppercase tracking-[0.16em]"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  >
                    Most popular
                  </span>
                )}
                {plan.badge && (
                  <span
                    className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-ink text-ivory text-[10px] uppercase tracking-[0.16em]"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                  >
                    {plan.badge}
                  </span>
                )}

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
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      {f.included ? (
                        <Check
                          size={15}
                          className={`shrink-0 mt-0.5 ${plan.featured ? 'text-tangerine' : 'text-sold-green'}`}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <X size={15} className="shrink-0 mt-0.5 text-ash/40" strokeWidth={2} />
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
                        {(f as { comingSoon?: boolean }).comingSoon && (
                          <span
                            className="ml-1.5 text-[9px] text-tangerine bg-tangerine/12 px-1.5 py-0.5 rounded-full uppercase tracking-[0.12em]"
                            style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                          >
                            Soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── COMPARISON — Reelst vs the alternatives agents already use ── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="max-w-[760px] mb-12 md:mb-16 text-center mx-auto">
            <h2
              className="text-ink"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2rem, 4.2vw, 3.5rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 0.98,
              }}
            >
              Built for agents,{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                not platforms.
              </span>
            </h2>
            <p
              className="text-graphite mt-5 max-w-[520px] mx-auto"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              The tools you patch together today — a portal profile, a social feed,
              a generic link-in-bio — each solve a slice. Reelst is the home base.
            </p>
          </div>

          <div
            className="rounded-[22px] bg-white overflow-hidden"
            style={{
              border: '1px solid rgba(255,133,82,0.22)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(255,247,240,0.6)' }}>
                    <th
                      className="text-left py-5 pl-6 pr-4 text-[11px] text-smoke uppercase tracking-[0.18em]"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}
                    >
                      Feature
                    </th>
                    <th
                      className="py-5 px-3 text-center text-[13px] uppercase tracking-[0.16em]"
                      style={{
                        fontFamily: 'var(--font-humanist)',
                        fontWeight: 700,
                        color: '#D94A1F',
                        background: 'rgba(255,133,82,0.08)',
                      }}
                    >
                      Reelst
                    </th>
                    <th
                      className="py-5 px-3 text-center text-[13px] text-smoke uppercase tracking-[0.16em]"
                      style={{ fontFamily: 'var(--font-humanist)', fontWeight: 600 }}
                    >
                      Listing portal
                    </th>
                    <th
                      className="py-5 px-3 text-center text-[13px] text-smoke uppercase tracking-[0.16em]"
                      style={{ fontFamily: 'var(--font-humanist)', fontWeight: 600 }}
                    >
                      Social feed
                    </th>
                    <th
                      className="py-5 px-3 text-center text-[13px] text-smoke uppercase tracking-[0.16em]"
                      style={{ fontFamily: 'var(--font-humanist)', fontWeight: 600 }}
                    >
                      Link-in-bio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMP_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      style={i % 2 === 1 ? { background: 'rgba(255,247,240,0.35)' } : undefined}
                    >
                      <td
                        className="py-4 pl-6 pr-4 text-[14.5px] text-ink"
                        style={{ fontFamily: 'var(--font-humanist)', fontWeight: 500 }}
                      >
                        {row.feature}
                      </td>
                      <td
                        className="text-center py-4 px-3"
                        style={{ background: 'rgba(255,133,82,0.06)' }}
                      >
                        <CompMark value={row.reelst} highlight />
                      </td>
                      <td className="text-center py-4 px-3"><CompMark value={row.zillow} /></td>
                      <td className="text-center py-4 px-3"><CompMark value={row.instagram} /></td>
                      <td className="text-center py-4 px-3"><CompMark value={row.linkbio} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                      <Plus
                        size={15}
                        strokeWidth={2.25}
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

function CompMark({ value, highlight = false }: { value: CompValue; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${highlight ? 'bg-tangerine' : 'bg-ink/5'}`}>
        <Check size={14} className={highlight ? 'text-white' : 'text-ink'} strokeWidth={3} />
      </span>
    )
  }
  if (value === 'partial') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/[0.04]" aria-label="partial">
        <span className="w-2.5 h-0.5 bg-smoke rounded-full" />
      </span>
    )
  }
  if (value === false) {
    return <span className="inline-block w-3 h-px bg-ink/15" aria-label="not included" />
  }
  if (typeof value === 'string' && value.toLowerCase() === 'soon') {
    return (
      <span
        className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.14em]"
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: '#D94A1F',
          background: 'rgba(217,74,31,0.1)',
        }}
      >
        Soon
      </span>
    )
  }
  return (
    <span
      className={`inline-block text-[14px] ${highlight ? '' : 'text-ink'}`}
      style={{
        fontFamily: 'var(--font-humanist)',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: highlight ? '#D94A1F' : undefined,
      }}
    >
      {value}
    </span>
  )
}
