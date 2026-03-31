import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { createUserDoc } from '@/lib/firestore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoogleLogo, AppleLogo } from '@/components/icons/PlatformLogos'
import { Mail, Lock, ArrowRight } from 'lucide-react'

interface AuthSheetProps {
  isOpen: boolean
  onClose: () => void
  onOpenOnboarding?: () => void
  mode?: 'login' | 'signup'
}

export function AuthSheet({ isOpen, onClose, onOpenOnboarding, mode: initialMode = 'login' }: AuthSheetProps) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailAuth = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await createUserDoc(cred.user.uid, {
          email: cred.user.email || email,
          role: 'consumer',
        })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onClose()
    } catch (e: any) {
      const msg = e.code === 'auth/user-not-found' ? 'No account found'
        : e.code === 'auth/wrong-password' ? 'Incorrect password'
        : e.code === 'auth/email-already-in-use' ? 'Email already in use'
        : e.code === 'auth/weak-password' ? 'Password must be 6+ characters'
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
      // Create user doc if first time
      await createUserDoc(cred.user.uid, {
        email: cred.user.email || '',
        displayName: cred.user.displayName || '',
        photoURL: cred.user.photoURL || null,
        role: 'consumer',
      }).catch(() => {}) // ignore if doc already exists
      onClose()
    } catch {
      setError('Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-6 pb-8 pt-2 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-[24px] font-extrabold text-ink tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[14px] text-smoke">
            {mode === 'login' ? 'Sign in to save and follow' : 'Join to explore and connect'}
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Button
            variant="secondary"
            size="xl"
            fullWidth
            icon={<GoogleLogo size={20} />}
            onClick={handleGoogle}
            loading={loading}
          >
            Continue with Google
          </Button>
          <Button
            variant="secondary"
            size="xl"
            fullWidth
            icon={<AppleLogo size={20} />}
            disabled
          >
            Continue with Apple
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-pearl" />
          <span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-pearl" />
        </div>

        {/* Email form */}
        <div className="space-y-3">
          <Input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={16} />}
            error={error}
          />
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={handleEmailAuth}
            loading={loading}
            iconRight={<ArrowRight size={18} />}
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-[13px] text-smoke">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-tangerine font-semibold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Agent CTA */}
        {onOpenOnboarding && (
          <div className="bg-cream rounded-[16px] p-4 text-center">
            <p className="text-[13px] text-graphite mb-2">Are you a real estate agent?</p>
            <Button
              variant="primary"
              size="md"
              onClick={() => { onClose(); onOpenOnboarding() }}
            >
              Claim your Plot
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
