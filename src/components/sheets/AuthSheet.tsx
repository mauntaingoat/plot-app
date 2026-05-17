import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { auth, firebaseConfigured } from '@/config/firebase'
import { createUserDoc, checkLicenseDuplicate, getUserById } from '@/lib/firestore'
import { sendVerificationEmail, verificationDeadline } from '@/lib/emailVerification'
import { useAuthStore } from '@/stores/authStore'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoogleLogo } from '@/components/icons/PlatformLogos'
import { Envelope as Mail, Lock, ArrowRight, ArrowLeft, At as AtSign, Check, X, CircleNotch as Loader2, Shield, Warning as AlertTriangle } from '@phosphor-icons/react'
import { useUsername } from '@/hooks/useUsername'
import { useLicense } from '@/hooks/useLicense'
import type { UserDoc } from '@/lib/types'

interface AuthSheetProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'login' | 'signup'
}

// Signup flow is agent-only — Reelst no longer has a consumer/browse
// role. Signup starts at 'claim-username'; the prior 'choose-role'
// step was removed along with the "I'm browsing" path.
type Step = 'claim-username' | 'license-verify' | 'create-account' | 'login'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export function AuthSheet({ isOpen, onClose, mode: initialMode = 'signup' }: AuthSheetProps) {
  const navigate = useNavigate()
  const { setUserDoc } = useAuthStore()
  const { available, checking, reserved, check } = useUsername()
  const { claim: claimLicense } = useLicense()

  const [step, setStep] = useState<Step>(initialMode === 'login' ? 'login' : 'claim-username')
  const [username, setUsernameVal] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // License verification state
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [licenseName, setLicenseName] = useState('')
  const [fairHousing, setFairHousing] = useState(false)
  const [dataSecurity, setDataSecurity] = useState(false)
  const [duplicateLicense, setDuplicateLicense] = useState<{ exists: boolean; username?: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStep(initialMode === 'login' ? 'login' : 'claim-username')
      setError('')
      setLicenseNumber('')
      setLicenseState('')
      setLicenseName('')
      setFairHousing(false)
      setDataSecurity(false)
      setDuplicateLicense(null)
    }
  }, [isOpen, initialMode])

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z]/g, '').slice(0, 24)
    setUsernameVal(cleaned)
    check(cleaned)
  }

  const handleCreateAccount = () => {
    if (!email.trim()) { setError('Enter an email'); return }
    if (!displayName.trim()) { setError('Enter your name'); return }
    setLoading(true)
    setError('')

    if (!firebaseConfigured) {
      // Demo mode
      const uid = `demo-${Date.now()}`
      const newUser: UserDoc = {
        uid,
        email,
        role: 'agent',
        agentType: 'agent',
        createdAt: Timestamp.now(),
        username,
        displayName: displayName || email.split('@')[0],
        photoURL: null,
        bio: '',
        brokerage: null,
        licenseNumber,
        licenseState,
        licenseName,
        verificationStatus: 'pending',
        fairHousingAccepted: fairHousing,
        dataSecurityAccepted: dataSecurity,
        emailVerified: false,
        platforms: [],
        onboardingComplete: false,
        onboardingStep: 2,
        tier: 'free', brandColor: null,
        setupPercent: 20,
      }
      setUserDoc(newUser)
      setLoading(false)
      onClose()
      navigate('/dashboard')
      return
    }

    // Firebase mode
    ;(async () => {
      try {
        const cred = await createUserWithEmailAndPassword(auth!, email, password)
        // 6-hour grace period for email verification — see UserDoc.expiresAt.
        const expiresAt = verificationDeadline()
        await createUserDoc(cred.user.uid, {
          email,
          role: 'agent',
          displayName: displayName || email.split('@')[0],
          username,
          licenseNumber,
          licenseState,
          licenseName,
          verificationStatus: 'pending',
          fairHousingAccepted: fairHousing,
          dataSecurityAccepted: dataSecurity,
          expiresAt: Timestamp.fromDate(expiresAt),
        } as Partial<UserDoc>)
        // Send email verification
        try { await sendVerificationEmail(cred.user) } catch {}
        if (licenseNumber && licenseState) {
          try { await claimLicense(licenseNumber, licenseState, cred.user.uid, username || null, expiresAt) }
          catch (err: any) {
            if (err?.code === 'permission-denied' || /already exists/i.test(err?.message || '')) {
              setError('That license number is already registered to another agent.')
              setLoading(false)
              return
            }
          }
        }
        onClose()
        navigate('/dashboard')
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
        licenseName: null,
        verificationStatus: 'unverified',
        fairHousingAccepted: false,
        dataSecurityAccepted: false,
        emailVerified: false,
        platforms: [],
        onboardingComplete: true,
        onboardingStep: 8,
        tier: 'free', brandColor: null,
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
      // Firebase merges Google sign-in into any existing UID for this
      // email. If a finished user doc already exists, this is a sign-IN
      // — just route to the dashboard. Never call createUserDoc on an
      // existing UID (it's now a no-op anyway, but defense in depth).
      const existing = await getUserById(cred.user.uid)
      if (existing && existing.onboardingComplete) {
        onClose()
        navigate('/dashboard')
        return
      }
      // Brand new user. Reelst is agents-only — there is no consumer
      // role. Default role: 'agent' so the dashboard works the moment
      // they land. Onboarding finishes the rest of the profile.
      await createUserDoc(cred.user.uid, {
        email: cred.user.email || '',
        displayName: cred.user.displayName || '',
        role: 'agent',
      }).catch(() => {})
      onClose()
      navigate('/dashboard')
    } catch { setError('Google sign-in failed') }
    finally { setLoading(false) }
  }

  return (
    <ResponsiveSheet isOpen={isOpen} onClose={onClose} zIndex={150}>
      <div className="px-6 pb-8 pt-4 md:pt-6">
        

          {/* ── Step: Claim Username (Agent only) ── */}
          {step === 'claim-username' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mx-auto mb-3">
                  <AtSign size={28} className="text-white" />
                </div>
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">Claim your Reelst</h2>
                <p className="text-[14px] text-smoke">Choose your unique link</p>
              </div>

              {/* URL preview */}
              <div className="bg-cream rounded-[14px] px-4 py-3">
                <p className="text-[12px] text-smoke font-medium mb-0.5">Your Reelst link</p>
                <p className="text-[17px] font-bold text-ink">
                  reel.st/<span className={username ? 'text-tangerine' : 'text-ash'}>{username || '...'}</span>
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

              {!checking && available === false && (
                <p className="text-[12px] text-live-red -mt-2">
                  {reserved ? 'Reserved. Try another.' : 'Taken. Try another.'}
                </p>
              )}

              <p className="text-center text-[13px] text-smoke">
                Already have an account?{' '}
                <button onClick={() => setStep('login')} className="text-tangerine font-semibold">Sign in</button>
              </p>

              <Button variant="primary" size="xl" fullWidth onClick={() => setStep('license-verify')} disabled={!available || checking || username.length < 3}>
                Continue
              </Button>
            </div>
          )}

          {/* ── Step: License Verification (Agent only) ── */}
          {step === 'license-verify' && (
            <div className="space-y-5">
              <button onClick={() => setStep('claim-username')} className="flex items-center gap-1 text-[13px] text-smoke font-medium cursor-pointer">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="text-center space-y-1">
                <div className="w-16 h-16 rounded-[18px] bg-tangerine/10 flex items-center justify-center mx-auto mb-3">
                  <Shield size={28} className="text-tangerine" />
                </div>
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">Verify your license</h2>
                <p className="text-[14px] text-smoke">We verify all agents to protect homebuyers</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Legal name (as on license)"
                  value={licenseName}
                  onChange={(e) => setLicenseName(e.target.value)}
                />
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <Input
                    placeholder="License number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                  />
                  <select
                    value={licenseState}
                    onChange={(e) => setLicenseState(e.target.value)}
                    className="h-14 rounded-[14px] bg-cream border border-border-light px-3 text-[15px] font-medium text-ink outline-none cursor-pointer"
                  >
                    <option value="">State</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Duplicate license warning */}
                {duplicateLicense?.exists && (
                  <div className="flex items-start gap-3 bg-open-amber/10 rounded-[14px] p-4">
                    <AlertTriangle size={18} className="text-open-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-semibold text-ink">This license is already registered</p>
                      <p className="text-[12px] text-smoke mt-0.5">
                        An account with this license already exists. If this is you, please sign in instead. If you believe this is an error, contact hello@reelst.co.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Compliance checkboxes */}
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={fairHousing} onChange={(e) => setFairHousing(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-tangerine cursor-pointer"
                  />
                  <span className="text-[13px] text-smoke leading-snug">
                    I commit to fair housing practices and will not discriminate based on race, color, religion, sex, disability, familial status, or national origin.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={dataSecurity} onChange={(e) => setDataSecurity(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-tangerine cursor-pointer"
                  />
                  <span className="text-[13px] text-smoke leading-snug">
                    I acknowledge that Reelst uses HTTPS encryption and I agree to the <button onClick={() => window.open('/terms', '_blank')} className="text-tangerine font-medium">Terms of Use</button> and <button onClick={() => window.open('/privacy', '_blank')} className="text-tangerine font-medium">Privacy Policy</button>.
                  </span>
                </label>
              </div>

              {error && <p className="text-[12px] text-live-red">{error}</p>}

              <Button
                variant="primary" size="xl" fullWidth
                disabled={!licenseName.trim() || !licenseNumber.trim() || !licenseState || !fairHousing || !dataSecurity || duplicateLicense?.exists}
                loading={loading}
                onClick={async () => {
                  setError('')
                  setLoading(true)
                  try {
                    const result = await checkLicenseDuplicate(licenseNumber, licenseState)
                    if (result.exists) {
                      setDuplicateLicense(result)
                      setLoading(false)
                      return
                    }
                    setDuplicateLicense(null)
                    setDisplayName(licenseName) // pre-fill display name from license name
                    setStep('create-account')
                  } catch {
                    setError('Could not verify license. Try again.')
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                Continue
              </Button>
            </div>
          )}

          {/* ── Step: Create Account ── */}
          {step === 'create-account' && (
            <div className="space-y-5">
              <button onClick={() => setStep('license-verify')} className="flex items-center gap-1 text-[13px] text-smoke font-medium cursor-pointer">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="text-center space-y-1">
                <h2 className="text-[24px] font-extrabold text-ink tracking-tight">Create your account</h2>
                {username && (
                  <p className="text-[14px] text-smoke">Securing <span className="text-tangerine font-bold">reel.st/{username}</span></p>
                )}
              </div>

              <div className="space-y-3">
                <Button variant="secondary" size="xl" fullWidth icon={<GoogleLogo size={20} />} onClick={handleGoogle} loading={loading}>
                  Continue with Google
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-pearl" />
                <span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-pearl" />
              </div>

              <div className="space-y-3">
                <Input placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} />
                {firebaseConfigured && (
                  <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} />
                )}
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <Button variant="primary" size="xl" fullWidth onClick={handleCreateAccount} loading={loading} iconRight={<ArrowRight size={18} />}>
                  Get started
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Login ── */}
          {step === 'login' && (
            <div className="space-y-5">
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
                <button onClick={() => setStep('claim-username')} className="text-tangerine font-semibold">Sign up</button>
              </p>
            </div>
          )}

        
      </div>
    </ResponsiveSheet>
  )
}
