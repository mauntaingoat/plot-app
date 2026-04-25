import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, X, ChevronDown, ArrowRight } from 'lucide-react'
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
    desc: 'Create content and showcase your listings.',
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
    desc: 'Get discovered. Understand your audience.',
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
    desc: 'The full suite for top producers.',
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

const COMP_ROWS: Array<{
  feature: string
  reelst: boolean | 'partial'
  ig: boolean | 'partial'
  realtor: boolean | 'partial'
  zillow: boolean | 'partial'
}> = [
  { feature: 'Live map of your listings', reelst: true, ig: false, realtor: false, zillow: 'partial' },
  { feature: 'Video reels on listings', reelst: true, ig: true, realtor: false, zillow: false },
  { feature: 'Your own brand + URL', reelst: true, ig: 'partial', realtor: false, zillow: false },
  { feature: 'Direct showing requests', reelst: true, ig: false, realtor: 'partial', zillow: 'partial' },
  { feature: 'One link for everything', reelst: true, ig: false, realtor: false, zillow: false },
  { feature: 'Built for agents, not platforms', reelst: true, ig: false, realtor: false, zillow: false },
  { feature: 'Free to start', reelst: true, ig: true, realtor: false, zillow: false },
]

const FAQS = [
  { q: 'Can I try Pro before committing?', a: 'Yes — start on Free and upgrade anytime. Your pins, content, and followers carry over seamlessly.' },
  { q: 'What counts as an "active pin"?', a: 'Any pin that\'s visible on your public map. You can toggle pins on/off to manage your slots on the Free plan. Archived pins don\'t count.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your dashboard settings. You\'ll keep your current plan features until the end of your billing period, then drop to Free.' },
  { q: 'Do homebuyers need an account?', a: 'No. Anyone can view your Reelst profile, browse your map, and watch your reels without signing up. They only need an account to follow, save, or request a showing.' },
  { q: 'What social platforms can I connect?', a: 'Instagram, TikTok, YouTube, Facebook, LinkedIn, and your personal website. All plans include platform connections.' },
  { q: 'How does the MLS data auto-fill work?', a: 'When you create a pin, enter the address and we automatically pull property details — beds, baths, sqft, type, year built, listing price, days on market, and MLS number from public listing data.' },
  { q: 'Is there a team or brokerage plan?', a: 'Coming soon. If you\'re a brokerage or team, reach out and we\'ll set you up with early access.' },
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
        {/* ── PAGE HEADLINE ─────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-10 md:pb-16 text-center">
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
                    : 'bg-white border border-black/[0.07]'
                }`}
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

        {/* ── COMPARED ───────────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="max-w-[760px] mb-12 md:mb-16">
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
              Built for agents.
              <br />
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                Not platforms.
              </span>
            </h2>
          </div>

          <div
            className="rounded-[22px] bg-white border border-black/[0.07] overflow-hidden"
            style={{ boxShadow: '0 10px 30px -16px rgba(10,14,23,0.08)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(255,247,240,0.6)' }}>
                    <th
                      className="text-left py-4 pl-6 pr-4 text-[11px] text-smoke uppercase tracking-[0.18em]"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}
                    >
                      Feature
                    </th>
                    <th className="py-4 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[13px] text-ink uppercase tracking-[0.1em]" style={{ fontFamily: 'var(--font-humanist)', fontWeight: 600 }}>Reelst</span>
                      </div>
                    </th>
                    <th className="py-4 px-3 text-center text-[13px] text-smoke" style={{ fontFamily: 'var(--font-humanist)', fontWeight: 500 }}>IG bio</th>
                    <th className="py-4 px-3 text-center text-[13px] text-smoke" style={{ fontFamily: 'var(--font-humanist)', fontWeight: 500 }}>Realtor.com</th>
                    <th className="py-4 px-3 text-center text-[13px] text-smoke" style={{ fontFamily: 'var(--font-humanist)', fontWeight: 500 }}>Zillow</th>
                  </tr>
                </thead>
                <tbody>
                  {COMP_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? 'bg-white' : ''}
                      style={i % 2 === 1 ? { background: 'rgba(255,247,240,0.35)' } : undefined}
                    >
                      <td
                        className="py-4 pl-6 pr-4 text-[14.5px] text-ink"
                        style={{ fontFamily: 'var(--font-humanist)', fontWeight: 500 }}
                      >
                        {row.feature}
                      </td>
                      <td className="text-center py-4 px-3"><CompMark value={row.reelst} highlight /></td>
                      <td className="text-center py-4 px-3"><CompMark value={row.ig} /></td>
                      <td className="text-center py-4 px-3"><CompMark value={row.realtor} /></td>
                      <td className="text-center py-4 px-3"><CompMark value={row.zillow} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────── */}
        <section className="max-w-[760px] mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-24 md:pb-32">
          <h2
            className="text-ink text-center mb-10 md:mb-14"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: 'clamp(2rem, 4vw, 3.25rem)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 0.98,
            }}
          >
            Questions,{' '}
            <span className="brand-grad-text" style={{ fontWeight: 600 }}>
              answered.
            </span>
          </h2>

          <div className="space-y-2.5">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-[16px] border border-black/[0.06] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                  style={{ fontFamily: 'var(--font-humanist)' }}
                >
                  <span
                    className="text-[15px] text-ink pr-4"
                    style={{ fontWeight: 500, letterSpacing: '-0.005em' }}
                  >
                    {faq.q}
                  </span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-smoke shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p
                        className="px-5 pb-5 text-[14px] text-graphite"
                        style={{
                          fontFamily: 'var(--font-humanist)',
                          fontWeight: 400,
                          lineHeight: 1.6,
                        }}
                      >
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MarketingLayout>
  )
}

function CompMark({ value, highlight = false }: { value: boolean | 'partial'; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${highlight ? 'bg-tangerine' : 'bg-ink/5'}`}>
        <Check size={14} className={highlight ? 'text-white' : 'text-ink'} strokeWidth={3} />
      </span>
    )
  }
  if (value === 'partial') {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/[0.04]">
        <span className="w-2.5 h-0.5 bg-smoke rounded-full" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/[0.03]">
      <X size={13} className="text-ash" strokeWidth={2} />
    </span>
  )
}
