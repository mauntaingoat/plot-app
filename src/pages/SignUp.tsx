import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { ArrowRight, ArrowLeft, AtSign, MapPin, Eye, Check, X, Loader2, Mail, Lock, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SEOHead } from '@/components/marketing/SEOHead'
import { GoogleLogo, AppleLogo } from '@/components/icons/PlatformLogos'
import { useUsername } from '@/hooks/useUsername'
import { useAuthStore } from '@/stores/authStore'
import { auth, firebaseConfigured } from '@/config/firebase'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { createUserDoc, checkLicenseDuplicate } from '@/lib/firestore'
import { sendEmailVerification } from 'firebase/auth'
import type { UserDoc } from '@/lib/types'

type Step = 'role' | 'username' | 'license' | 'account'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export default function SignUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUserDoc } = useAuthStore()
  const { available, checking, check } = useUsername()

  // Pre-fill username from URL param (from claim form on Home/Footer)
  const prefillUsername = searchParams.get('username')?.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || ''

  const [step, _setStep] = useState<Step>(prefillUsername ? 'username' : 'role')
  const [direction, setDirection] = useState(1)
  const STEP_ORDER: Step[] = ['role', 'username', 'license', 'account']
  const goToStep = (next: Step) => {
    setDirection(STEP_ORDER.indexOf(next) >= STEP_ORDER.indexOf(step) ? 1 : -1)
    _setStep(next)
  }
  const setStep = goToStep
  const [role, setRole] = useState<'agent' | 'consumer' | null>(prefillUsername ? 'agent' : null)
  const [username, setUsernameVal] = useState(prefillUsername)

  // Check pre-filled username availability on mount
  useEffect(() => {
    if (prefillUsername) check(prefillUsername)
  }, []) // eslint-disable-line
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // License verification
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [licenseName, setLicenseName] = useState('')
  const [fairHousing, setFairHousing] = useState(false)
  const [dataSecurity, setDataSecurity] = useState(false)
  const [duplicateLicense, setDuplicateLicense] = useState<{ exists: boolean; username?: string } | null>(null)

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
    setUsernameVal(cleaned)
    check(cleaned)
  }

  const handleCreate = () => {
    if (!email.trim()) { setError('Enter an email'); return }
    if (role === 'agent' && !displayName.trim()) { setError('Enter your name'); return }
    if (firebaseConfigured && !password.trim()) { setError('Enter a password'); return }
    setLoading(true); setError('')

    // Create user doc helper
    const makeUser = (uid: string): UserDoc => ({
      uid, email, role: role || 'consumer',
      agentType: role === 'agent' ? 'agent' : undefined,
      createdAt: Timestamp.now(), username: role === 'agent' ? username : null,
      displayName: displayName || email.split('@')[0], photoURL: null, bio: '',
      brokerage: null,
      licenseNumber: role === 'agent' ? licenseNumber : null,
      licenseState: role === 'agent' ? licenseState : null,
      licenseName: role === 'agent' ? licenseName : null,
      verificationStatus: role === 'agent' ? 'pending' : 'unverified',
      fairHousingAccepted: fairHousing,
      dataSecurityAccepted: dataSecurity,
      emailVerified: false,
      platforms: [],
      followerCount: 0, followingCount: 0,
      onboardingComplete: role === 'consumer', onboardingStep: role === 'consumer' ? 8 : 2,
      setupPercent: role === 'agent' ? 20 : 0,
    })

    if (!firebaseConfigured || !auth) {
      setUserDoc(makeUser(`demo-${Date.now()}`)); setLoading(false)
      navigate(role === 'agent' ? '/dashboard' : '/explore')
      return
    }

    // Timeout after 10s
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Connection timed out. Please try again.')
    }, 10000)

    ;(async () => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        clearTimeout(timeout)
        // Write user doc + claim username
        await createUserDoc(cred.user.uid, makeUser(cred.user.uid) as any).catch((e) => console.warn('User doc write failed:', e))
        // Send email verification
        try { await sendEmailVerification(cred.user) } catch {}
        if (role === 'agent' && username) {
          const { claim } = useUsername()
          // Direct Firestore write for username claim
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
          const { db } = await import('@/config/firebase')
          if (db) await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid: cred.user.uid, createdAt: serverTimestamp() }).catch(() => {})
        }
        navigate(role === 'agent' ? '/dashboard' : '/explore')
      } catch (e: any) {
        clearTimeout(timeout)
        const msg = e.code === 'auth/email-already-in-use' ? 'Email already in use'
          : e.code === 'auth/weak-password' ? 'Password needs 6+ characters'
          : e.code === 'auth/invalid-email' ? 'Invalid email address'
          : e.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'
          : e.code === 'auth/configuration-not-found' || e.code === 'auth/config-not-found'
            ? 'Firebase Auth not configured. Enable Email/Password in Firebase Console → Authentication → Sign-in method.'
          : `Error: ${e.code || e.message || 'Something went wrong'}`
        setError(msg)
      } finally { setLoading(false) }
    })()
  }

  const handleGoogle = async () => {
    if (!firebaseConfigured) { handleCreate(); return }
    setLoading(true)
    try {
      const cred = await signInWithPopup(auth!, new GoogleAuthProvider())
      await createUserDoc(cred.user.uid, { email: cred.user.email || '', displayName: cred.user.displayName || '', role: role || 'consumer' }).catch(() => {})
      navigate(role === 'agent' ? '/dashboard' : '/explore')
    } catch { setError('Google sign-in failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ivory flex">
      <SEOHead title="Get Started" path="/sign-up" />

      {/* Left: form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-12 max-w-[600px] mx-auto md:mx-0">
        <Link to="/" className="flex items-center gap-1.5 mb-10">
          <img src="/reelst-logo.png" alt="Reelst" className="w-8 h-8" />
          <span className="text-[20px] font-extrabold text-ink tracking-tight">Reelst</span>
        </Link>

        <AnimatePresence mode="wait" custom={direction}>
          {/* ── Role ── */}
          {step === 'role' && (
            <motion.div key="role" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 30 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -30 * d }) }} initial="enter" animate="center" exit="exit" className="space-y-6">
              <div>
                <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Get started with Reelst</h1>
                <p className="text-[15px] text-smoke">How do you want to use Reelst?</p>
              </div>

              <div className="space-y-3">
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setRole('agent'); setStep('username') }}
                  className="w-full flex items-center gap-4 p-5 rounded-[20px] bg-cream border-2 border-transparent hover:border-tangerine/30 text-left cursor-pointer transition-all">
                  <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center shrink-0">
                    <MapPin size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-ink">I'm an agent</p>
                    <p className="text-[13px] text-smoke">Claim your Reelst link, add pins, grow your audience</p>
                  </div>
                </motion.button>

                <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setRole('consumer'); setStep('account') }}
                  className="w-full flex items-center gap-4 p-5 rounded-[20px] bg-cream border-2 border-transparent hover:border-listing-blue/30 text-left cursor-pointer transition-all">
                  <div className="w-12 h-12 rounded-[14px] bg-listing-blue/15 flex items-center justify-center shrink-0">
                    <Eye size={22} className="text-listing-blue" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-ink">I'm looking for homes</p>
                    <p className="text-[13px] text-smoke">Save listings, follow agents, explore neighborhoods</p>
                  </div>
                </motion.button>
              </div>

              <p className="text-[13px] text-smoke">Already have an account? <Link to="/sign-in" className="text-tangerine font-semibold">Sign in</Link></p>
            </motion.div>
          )}

          {/* ── Username ── */}
          {step === 'username' && (
            <motion.div key="username" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 30 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -30 * d }) }} initial="enter" animate="center" exit="exit" className="space-y-6">
              <button onClick={() => setStep('role')} className="flex items-center gap-1 text-[13px] text-smoke font-medium mb-2"><ArrowLeft size={14} /> Back</button>
              <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mb-2">
                <AtSign size={26} className="text-white" />
              </div>
              <div>
                <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Claim your Reelst</h1>
                <p className="text-[15px] text-smoke">Choose your unique link</p>
              </div>
              <div className="bg-cream rounded-[16px] px-5 py-3">
                <p className="text-[12px] text-smoke font-medium mb-0.5">Your Reelst link</p>
                <p className="text-[18px] font-bold text-ink">reel.st/<span className={username ? 'text-tangerine' : 'text-ash'}>{username || '...'}</span></p>
              </div>
              <div className="relative">
                <input type="text" value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="username" autoFocus
                  className="w-full h-14 rounded-[16px] bg-cream border border-border-light px-5 text-[17px] font-semibold text-ink placeholder:text-ash focus:border-tangerine/40 transition-all outline-none" />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 size={18} className="text-smoke animate-spin" />}
                  {!checking && available === true && <div className="w-5 h-5 rounded-full bg-sold-green flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  {!checking && available === false && <div className="w-5 h-5 rounded-full bg-live-red flex items-center justify-center"><X size={12} className="text-white" /></div>}
                </div>
              </div>
              {!checking && available === false && <p className="text-[12px] text-live-red -mt-3">Taken. Try another.</p>}
              <Button variant="primary" size="xl" fullWidth onClick={() => setStep('license')} disabled={!available || checking || username.length < 3}>Continue</Button>
              <p className="text-[11px] text-ash">3-24 characters. Letters, numbers, underscores.</p>
              <p className="text-[13px] text-smoke pt-2">
                Not an agent? <button onClick={() => { setRole('consumer'); setStep('account') }} className="text-tangerine font-semibold cursor-pointer">I'm looking for homes</button>
              </p>
            </motion.div>
          )}

          {/* ── License Verification (Agent only) ── */}
          {step === 'license' && (
            <motion.div key="license" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 30 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -30 * d }) }} initial="enter" animate="center" exit="exit" className="space-y-6">
              <button onClick={() => setStep('username')} className="flex items-center gap-1 text-[13px] text-smoke font-medium mb-2 cursor-pointer"><ArrowLeft size={14} /> Back</button>
              <div className="w-14 h-14 rounded-[16px] bg-tangerine/10 flex items-center justify-center mb-2">
                <Shield size={26} className="text-tangerine" />
              </div>
              <div>
                <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Verify your license</h1>
                <p className="text-[15px] text-smoke">We verify all agents to protect homebuyers</p>
              </div>

              <div className="space-y-3">
                <Input placeholder="Legal name (as on license)" value={licenseName} onChange={(e) => setLicenseName(e.target.value)} />
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <Input placeholder="License number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())} />
                  <select value={licenseState} onChange={(e) => setLicenseState(e.target.value)}
                    className="h-14 rounded-[16px] bg-cream border border-border-light px-3 text-[15px] font-medium text-ink outline-none cursor-pointer">
                    <option value="">State</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {duplicateLicense?.exists && (
                  <div className="flex items-start gap-3 bg-open-amber/10 rounded-[16px] p-4">
                    <AlertTriangle size={18} className="text-open-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-semibold text-ink">This license is already registered</p>
                      <p className="text-[12px] text-smoke mt-0.5">
                        An account with this license exists{duplicateLicense.username ? ` (@${duplicateLicense.username})` : ''}. If this is you, <Link to="/sign-in" className="text-tangerine font-semibold">sign in instead</Link>.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          const { createDispute } = await import('@/lib/firestore')
                          await createDispute({
                            claimantUid: '',
                            claimantName: licenseName,
                            claimantEmail: email,
                            existingUid: (duplicateLicense as any).uid || '',
                            licenseNumber,
                            licenseState,
                            licenseName,
                            evidence: 'Dispute submitted during signup — claimant believes they are the rightful license holder.',
                          })
                          alert('Dispute submitted. We will review and contact you at ' + (email || 'your email') + '.')
                        }}
                        className="text-[12px] font-semibold text-tangerine mt-2 cursor-pointer hover:underline"
                      >
                        This is my license — file a dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={fairHousing} onChange={(e) => setFairHousing(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-tangerine cursor-pointer" />
                  <span className="text-[13px] text-smoke leading-snug">
                    I commit to fair housing practices and will not discriminate based on race, color, religion, sex, disability, familial status, or national origin.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={dataSecurity} onChange={(e) => setDataSecurity(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-tangerine cursor-pointer" />
                  <span className="text-[13px] text-smoke leading-snug">
                    I acknowledge that Reelst uses HTTPS encryption and I agree to the <Link to="/terms" className="text-tangerine font-medium">Terms of Use</Link> and <Link to="/privacy" className="text-tangerine font-medium">Privacy Policy</Link>.
                  </span>
                </label>
              </div>

              {error && <p className="text-[12px] text-live-red">{error}</p>}

              <Button variant="primary" size="xl" fullWidth
                disabled={!licenseName.trim() || !licenseNumber.trim() || !licenseState || !fairHousing || !dataSecurity || duplicateLicense?.exists || loading}
                loading={loading}
                onClick={async () => {
                  setError(''); setLoading(true)
                  try {
                    const result = await checkLicenseDuplicate(licenseNumber, licenseState)
                    if (result.exists) { setDuplicateLicense(result); setLoading(false); return }
                    setDuplicateLicense(null)

                    // Verify license against state database (FL, CA supported)
                    if (firebaseConfigured) {
                      try {
                        const { getFunctions, httpsCallable } = await import('firebase/functions')
                        const { app } = await import('@/config/firebase')
                        if (app) {
                          const functions = getFunctions(app, 'us-central1')
                          const verify = httpsCallable(functions, 'verifyLicense')
                          const verifyResult = await verify({ licenseNumber, licenseState, licenseName }) as any
                          const data = verifyResult.data
                          if (data && data.valid === false && data.reason) {
                            setError(data.reason)
                            setLoading(false)
                            return
                          }
                          // If valid or unsupported state, proceed
                        }
                      } catch (e) {
                        // Don't block signup if verification service is down
                        console.warn('License verification unavailable:', e)
                      }
                    }

                    setDisplayName(licenseName)
                    setStep('account')
                  } catch { setError('Could not verify license. Try again.') }
                  finally { setLoading(false) }
                }}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {/* ── Account ── */}
          {step === 'account' && (
            <motion.div key="account" custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: 30 * d }), center: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: -30 * d }) }} initial="enter" animate="center" exit="exit" className="space-y-6">
              <button onClick={() => setStep(role === 'agent' ? 'license' : 'role')} className="flex items-center gap-1 text-[13px] text-smoke font-medium mb-2 cursor-pointer"><ArrowLeft size={14} /> Back</button>
              <div>
                <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Create your account</h1>
                {role === 'agent' && username && <p className="text-[15px] text-smoke">Securing <span className="text-tangerine font-bold">reel.st/{username}</span></p>}
              </div>

              <div className="space-y-3">
                <Button variant="secondary" size="xl" fullWidth icon={<GoogleLogo size={20} />} onClick={handleGoogle} loading={loading}>Continue with Google</Button>
                <Button variant="secondary" size="xl" fullWidth icon={<AppleLogo size={20} />} disabled>Continue with Apple</Button>
              </div>

              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-pearl" /><span className="text-[12px] text-smoke font-medium uppercase tracking-wider">or</span><div className="flex-1 h-px bg-pearl" /></div>

              <div className="space-y-3">
                {role === 'agent' && <Input placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}
                <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} />
                {firebaseConfigured && <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} />}
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <Button variant="primary" size="xl" fullWidth onClick={handleCreate} loading={loading} iconRight={<ArrowRight size={18} />}>
                  {role === 'agent' ? 'Get started' : 'Create account'}
                </Button>
              </div>

              <p className="text-[13px] text-smoke">Already have an account? <Link to="/sign-in" className="text-tangerine font-semibold">Sign in</Link></p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: visual (desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-midnight to-obsidian items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-tangerine/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative">
          {/* Phone mockup */}
          <div className="w-[280px] h-[560px] rounded-[40px] border-[3px] border-white/10 bg-obsidian overflow-hidden shadow-2xl">
            <div className="w-full h-full bg-gradient-to-br from-[#0C1E35] via-[#0F2847] to-[#0A1628] relative">
              {[
                { x: 20, y: 12, color: '#3B82F6', s: 10 }, { x: 55, y: 22, color: '#FF6B3D', s: 14 },
                { x: 75, y: 16, color: '#34C759', s: 10 }, { x: 15, y: 42, color: '#FF3B30', s: 12 },
                { x: 60, y: 52, color: '#FFAA00', s: 10 }, { x: 40, y: 68, color: '#A855F7', s: 12 },
              ].map((p, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1, type: 'spring', damping: 12 }}
                  className="absolute rounded-full" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: p.color, boxShadow: `0 0 12px ${p.color}50` }} />
              ))}
              <div className="absolute top-4 left-4 right-4 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-tangerine to-ember" />
                <div className="h-2 w-16 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
            className="absolute -bottom-4 -left-8 bg-white rounded-2xl shadow-xl p-3 border border-white/10">
            <p className="text-[11px] font-bold text-ink">reel.st/{username || 'you'}</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
