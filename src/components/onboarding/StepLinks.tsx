import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'

export function StepLinks() {
  const {
    selectedPlatforms, platformLinks, setPlatformLink,
    nextStep, prevStep,
  } = useOnboardingStore()

  return (
    <div className="px-6 pt-8 pb-12">
      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Connect your links
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        Add your usernames or URLs. All optional.
      </p>

      <div className="space-y-4 mb-8">
        {selectedPlatforms.map((platformId, i) => {
          const platform = PLATFORM_LIST.find((p) => p.id === platformId)
          const Logo = PLATFORM_LOGOS[platformId]
          if (!platform) return null

          return (
            <motion.div
              key={platformId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Input
                label={platform.name}
                placeholder={platformId === 'website' ? 'https://yoursite.com' : `@${platformId} username`}
                value={platformLinks[platformId] || ''}
                onChange={(e) => setPlatformLink(platformId, e.target.value)}
                icon={Logo ? <Logo size={18} /> : undefined}
              />
            </motion.div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="xl" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button variant="primary" size="xl" onClick={nextStep} className="flex-[2]">
          Continue
        </Button>
      </div>
    </div>
  )
}
