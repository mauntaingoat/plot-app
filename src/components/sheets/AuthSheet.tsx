import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { auth, firebaseConfigured } from '@/config/firebase'
import { createUserDoc } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoogleLogo, AppleLogo } from '@/components/icons/PlatformLogos'
import { Mail, Lock, ArrowRight, ArrowLeft, MapPin, Eye, AtSign, Check, X, Loader2 } from 'lucide-react'
import { useUsername } from '@/hooks/useUsername'
import type { UserDoc } from '@/lib/types'

interface AuthSheetProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'signup'
}

type Step = 'choose-role' | 'claim-username' | 'create-account' | 'login'

export function AuthSheet({ isOpen, onClose, mode: initialMode = 'signup' }: AuthSheetProps) {
  const navigate = useNavigate()
  const { setUserDoc } = useAuthStore()
  const { available, checking, check } = useUsername()

  const [step, setStep] = useState<Step>(initialMode === 'login' ? 'login' : 'choose-role')
  const [role, setRole] = useState<'agent' | 'consumer' | null>(null)
  const [username, setUsernameVal] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep(initialMode === 'login' ? 'login' : 'choose-role')
      setError('')
    }
  }, [isOpen, initialMode])

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
    setUsernameVal(cleaned)
    check(cleaned)
  }

  const handleCreateAccount = () => {
    if (!email.trim()) { setError('Enter an email'); return }
    if (role === 'agent' && !displayName.trim()) { setError('Enter your name'); return }
    setLoading(true)
    setError('')

    if (!firebaseConfigured) {
      // Demo mode
      const uid = `demo-${Date.now()}`
      const newUser: UserDoc = {
        uid,
        email,
        role: role || 'consumer',
        agentType: role === 'agent' ? 'agent' : undefined,
        createdAt: Timestamp.now(),
        username: role === 'agent' ? username : null,
        displayName: displayName || email.split('@')[0],
        photoURL: null,
        bio: '',
        brokerage: null,
        licenseNumber: null,
        licenseState: null,
        platforms: [],
        followerCount: 0,
        followingCount: 0,
        onboardingComplete: role === 'consumer',
        onboardingStep: role === 'consumer' ? 8 : 2,
        setupPercent: role === 'agent' ? 20 : 0,
      }
      setUserDoc(newUser)
      setLoading(false)
      onClose()
      if (role === 'agent') navigate('/dashboard')
      return
    }

    // Firebase mode
    ;(async () => {
      try {
        const cred = await createUserWithEmailAndPassword(auth!, email, password)
        await createUserDoc(cred.user.uid, {
          email,
          role: role || 'consumer',
          displayName: displayName || email.split('@')[0],
          username: role === 'agent' ? username : null,
        })
        onClose()
        if (role === 'agent') navigate('/dashboard')
      } catch (e: any) {
        setError(e.code === 'auth/email-already-in-use' ? 'Email already in use' : e.code === 'auth/weak-password' ? 'Password needs 6+ chars' : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    })()
  }

  const handleLogin = () => {
    if (!email.trim()) { setError('Enter an email'); return }
    setLoading(true)
    setError('')

    if (!firebaseConfigured) {
      // Demo: just create a mock agent user
      const newUser: UserDoc = {
        uid: `demo-${Date.now()}`,
        email,
        role: 'agent',
        createdAt: Timestamp.now(),
        username: email.split('@')[0].toLowerCase(),
        displayName: email.split('@')[0],
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
      return
    }

    signInWithEmailAndPassword(auth!, email, password)
      .then(() => { onClose(); navigate('/dashboard') })
      .catch((e: any) => { setError(e.code === 'auth/user-not-found' ? 'No account found' : 'Incorrect password') })
      .finally(() => setLoading(false))
  }

  const handleGoogle = async () => {
    if (!firebaseConfigured) { handleCreateAccount(); return }
    setLoading(true)
    try {
      const cred = await signInWithPopup(auth!, new GoogleAuthProvider())
      await createUserDoc(cred.user.uid, { email: cred.user.email || '', displayName: cred.user.displayName || '', role: role || 'consumer' }).catch(() => {})
      onClose()
      if (role === 'agent') navigate('/dashboard')
    } catch { setError('Google sign-in failed') }
    finally { setLoading(false) }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-6 pb-8 pt-2">
        <AnimatePresence mode="wait">

          {/* ── Step: Choose Role ── */}
          {step === 'choose-role' && (
            <motion.div key="role" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">Join Reeltor</h2>
                <p className="text-[14px] text-smoke">How do you want to use Reeltor?</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setRole('agent'); setStep('claim-username') }}
                  className="w-full flex items-center gap-4 p-5 rounded-[18px] bg-cream border-2 border-transparent hover:border-tangerine/30 text-left cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center">
                    <MapPin size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-ink">I'm an agent</p>
                    <p className="text-[13px] text-smoke">Claim your Reeltor link, add pins, grow your audience</p>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setRole('consumer'); setStep('create-account') }}
                  className="w-full flex items-center gap-4 p-5 rounded-[18px] bg-cream border-2 border-transparent hover:border-listing-blue/30 text-left cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-[14px] bg-listing-blue/15 flex items-center justify-center">
                    <Eye size={22} className="text-listing-blue" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-ink">I'm browsing</p>
                    <p className="text-[13px] text-smoke">Save listings, follow agents, explore neighborhoods</p>
                  </div>
                </motion.button>
              </div>

              <p className="text-center text-[13px] text-smoke">
                Already have an account?{' '}
                <button onClick={() => setStep('login')} className="text-tangerine font-semibold">Sign in</button>
              </p>
            </motion.div>
          )}

          {/* ── Step: Claim Username (Agent only) ── */}
          {step === 'claim-username' && (
            <motion.div key="username" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-5">
              <button onClick={() => setStep('choose-role')} className="flex items-center gap-1 text-[13px] text-smoke font-medium">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="text-center space-y-1">
                <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mx-auto mb-3">
                  <AtSign size={28} className="text-white" />
                </div>
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">Claim your Reeltor</h2>
                <p className="text-[14px] text-smoke">Choose your unique link</p>
              </div>

              {/* URL preview */}
              <div className="bg-cream rounded-[14px] px-4 py-3">
                <p className="text-[12px] text-smoke font-medium mb-0.5">Your Reeltor link</p>
                <p className="text-[17px] font-bold text-ink">
                  reeltor.co/<span className={username ? 'text-tangerine' : 'text-ash'}>{username || '...'}</span>
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="username"
                  autoFocus
                  className="w-full h-14 rounded-[14px] bg-cream border border-border-light px-4 text-[17px] font-semibold text-ink placeholder:text-ash focus:border-tangerine/40 transition-all outline-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 size={18} className="text-smoke animate-spin" />}
                  {!checking && available === true && <div className="w-5 h-5 rounded-full bg-sold-green flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  {!checking && available === false && <div className="w-5 h-5 rounded-full bg-live-red flex items-center justify-center"><X size={12} className="text-white" /></div>}
                </div>
              </div>

              {!checking && available === false && <p className="text-[12px] text-live-red -mt-2">Taken. Try another.</p>}

              <Button variant="primary" size="xl" fullWidth onClick={() => setStep('create-account')} disabled={!available || checking || username.length < 3}>
                Continue
              </Button>
            </motion.div>
          )}

          {/* ── Step: Create Account ── */}
          {step === 'create-account' && (
            <motion.div key="create" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-5">
              <button onClick={() => setStep(role === 'agent' ? 'claim-username' : 'choose-role')} className="flex items-center gap-1 text-[13px] text-smoke font-medium">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="text-center space-y-1">
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">
                  {role === 'agent' ? 'Create your account' : 'Create account'}
                </h2>
                {role === 'agent' && username && (
                  <p className="text-[14px] text-smoke">Securing <span className="text-tangerine font-bold">reeltor.co/{username}</span></p>
                )}
              </div>

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
                {role === 'agent' && (
                  <Input placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                )}
                <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} />
                {firebaseConfigured && (
                  <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} />
                )}
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <Button variant="primary" size="xl" fullWidth onClick={handleCreateAccount} loading={loading} iconRight={<ArrowRight size={18} />}>
                  {role === 'agent' ? 'Get started' : 'Create account'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step: Login ── */}
          {step === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">Welcome back</h2>
                <p className="text-[14px] text-smoke">Sign in to your account</p>
              </div>

              <div className="space-y-3">
                <Button variant="secondary" size="xl" fullWidth icon={<GoogleLogo size={20} />} onClick={handleGoogle} loading={loading}>Continue with Google</Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-pearl" />
                <span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-pearl" />
              </div>

              <div className="space-y-3">
                <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} />
                {firebaseConfigured && (
                  <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} />
                )}
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <Button variant="primary" size="xl" fullWidth onClick={handleLogin} loading={loading} iconRight={<ArrowRight size={18} />}>Sign in</Button>
              </div>

              <p className="text-center text-[13px] text-smoke">
                Don't have an account?{' '}
                <button onClick={() => setStep('choose-role')} className="text-tangerine font-semibold">Sign up</button>
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </BottomSheet>
  )
}
