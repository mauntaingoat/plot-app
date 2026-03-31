import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Loader2, AtSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useUsername } from '@/hooks/useUsername'

export function StepUsername() {
  const { username, setUsername, setUsernameAvailable, nextStep } = useOnboardingStore()
  const { available, checking, check } = useUsername()

  useEffect(() => {
    setUsernameAvailable(available)
  }, [available, setUsernameAvailable])

  const handleChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
    setUsername(cleaned)
    check(cleaned)
  }

  return (
    <div className="px-6 pt-8 pb-12 flex flex-col items-center">
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mb-6"
      >
        <AtSign size={36} className="text-white" />
      </motion.div>

      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Claim your Plot
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8 max-w-[280px]">
        Choose a unique username. This becomes your link.
      </p>

      {/* URL preview */}
      <div className="w-full bg-cream rounded-[16px] px-4 py-3 mb-4">
        <p className="text-[13px] text-smoke font-medium mb-1">Your Plot link</p>
        <p className="text-[18px] font-bold text-ink tracking-tight">
          plot.app/<span className={username ? 'text-tangerine' : 'text-ash'}>{username || 'username'}</span>
        </p>
      </div>

      {/* Input */}
      <div className="w-full relative mb-8">
        <input
          type="text"
          value={username}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="username"
          autoFocus
          className="
            w-full h-14 rounded-[16px] bg-cream border border-border-light
            px-4 text-[17px] font-semibold text-ink
            placeholder:text-ash focus:border-tangerine/40
            transition-all duration-200 outline-none
          "
        />

        {/* Status indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {checking && <Loader2 size={20} className="text-smoke animate-spin" />}
          {!checking && available === true && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-sold-green flex items-center justify-center"
            >
              <Check size={14} className="text-white" />
            </motion.div>
          )}
          {!checking && available === false && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-live-red flex items-center justify-center"
            >
              <X size={14} className="text-white" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Status text */}
      {!checking && available === false && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[13px] text-live-red mb-4 -mt-4"
        >
          This username is taken. Try another.
        </motion.p>
      )}
      {!checking && available === true && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[13px] text-sold-green mb-4 -mt-4"
        >
          Perfect, it's yours!
        </motion.p>
      )}

      <Button
        variant="primary"
        size="xl"
        fullWidth
        onClick={nextStep}
        disabled={!available || checking || username.length < 3}
      >
        Claim your Plot
      </Button>

      <p className="text-[11px] text-ash text-center mt-4">
        3-24 characters. Letters, numbers, and underscores only.
      </p>
    </div>
  )
}
