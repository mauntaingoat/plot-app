import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useAuthStore } from '@/stores/authStore'
import { updateUserDoc, calculateSetupPercent } from '@/lib/firestore'
import { uploadFile, avatarPath } from '@/lib/storage'
import { useNavigate } from 'react-router-dom'

export function StepComplete() {
  const navigate = useNavigate()
  const { username, displayName, bio, photoFile, photoPreview, selectedPlatforms, platformLinks, licenseState, licenseNumber, agentType, close, reset } = useOnboardingStore()
  const { firebaseUser } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!firebaseUser || done) return

    const save = async () => {
      setSaving(true)
      try {
        let photoURL: string | null = null
        if (photoFile) {
          photoURL = await uploadFile({
            path: avatarPath(firebaseUser.uid),
            file: photoFile,
          })
        }

        const platforms = selectedPlatforms
          .filter((id) => platformLinks[id])
          .map((id) => ({ id, username: platformLinks[id] }))

        const userData = {
          username,
          displayName,
          bio,
          photoURL,
          agentType: agentType || undefined,
          platforms,
          licenseState: licenseState || null,
          licenseNumber: licenseNumber || null,
          onboardingComplete: true,
          onboardingStep: 8,
        }

        await updateUserDoc(firebaseUser.uid, {
          ...userData,
          setupPercent: calculateSetupPercent(userData as any, 0),
        } as any)

        setDone(true)
      } catch (e) {
        console.error('Failed to save profile:', e)
      } finally {
        setSaving(false)
      }
    }

    save()
  }, [firebaseUser]) // eslint-disable-line

  const handleContinue = () => {
    close()
    reset()
    navigate('/dashboard')
  }

  return (
    <div className="px-6 pt-12 pb-12 flex flex-col items-center text-center">
      {/* Confetti-style particles */}
      {done && (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                opacity: 1,
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{
                opacity: 0,
                scale: 1,
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 300,
              }}
              transition={{ duration: 1.2, delay: i * 0.05, ease: 'easeOut' }}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ['#FF6B3D', '#3B82F6', '#34C759', '#FFAA00', '#A855F7'][i % 5],
                top: '30%',
                left: '50%',
              }}
            />
          ))}
        </>
      )}

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10, stiffness: 150, delay: 0.2 }}
        className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mb-6"
      >
        <Sparkles size={42} className="text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-[32px] font-extrabold text-ink tracking-tight mb-2"
      >
        You're all set!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-[15px] text-smoke mb-8"
      >
        Your Reelst is live and ready to share.
      </motion.p>

      {/* Profile card preview */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay: 0.6, type: 'spring', damping: 20 }}
        className="w-full bg-cream rounded-[20px] p-5 mb-6 shadow-lg"
      >
        <div className="flex items-center gap-3 mb-4">
          <Avatar src={photoPreview} name={displayName} size={52} ring="story" />
          <div className="text-left">
            <p className="text-[16px] font-bold text-ink">{displayName || 'Your name'}</p>
            <p className="text-[13px] text-tangerine font-medium">@{username}</p>
          </div>
        </div>
        {bio && <p className="text-[14px] text-graphite text-left">{bio}</p>}

        <div className="mt-4 flex items-center gap-2 bg-pearl rounded-xl px-3 py-2">
          <ExternalLink size={14} className="text-smoke" />
          <span className="text-[13px] text-smoke">reel.st/{username}</span>
        </div>
      </motion.div>

      <Button
        variant="primary"
        size="xl"
        fullWidth
        onClick={handleContinue}
        loading={saving}
        disabled={saving}
      >
        {saving ? 'Saving your profile...' : 'Continue building your Reelst'}
      </Button>
    </div>
  )
}
