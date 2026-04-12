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
    desc: 'Get started. See what Reelst can do.',
    cta: 'Start free',
    featured: false,
    features: [
      { text: 'Up to 5 active pins', included: true },
      { text: 'Reels Stories & Reels Photos', included: true },
      { text: 'Public profile at reel.st/you', included: true },
      { text: 'Basic view counts', included: true },
      { text: 'Connect 2 social platforms', included: true },
      { text: 'Detailed analytics', included: false },
      { text: 'Unlimited pins', included: false },
      { text: 'Custom branding', included: false },
      { text: 'Priority placement', included: false },
      { text: 'Custom map style', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For agents who are serious about content.',
    cta: 'Go Pro',
    featured: true,
    features: [
      { text: 'Unlimited active pins', included: true },
      { text: 'Reels, Photos Stories, Reels & Live Live', included: true },
      { text: 'Public profile at reel.st/you', included: true },
      { text: 'Deep analytics (views, taps, saves, WoW)', included: true },
      { text: 'Connect unlimited platforms', included: true },
      { text: 'Detailed analytics dashboard', included: true },
      { text: 'Custom branding (colors, logo)', included: true },
      { text: 'Priority in Explore & search', included: true },
      { text: 'Custom map style', included: true },
      { text: 'Early access to new features', included: true },
    ],
  },
]

const FAQS = [
  { q: 'Can I try Pro before committing?', a: 'Yes — start on Free and upgrade to Pro anytime. Your data carries over. No setup required.' },
  { q: 'What counts as an "active pin"?', a: 'Any pin that\'s visible on your public map. You can toggle pins off to free up slots on the Free plan. Expired stories and ended live streams don\'t count.' },
  { q: 'Can I cancel Pro anytime?', a: 'Yes. Cancel anytime from your dashboard. You\'ll keep Pro features until the end of your billing period, then drop to Free.' },
  { q: 'Do homebuyers need an account?', a: 'No. Anyone can view your Reelst profile and explore your map without signing up. They only need an account to follow, save, or contact you.' },
  { q: 'What social platforms can I connect?', a: 'Instagram, TikTok, YouTube, Facebook, LinkedIn, Zillow, Realtor.com, MLS, and your personal website. Free plan: 2 platforms. Pro: unlimited.' },
  { q: 'Is there a team plan?', a: 'Coming soon. If you\'re a brokerage or team, email hello@reelst.co and we\'ll set you up.' },
]

export default function Pricing() {
  const navigate = useNavigate()
  const { userDoc } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleCta = () => {
    if (userDoc) {
      navigate('/dashboard')
    } else {
      navigate('/sign-up')
    }
  }

  return (
    <MarketingLayout>
      <SEOHead title="Pricing" description="Reelst is free to start. Go Pro at $19/mo for unlimited pins, deep analytics, and custom branding." path="/pricing" />

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-8 md:pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-[32px] md:text-[52px] font-extrabold text-ink tracking-tight mb-3">
            Simple pricing. <span className="text-gradient">Start free.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-smoke max-w-[480px] mx-auto">
            No hidden fees, no contracts. Upgrade when you're ready.
          </p>
        </motion.div>
      </section>

      {/* Plans */}
      <section className="max-w-[900px] mx-auto px-5 md:px-8 py-10 md:py-16">
        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-[24px] p-6 md:p-8 flex flex-col relative ${
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
              <h3 className={`text-[20px] md:text-[22px] font-extrabold tracking-tight ${plan.featured ? '' : 'text-ink'}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mt-2 mb-1">
                <span className={`text-[40px] md:text-[48px] font-extrabold tracking-tight font-mono ${plan.featured ? '' : 'text-ink'}`}>
                  {plan.price}
                </span>
                <span className={`text-[15px] font-medium ${plan.featured ? 'text-ghost' : 'text-smoke'}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`text-[14px] mb-6 ${plan.featured ? 'text-mist' : 'text-smoke'}`}>{plan.desc}</p>

              <Button
                variant={plan.featured ? 'primary' : 'secondary'}
                size="xl"
                fullWidth
                onClick={handleCta}
                iconRight={<ArrowRight size={16} />}
              >
                {plan.cta}
              </Button>

              <div className="mt-6 space-y-3">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check size={16} className={`shrink-0 mt-0.5 ${plan.featured ? 'text-tangerine' : 'text-sold-green'}`} />
                    ) : (
                      <X size={16} className="shrink-0 mt-0.5 text-ash/40" />
                    )}
                    <span className={`text-[13px] md:text-[14px] ${
                      f.included
                        ? plan.featured ? 'text-mist' : 'text-graphite'
                        : 'text-ash line-through'
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
