import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, X, ChevronDown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useAuthStore } from '@/stores/authStore'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Get started and see what Reelst can do.',
    cta: 'Start free',
    featured: false,
    features: [
      { text: 'Up to 6 active pins', included: true },
      { text: '3 content items per pin', included: true },
      { text: '3-minute video reels', included: true },
      { text: 'Photo carousels', included: true },
      { text: 'Public profile at reel.st/you', included: true },
      { text: 'Basic view & save counts', included: true },
      { text: 'Connect social platforms', included: true },
      { text: 'Showing request inbox', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Live streaming', included: false },
      { text: 'Saved map insights', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For agents serious about growing their brand.',
    cta: 'Go Pro',
    featured: true,
    features: [
      { text: 'Unlimited active pins', included: true },
      { text: '10 content items per pin', included: true },
      { text: '3-minute video reels', included: true },
      { text: 'Photo carousels', included: true },
      { text: 'Public profile at reel.st/you', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Per-pin performance breakdown', included: true },
      { text: 'Viewer cities & time-of-day', included: true },
      { text: 'Content performance & save rates', included: true },
      { text: 'Connect unlimited platforms', included: true },
      { text: 'Live streaming', included: false },
      { text: 'Saved map insights', included: false },
    ],
  },
  {
    name: 'Studio',
    price: '$39',
    period: '/mo',
    desc: 'Full suite for top-producing agents and teams.',
    cta: 'Go Studio',
    featured: false,
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited active pins', included: true },
      { text: '10 content items per pin', included: true },
      { text: 'Live streaming to your map', included: true },
      { text: 'Saved map insights', included: true },
      { text: 'Cross-listing pattern analysis', included: true },
      { text: 'Follower growth tracking', included: true },
      { text: 'Priority support', included: true },
      { text: 'Early access to new features', included: true },
    ],
  },
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
  const [showAuth, setShowAuth] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCta = () => {
    if (userDoc) navigate('/dashboard')
    else navigate('/sign-up')
  }

  return (
    <MarketingLayout>
      <SEOHead title="Pricing" description="Reelst is free to start. Go Pro at $19/mo for advanced analytics or Studio at $39/mo for live streaming and full insights." path="/pricing" />

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-8 md:pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-[32px] md:text-[52px] font-extrabold text-ink tracking-tight mb-3">
            Simple pricing. <span className="text-gradient">Start free.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-smoke max-w-[520px] mx-auto">
            No hidden fees, no contracts. Upgrade when you're ready to grow.
          </p>
        </motion.div>
      </section>

      {/* Plans */}
      <section className="max-w-[1100px] mx-auto px-5 md:px-8 py-10 md:py-16">
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-[24px] p-6 md:p-7 flex flex-col relative ${
                plan.featured
                  ? 'bg-gradient-to-br from-midnight to-obsidian text-white ring-2 ring-tangerine/30'
                  : 'bg-cream border border-border-light'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-tangerine text-white text-[11px] font-bold uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              <h3 className={`text-[20px] font-extrabold tracking-tight ${plan.featured ? '' : 'text-ink'}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className={`text-[40px] font-extrabold tracking-tight font-mono ${plan.featured ? '' : 'text-ink'}`}>
                  {plan.price}
                </span>
                <span className={`text-[14px] font-medium ${plan.featured ? 'text-ghost' : 'text-smoke'}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`text-[13px] mb-5 ${plan.featured ? 'text-mist' : 'text-smoke'}`}>{plan.desc}</p>

              <Button
                variant={plan.featured ? 'primary' : 'secondary'}
                size="lg"
                fullWidth
                onClick={handleCta}
                iconRight={<ArrowRight size={15} />}
              >
                {plan.cta}
              </Button>

              <div className="mt-5 space-y-2.5">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check size={15} className={`shrink-0 mt-0.5 ${plan.featured ? 'text-tangerine' : 'text-sold-green'}`} />
                    ) : (
                      <X size={15} className="shrink-0 mt-0.5 text-ash/30" />
                    )}
                    <span className={`text-[13px] ${
                      f.included
                        ? plan.featured ? 'text-mist' : 'text-graphite'
                        : 'text-ash/50 line-through'
                    }`}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[700px] mx-auto px-5 md:px-8 py-16 md:py-24">
        <h2 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight text-center mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-cream rounded-[16px] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
              >
                <span className="text-[14px] md:text-[15px] font-semibold text-ink pr-4">{faq.q}</span>
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
                    <p className="px-5 pb-5 text-[13px] md:text-[14px] text-smoke leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <AuthSheet isOpen={showAuth} onClose={() => setShowAuth(false)} mode="signup" />
    </MarketingLayout>
  )
}
