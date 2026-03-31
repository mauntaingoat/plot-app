import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { auth, firebaseConfigured } from '@/config/firebase'
import { createUserDoc } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoogleLogo, AppleLogo } from '@/components/icons/PlatformLogos'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import type { UserDoc } from '@/lib/types'

interface AuthSheetProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'signup'
}

export function AuthSheet({ isOpen, onClose, mode: initialMode = 'login' }: AuthSheetProps) {
  const navigate = useNavigate()
  const { setUserDoc } = useAuthStore()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync mode when prop changes
  useEffect(() => { setMode(initialMode) }, [initialMode])

  const handleDemoAuth = () => {
    if (mode === 'signup' && !displayName.trim()) {
      setError('Enter your name')
      return
    }
    if (!email.trim()) {
      setError('Enter an email')
      return
    }

    setLoading(true)
    // Demo mode — create a local user doc and go to dashboard
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
    const newUser: UserDoc = {
      uid: `demo-${Date.now()}`,
      email,
      role: 'agent',
      agentType: 'agent',
      createdAt: Timestamp.now(),
      username,
      displayName: mode === 'signup' ? displayName : email.split('@')[0],
      photoURL: null,
      bio: '',
      brokerage: null,
      licenseNumber: null,
      licenseState: null,
      platforms: [],
      followerCount: 0,
      followingCount: 0,
      onboardingComplete: true,
      onboardingStep: 8,
      setupPercent: 20,
    }
    setUserDoc(newUser)
    setLoading(false)
    onClose()
    navigate('/dashboard')
  }

  const handleEmailAuth = async () => {
    if (!firebaseConfigured) {
      handleDemoAuth()
      return
    }

    if (!email || !password) return
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth!, email, password)
        await createUserDoc(cred.user.uid, {
          email: cred.user.email || email,
          role: 'agent',
          displayName: displayName || email.split('@')[0],
        })
      } else {
        await signInWithEmailAndPassword(auth!, email, password)
      }
      onClose()
      navigate('/dashboard')
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
    if (!firebaseConfigured || !auth) {
      handleDemoAuth()
      return
    }
    setLoading(true)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      await createUserDoc(cred.user.uid, {
        email: cred.user.email || '',
        displayName: cred.user.displayName || '',
        photoURL: cred.user.photoURL || null,
        role: 'agent',
      }).catch(() => {})
      onClose()
      navigate('/dashboard')
    } catch {
      setError('Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-6 pb-8 pt-2 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-[24px] font-extrabold text-ink tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Claim your Plot'}
          </h2>
          <p className="text-[14px] text-smoke">
            {mode === 'login' ? 'Sign in to your agent dashboard' : 'Create your agent profile in seconds'}
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-3">
          <Button variant="secondary" size="xl" fullWidth icon={<GoogleLogo size={20} />} onClick={handleGoogle} loading={loading}>
            Continue with Google
          </Button>
          <Button variant="secondary" size="xl" fullWidth icon={<AppleLogo size={20} />} disabled>
            Continue with Apple
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-pearl" />
          <span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-pearl" />
        </div>

        <div className="space-y-3">
          {mode === 'signup' && (
            <Input
              placeholder="Full name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <Input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
          />
          {firebaseConfigured && (
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              error={error}
            />
          )}
          {!firebaseConfigured && error && (
            <p className="text-[12px] text-live-red">{error}</p>
          )}
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={handleEmailAuth}
            loading={loading}
            iconRight={<ArrowRight size={18} />}
          >
            {mode === 'login' ? 'Sign in' : 'Get started'}
          </Button>
        </div>

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
      </div>
    </BottomSheet>
  )
}
