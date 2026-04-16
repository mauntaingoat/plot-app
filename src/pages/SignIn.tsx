import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { ArrowRight, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SEOHead } from '@/components/marketing/SEOHead'
import { GoogleLogo, AppleLogo } from '@/components/icons/PlatformLogos'
import { useAuthStore } from '@/stores/authStore'
import { auth, firebaseConfigured } from '@/config/firebase'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import type { UserDoc } from '@/lib/types'

export default function SignIn() {
  const navigate = useNavigate()
  const { setUserDoc } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!email.trim()) { setError('Enter an email'); return }
    setLoading(true); setError('')

    if (!firebaseConfigured) {
      const newUser: UserDoc = {
        uid: `demo-${Date.now()}`, email, role: 'agent',
        createdAt: Timestamp.now(), username: email.split('@')[0].toLowerCase(),
        displayName: email.split('@')[0], photoURL: null, bio: '',
        brokerage: null, licenseNumber: null, licenseState: null,
        licenseName: null, verificationStatus: 'unverified',
        fairHousingAccepted: false, dataSecurityAccepted: false,
        emailVerified: false, tier: 'free', brandColor: null,
        platforms: [],
        followerCount: 0, followingCount: 0, onboardingComplete: true,
        onboardingStep: 8, setupPercent: 20,
      }
      setUserDoc(newUser); setLoading(false); navigate('/dashboard')
      return
    }

    signInWithEmailAndPassword(auth!, email, password)
      .then(() => { navigate('/dashboard') })
      .catch((e: any) => { setError(e.code === 'auth/user-not-found' ? 'No account found' : 'Incorrect password') })
      .finally(() => setLoading(false))
  }

  const handleGoogle = async () => {
    if (!firebaseConfigured) { handleLogin(); return }
    setLoading(true)
    try {
      await signInWithPopup(auth!, new GoogleAuthProvider())
      navigate('/dashboard')
    } catch { setError('Google sign-in failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ivory flex">
      <SEOHead title="Sign In" path="/sign-in" />

      {/* Left: form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-12 max-w-[600px] mx-auto md:mx-0">
        <Link to="/" className="flex items-center gap-1.5 mb-10">
          <img src="/reelst-logo.png" alt="Reelst" className="w-8 h-8" />
          <span className="text-[20px] font-extrabold text-ink tracking-tight">Reelst</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Welcome back</h1>
            <p className="text-[15px] text-smoke">Sign in to your Reelst account</p>
          </div>

          <div className="space-y-3">
            <Button variant="secondary" size="xl" fullWidth icon={<GoogleLogo size={20} />} onClick={handleGoogle} loading={loading}>Continue with Google</Button>
            <Button variant="secondary" size="xl" fullWidth icon={<AppleLogo size={20} />} disabled>Continue with Apple</Button>
          </div>

          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-pearl" /><span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or</span><div className="flex-1 h-px bg-pearl" /></div>

          <div className="space-y-3">
            <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} />
            {firebaseConfigured && <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} />}
            {error && <p className="text-[12px] text-live-red">{error}</p>}
            <Button variant="primary" size="xl" fullWidth onClick={handleLogin} loading={loading} iconRight={<ArrowRight size={18} />}>Sign in</Button>
          </div>

          <p className="text-[13px] text-smoke">Don't have an account? <Link to="/sign-up" className="text-tangerine font-semibold">Get started</Link></p>
        </motion.div>
      </div>

      {/* Right: visual (desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-midnight to-obsidian items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-tangerine/8 rounded-full blur-[100px]" />
        </div>
        <div className="text-center">
          <img src="/reelst-logo.png" alt="" className="w-20 h-20 mx-auto mb-6 opacity-80" />
          <h2 className="text-[24px] font-extrabold text-white/80 tracking-tight mb-2">Your map awaits.</h2>
          <p className="text-[14px] text-ghost max-w-[280px] mx-auto">Sign in to manage your pins, view insights, and grow your audience.</p>
        </div>
      </div>
    </div>
  )
}
