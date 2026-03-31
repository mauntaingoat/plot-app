import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export function StepLinks() {
  const {
    selectedPlatforms, platformLinks, setPlatformLink,
    licenseState, setLicenseState, licenseNumber, setLicenseNumber,
    nextStep, prevStep, agentType,
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

      {/* License verification */}
      {(agentType === 'agent' || agentType === 'brokerage') && (
        <div className="bg-cream rounded-[16px] p-4 space-y-3 mb-8">
          <p className="text-[13px] font-bold text-ink">License Verification</p>
          <p className="text-[12px] text-smoke">Optional. Verified agents get a badge.</p>
          <div className="flex gap-3">
            <div className="w-24">
              <select
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                className="w-full h-12 rounded-[14px] bg-warm-white border border-border-light px-3 text-[14px] text-ink"
              >
                <option value="">State</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <Input
                placeholder="License number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

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
