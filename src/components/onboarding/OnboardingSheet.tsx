import { motion, AnimatePresence } from 'framer-motion'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useOnboardingStore, ONBOARDING_STEPS } from '@/stores/onboardingStore'
import { StepUsername } from './StepUsername'
import { StepAuth } from './StepAuth'
import { StepRole } from './StepRole'
import { StepPlatforms } from './StepPlatforms'
import { StepLinks } from './StepLinks'
import { StepProfile } from './StepProfile'
import { StepFirstPin } from './StepFirstPin'
import { StepComplete } from './StepComplete'

const STEP_COMPONENTS = [
  StepUsername,
  StepAuth,
  StepRole,
  StepPlatforms,
  StepLinks,
  StepProfile,
  StepFirstPin,
  StepComplete,
]

export function OnboardingSheet() {
  const { isOpen, close, currentStep, direction } = useOnboardingStore()

  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <BottomSheet isOpen={isOpen} onClose={close} fullHeight>
      <div className="flex flex-col h-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-6 py-3">
          {ONBOARDING_STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === currentStep ? 24 : 6,
                backgroundColor: i <= currentStep ? '#FF6B3D' : '#EDEAE4',
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="h-[6px] rounded-full"
            />
          ))}
        </div>

        {/* Step content with slide animation */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BottomSheet>
  )
}
