import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Check, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TIERS, type Tier } from '@/lib/tiers'
import { useScrollLock } from '@/hooks/useScrollLock'

interface PaywallPromptProps {
  isOpen: boolean
  onClose: () => void
  reason: string
  upgradeTo?: Tier
}

const TIER_PERKS: Record<Tier, string[]> = {
  free: ['5 active pins', '3 content per pin', '1 min videos', 'Basic analytics'],
  pro: ['20 active pins', '5 content per pin', '3 min videos', 'Advanced analytics', 'Live streaming', 'Scheduled content'],
  studio: ['50 active pins', '10 content per pin', '3 min videos', 'Everything in Pro', 'Saved map insights', 'Custom branding'],
}

export function PaywallPrompt({ isOpen, onClose, reason, upgradeTo = 'pro' }: PaywallPromptProps) {
  useScrollLock(isOpen)
  const navigate = useNavigate()
  const target = TIERS[upgradeTo]
  const perks = TIER_PERKS[upgradeTo]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-32px)] max-w-[420px] bg-warm-white rounded-[24px] shadow-2xl overflow-hidden"
          >
            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-tangerine to-ember p-6 text-white">
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors">
                <X size={16} />
              </button>
              <div className="w-12 h-12 rounded-[14px] bg-white/15 flex items-center justify-center mb-3">
                <Sparkles size={22} />
              </div>
              <h2 className="text-[22px] font-extrabold tracking-tight mb-1">Upgrade to {target.name}</h2>
              <p className="text-[14px] text-white/85">{reason}</p>
            </div>

            {/* Perks */}
            <div className="p-6 space-y-3">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[32px] font-extrabold text-ink font-mono">${target.price}</span>
                <span className="text-[14px] text-smoke">/month</span>
              </div>
              {perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-tangerine/15 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-tangerine" />
                  </div>
                  <span className="text-[14px] text-graphite">{perk}</span>
                </div>
              ))}

              <button
                onClick={() => { onClose(); navigate('/pricing') }}
                className="w-full mt-5 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-tangerine to-ember text-white font-bold text-[15px] shadow-glow-tangerine cursor-pointer hover:shadow-xl transition-shadow"
              >
                Upgrade to {target.name} <ArrowRight size={16} />
              </button>
              <button onClick={onClose} className="w-full text-center text-[13px] text-smoke font-medium cursor-pointer hover:text-ink transition-colors">
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
