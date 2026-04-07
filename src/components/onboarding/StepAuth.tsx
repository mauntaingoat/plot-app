import { useState } from 'react'
import { motion } from 'framer-motion'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { createUserDoc } from '@/lib/firestore'
import { useUsername } from '@/hooks/useUsername'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoogleLogo, AppleLogo } from '@/components/icons/PlatformLogos'
import { Mail, Lock, Shield } from 'lucide-react'

export function StepAuth() {
  const { email, setEmail, password, setPassword, username, nextStep } = useOnboardingStore()
  const { claim } = useUsername()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const finishAuth = async (uid: string, userEmail: string, displayName?: string, photoURL?: string | null) => {
    // Create user doc
    await createUserDoc(uid, {
      email: userEmail,
      role: 'agent',
      displayName: displayName || '',
      photoURL: photoURL || null,
      onboardingComplete: false,
      onboardingStep: 2,
    })

    // Claim username
    await claim(username, uid)

    nextStep()
  }

  const handleEmail = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await finishAuth(cred.user.uid, email)
    } catch (e: any) {
      const msg = e.code === 'auth/email-already-in-use' ? 'This email is already registered'
        : e.code === 'auth/weak-password' ? 'Password needs 6+ characters'
        : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      await finishAuth(
        cred.user.uid,
        cred.user.email || '',
        cred.user.displayName || '',
        cred.user.photoURL
      )
    } catch {
      setError('Google sign-in cancelled')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-6 pt-8 pb-12">
      <motion.div
        initial={{ scale: 0, rotate: 15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mx-auto mb-6"
      >
        <Shield size={36} className="text-white" />
      </motion.div>

      <h1 className="text-[28px] font-extrabold text-ink tracking-tight text-center mb-2">
        Create your account
      </h1>
      <p className="text-[15px] text-smoke text-center mb-8">
        Secure your Reelst at <span className="font-bold text-tangerine">reel.st/{username}</span>
      </p>

      <div className="space-y-3 mb-6">
        <Button variant="secondary" size="xl" fullWidth icon={<GoogleLogo size={20} />} onClick={handleGoogle} loading={loading}>
          Continue with Google
        </Button>
        <Button variant="secondary" size="xl" fullWidth icon={<AppleLogo size={20} />} disabled>
          Continue with Apple
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-pearl" />
        <span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or with email</span>
        <div className="flex-1 h-px bg-pearl" />
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={16} />}
        />
        <Input
          placeholder="Create password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={16} />}
          error={error}
          hint="At least 6 characters"
        />
        <Button variant="primary" size="xl" fullWidth onClick={handleEmail} loading={loading}>
          Create account
        </Button>
      </div>
    </div>
  )
}
