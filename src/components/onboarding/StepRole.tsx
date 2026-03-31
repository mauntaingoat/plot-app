import { motion } from 'framer-motion'
import { Home, Users, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useOnboardingStore } from '@/stores/onboardingStore'
import type { AgentType } from '@/lib/types'

const ROLES: { type: AgentType; label: string; desc: string; icon: typeof Home }[] = [
  { type: 'agent', label: 'Real Estate Agent', desc: 'Individual agent with listings', icon: Home },
  { type: 'brokerage', label: 'Brokerage / Team', desc: 'Managing multiple agents', icon: Users },
  { type: 'developer', label: 'Developer', desc: 'Building and selling properties', icon: Building2 },
]

export function StepRole() {
  const { agentType, setAgentType, nextStep, prevStep } = useOnboardingStore()

  return (
    <div className="px-6 pt-8 pb-12">
      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        What best describes you?
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        This helps us tailor your experience.
      </p>

      <div className="space-y-3 mb-8">
        {ROLES.map((role, i) => {
          const Icon = role.icon
          const selected = agentType === role.type
          return (
            <motion.button
              key={role.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', damping: 25 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setAgentType(role.type)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-[16px] text-left cursor-pointer
                border-2 transition-all duration-200
                ${selected
                  ? 'border-tangerine bg-tangerine-soft'
                  : 'border-border-light bg-cream hover:bg-pearl'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-[14px] flex items-center justify-center
                ${selected ? 'bg-tangerine text-white' : 'bg-pearl text-smoke'}
              `}>
                <Icon size={22} />
              </div>
              <div>
                <p className={`text-[15px] font-bold ${selected ? 'text-tangerine' : 'text-ink'}`}>
                  {role.label}
                </p>
                <p className="text-[13px] text-smoke">{role.desc}</p>
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="xl" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button variant="primary" size="xl" onClick={nextStep} disabled={!agentType} className="flex-[2]">
          Continue
        </Button>
      </div>
    </div>
  )
}
