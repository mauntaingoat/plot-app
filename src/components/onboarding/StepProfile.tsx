import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, User } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useOnboardingStore } from '@/stores/onboardingStore'

export function StepProfile() {
  const {
    displayName, setDisplayName,
    bio, setBio,
    photoPreview, setPhotoFile, setPhotoPreview,
    nextStep, prevStep,
  } = useOnboardingStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }, [setPhotoFile, setPhotoPreview])

  return (
    <div className="px-6 pt-8 pb-12">
      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Make it yours
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        Add a photo and tell people about yourself.
      </p>

      {/* Avatar upload */}
      <div className="flex justify-center mb-8">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => fileRef.current?.click()}
          className="relative w-28 h-28 rounded-full bg-cream border-2 border-dashed border-pearl overflow-hidden cursor-pointer group"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-ash group-hover:text-smoke transition-colors">
              <User size={32} />
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-tangerine flex items-center justify-center shadow-lg">
            <Camera size={16} className="text-white" />
          </div>
        </motion.button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          className="hidden"
        />
      </div>

      <div className="space-y-4 mb-8">
        <Input
          label="Display name"
          placeholder="How people will see you"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <div>
          <label className="text-[13px] font-medium tracking-wide uppercase text-smoke mb-1.5 block">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="Tell people what you're about..."
            rows={3}
            className="
              w-full rounded-[14px] bg-cream border border-border-light
              px-4 py-3 text-[15px] text-ink resize-none
              placeholder:text-ash focus:border-tangerine/40
              transition-all duration-200 outline-none
            "
          />
          <p className="text-[11px] text-ash text-right mt-1">{bio.length}/160</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="xl" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button variant="primary" size="xl" onClick={nextStep} disabled={!displayName.trim()} className="flex-[2]">
          Continue
        </Button>
      </div>
    </div>
  )
}
