import { motion } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'

export function StepPlatforms() {
  const { selectedPlatforms, togglePlatform, nextStep, prevStep } = useOnboardingStore()

  return (
    <div className="px-6 pt-8 pb-12">
      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Where are you active?
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        Select up to 5 platforms to link to your Reelst.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {PLATFORM_LIST.map((platform, i) => {
          const selected = selectedPlatforms.includes(platform.id)
          const Logo = PLATFORM_LOGOS[platform.id]
          return (
            <motion.button
              key={platform.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', damping: 20 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => togglePlatform(platform.id)}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-[16px] cursor-pointer
                border-2 transition-all duration-200
                ${selected
                  ? 'border-tangerine bg-tangerine-soft'
                  : 'border-border-light bg-cream hover:bg-pearl'
                }
              `}
            >
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-tangerine flex items-center justify-center"
                >
                  <Check size={12} className="text-white" />
                </motion.div>
              )}
              {Logo && <Logo size={28} />}
              <span className={`text-[12px] font-semibold ${selected ? 'text-tangerine' : 'text-graphite'}`}>
                {platform.name}
              </span>
            </motion.button>
          )
        })}
      </div>

      <p className="text-[12px] text-ash text-center mb-6">
        {selectedPlatforms.length}/5 selected
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" size="xl" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button variant="primary" size="xl" onClick={nextStep} className="flex-[2]">
          {selectedPlatforms.length > 0 ? 'Continue' : 'Skip'}
        </Button>
      </div>
    </div>
  )
}
