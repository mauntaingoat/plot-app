import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, Camera, ChevronDown, Loader2 } from 'lucide-react'
import { GoogleLogo, AppleLogo, PLATFORM_LIST, PLATFORM_LOGOS, validatePlatformUrl } from '@/components/icons/PlatformLogos'
import { useUsername } from '@/hooks/useUsername'
import { useAuthStore } from '@/stores/authStore'
import { auth, firebaseConfigured } from '@/config/firebase'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from 'firebase/auth'
import { createUserDoc, checkLicenseDuplicate, updateUserDoc } from '@/lib/firestore'
import { uploadFile, avatarPath } from '@/lib/storage'
import { Timestamp } from 'firebase/firestore'
import type { UserDoc } from '@/lib/types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

type Step = 'hero' | 'auth' | 'username' | 'name' | 'moment' | 'agent-type' | 'photo' | 'license' | 'bio' | 'done'
const STEPS: Step[] = ['hero', 'auth', 'username', 'name', 'moment', 'agent-type', 'photo', 'license', 'bio', 'done']

export default function Welcome() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUserDoc: setAuthDoc } = useAuthStore()
  const { available, checking, check } = useUsername()
  const prefillUsername = searchParams.get('username')?.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || ''

  const [step, setStepRaw] = useState<Step>('hero')
  const [dir, setDir] = useState(1)
  const setStep = (next: Step) => {
    setDir(STEPS.indexOf(next) > STEPS.indexOf(step) ? 1 : -1)
    setStepRaw(next)
  }
  const nextStep = () => { const i = STEPS.indexOf(step); if (i < STEPS.length - 1) setStep(STEPS[i + 1]) }
  const prevStep = () => { const i = STEPS.indexOf(step); if (i > 0) setStep(STEPS[i - 1]) }
  const progress = STEPS.indexOf(step) / (STEPS.length - 1)

  // ── State ──
  const [username, setUsername] = useState(prefillUsername)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agentType, setAgentType] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseState, setLicenseState] = useState('')
  const [licenseName, setLicenseName] = useState('')
  const [bio, setBio] = useState('')
  const [platforms, setPlatforms] = useState<{ id: string; username: string }[]>([])
  const [addingPlatform, setAddingPlatform] = useState<string | null>(null)
  const [platformUrl, setPlatformUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uid, setUid] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (prefillUsername) check(prefillUsername) }, []) // eslint-disable-line

  // ── Auth ──
  const handleGoogle = async () => {
    if (!auth) return
    setLoading(true); setError('')
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      setUid(result.user.uid)
      setEmail(result.user.email || '')
      if (result.user.displayName) setDisplayName(result.user.displayName)
      if (result.user.photoURL) setPhotoPreview(result.user.photoURL)
      nextStep()
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally { setLoading(false) }
  }

  const handleEmail = async () => {
    if (!auth || !email || !password) return
    setLoading(true); setError('')
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      setUid(result.user.uid)
      sendEmailVerification(result.user).catch(() => {})
      nextStep()
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('Email already in use. Try signing in.')
      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.')
      else setError(err.message || 'Sign up failed')
    } finally { setLoading(false) }
  }

  // ── Final save ──
  const handleComplete = async () => {
    if (!uid) return
    setLoading(true)
    try {
      let photoURL = photoPreview || null
      if (photoFile) {
        photoURL = await uploadFile({ path: avatarPath(uid), file: photoFile })
      }
      const userData: Partial<UserDoc> = {
        email,
        role: 'agent',
        agentType: (agentType as any) || 'agent',
        username: username.toLowerCase(),
        displayName,
        bio,
        photoURL,
        licenseNumber: licenseNumber || null,
        licenseState: licenseState || null,
        licenseName: licenseName || null,
        verificationStatus: 'unverified',
        platforms,
        onboardingComplete: true,
        onboardingStep: 8,
        fairHousingAccepted: true,
        dataSecurityAccepted: true,
        emailVerified: false,
      }
      await createUserDoc(uid, userData)
      // Claim username
      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/config/firebase')
      if (db) await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid, createdAt: serverTimestamp() })

      setAuthDoc({ uid, ...userData, createdAt: Timestamp.now(), followerCount: 0, followingCount: 0, setupPercent: 50, tier: 'free', brandColor: null, brokerage: null } as UserDoc)
      nextStep()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally { setLoading(false) }
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file))
  }

  // ── Animation variants ──
  const pageVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  }

  const canGoBack = STEPS.indexOf(step) > 0 && step !== 'hero' && step !== 'done'
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      {/* Progress bar */}
      {step !== 'hero' && step !== 'done' && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#E8E5DE]">
          <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full bg-tangerine rounded-r-full" />
        </div>
      )}

      {/* Back button */}
      {canGoBack && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={prevStep}
          className="fixed top-6 left-5 z-50 w-10 h-10 rounded-full bg-[#E8E5DE] flex items-center justify-center cursor-pointer hover:bg-[#DDD9D0] transition-colors">
          <ArrowLeft size={18} className="text-[#2A2A2A]" />
        </motion.button>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <AnimatePresence mode="wait" custom={dir}>
            {/* ═══ HERO ═══ */}
            {step === 'hero' && (
              <motion.div key="hero" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="text-center space-y-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <img src="/reelst-logo.png" alt="" className="w-12 h-12" />
                  <span className="text-[32px] font-extrabold text-[#1A1A1A] tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Reelst</span>
                </div>
                <div className="space-y-3">
                  <h1 className="text-[28px] font-bold text-[#1A1A1A] leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Where listings<br />come alive.
                  </h1>
                  <p className="text-[15px] text-[#8A8A8A] leading-relaxed">
                    Your map. Your content. Your brand.<br />
                    Built for agents who show, not just tell.
                  </p>
                </div>
                <button onClick={() => setStep('auth')}
                  className="w-full py-4 rounded-full bg-tangerine text-white text-[16px] font-bold cursor-pointer hover:brightness-105 transition-all shadow-lg shadow-tangerine/20">
                  Get Started
                </button>
                <p className="text-[13px] text-[#AAAAAA]">
                  Already have an account? <Link to="/sign-in" className="text-tangerine font-semibold hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ═══ AUTH ═══ */}
            {step === 'auth' && (
              <motion.div key="auth" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>Create your account</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Sign up to claim your Reelst.</p>
                </div>
                <button onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-[#E8E5DE] text-[14px] font-semibold text-[#2A2A2A] cursor-pointer hover:bg-[#F5F3EE] transition-colors">
                  <GoogleLogo size={20} /> Sign up with Google
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#E8E5DE]" />
                  <span className="text-[12px] text-[#BBBBBB] font-medium">or</span>
                  <div className="flex-1 h-px bg-[#E8E5DE]" />
                </div>
                <div className="space-y-3">
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                  <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                </div>
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <button onClick={handleEmail} disabled={loading || !email || password.length < 6}
                  className="w-full py-3.5 rounded-full bg-[#1A1A1A] text-white text-[14px] font-bold cursor-pointer hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Continue with email'}
                </button>
                <p className="text-[11px] text-[#BBBBBB] text-center">
                  By signing up, you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </motion.div>
            )}

            {/* ═══ USERNAME ═══ */}
            {step === 'username' && (
              <motion.div key="username" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>Claim your link</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">This is where clients find you.</p>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#BBBBBB] font-medium">reel.st/</span>
                  <input type="text" value={username} autoFocus
                    onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24); setUsername(v); if (v.length >= 3) check(v) }}
                    className="w-full pl-[72px] pr-12 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] font-semibold outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {checking ? <Loader2 size={16} className="text-[#BBBBBB] animate-spin" /> :
                      available === true ? <Check size={16} className="text-sold-green" /> :
                      available === false ? <span className="text-[11px] text-live-red font-semibold">Taken</span> : null}
                  </div>
                </div>
                <button onClick={nextStep} disabled={!available || username.length < 3}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue
                </button>
              </motion.div>
            )}

            {/* ═══ NAME ═══ */}
            {step === 'name' && (
              <motion.div key="name" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>What should we<br />call you?</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Your name as it appears on your profile.</p>
                </div>
                <input type="text" placeholder="Your name" value={displayName} autoFocus
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && displayName.trim() && nextStep()}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                <button onClick={nextStep} disabled={!displayName.trim()}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue
                </button>
              </motion.div>
            )}

            {/* ═══ MOMENT ═══ */}
            {step === 'moment' && (
              <MomentStep name={displayName.split(' ')[0] || 'there'} onComplete={nextStep} />
            )}

            {/* ═══ AGENT TYPE ═══ */}
            {step === 'agent-type' && (
              <motion.div key="agent-type" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>What kind of<br />agent are you?</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">This helps us tailor your experience.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'agent', label: 'Individual Agent', desc: 'Solo practitioner or team member' },
                    { id: 'brokerage', label: 'Brokerage', desc: 'Managing a team of agents' },
                    { id: 'developer', label: 'Developer', desc: 'Building or selling new construction' },
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => { setAgentType(opt.id); nextStep() }}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                        agentType === opt.id ? 'border-tangerine bg-tangerine/5' : 'border-[#E8E5DE] hover:border-tangerine/30'
                      }`}>
                      <div className="flex-1">
                        <p className="text-[15px] font-semibold text-[#2A2A2A]">{opt.label}</p>
                        <p className="text-[12px] text-[#8A8A8A]">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ PHOTO ═══ */}
            {step === 'photo' && (
              <motion.div key="photo" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6 text-center">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>Add a photo</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Agents with photos get 3x more engagement.</p>
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-full mx-auto flex items-center justify-center cursor-pointer overflow-hidden bg-[#E8E5DE] hover:bg-[#DDD9D0] transition-colors relative group">
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <Camera size={28} className="text-[#AAAAAA]" />
                  )}
                </button>
                <div className="flex gap-3">
                  <button onClick={nextStep}
                    className="flex-1 py-3.5 rounded-full border-2 border-[#E8E5DE] text-[14px] font-semibold text-[#8A8A8A] cursor-pointer hover:bg-[#F5F3EE] transition-colors">
                    Skip for now
                  </button>
                  <button onClick={nextStep} disabled={!photoPreview}
                    className="flex-1 py-3.5 rounded-full bg-tangerine text-white text-[14px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ LICENSE ═══ */}
            {step === 'license' && (
              <motion.div key="license" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>License verification</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Required to publish your Reelst.</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">State</label>
                  <select value={licenseState} onChange={(e) => setLicenseState(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20 appearance-none cursor-pointer">
                    <option value="">Select state</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">License number</label>
                  <input type="text" placeholder="e.g. SL1234567" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">Legal name on license</label>
                  <input type="text" placeholder="Full legal name" value={licenseName} onChange={(e) => setLicenseName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                </div>
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <button onClick={nextStep} disabled={!licenseState || !licenseNumber || !licenseName}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue
                </button>
              </motion.div>
            )}

            {/* ═══ BIO + SOCIALS ═══ */}
            {step === 'bio' && (
              <motion.div key="bio" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>Almost there</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Add a bio and connect your socials.</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">Bio</label>
                  <textarea placeholder="Tell visitors about yourself..." value={bio}
                    onChange={(e) => { if (e.target.value.length <= 250) setBio(e.target.value) }}
                    rows={3} maxLength={250}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none resize-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                  <span className="text-[11px] text-[#BBBBBB]">{bio.length}/250</span>
                </div>

                {/* Connected platforms */}
                {platforms.length > 0 && (
                  <div className="space-y-2">
                    {platforms.map((p) => {
                      const Logo = PLATFORM_LOGOS[p.id]
                      const name = PLATFORM_LIST.find((pl) => pl.id === p.id)?.name || p.id
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#F5F3EE]">
                          {Logo && <Logo size={18} />}
                          <span className="text-[13px] font-medium text-[#2A2A2A] flex-1 truncate">{name}</span>
                          <button onClick={() => setPlatforms(platforms.filter((x) => x.id !== p.id))}
                            className="text-[11px] text-[#AAAAAA] cursor-pointer hover:text-live-red">Remove</button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add platform */}
                {addingPlatform ? (
                  <div className="space-y-2">
                    <input type="url" placeholder={PLATFORM_LIST.find((p) => p.id === addingPlatform)?.placeholder}
                      value={platformUrl} onChange={(e) => setPlatformUrl(e.target.value)} autoFocus
                      className="w-full px-4 py-3 rounded-2xl bg-[#F5F3EE] text-[14px] text-[#2A2A2A] placeholder:text-[#BBBBBB] outline-none focus:ring-2 focus:ring-tangerine/30 border border-transparent focus:border-tangerine/20" />
                    <div className="flex gap-2">
                      <button onClick={() => { setAddingPlatform(null); setPlatformUrl('') }}
                        className="flex-1 py-2 rounded-full border border-[#E8E5DE] text-[12px] font-semibold text-[#8A8A8A] cursor-pointer">Cancel</button>
                      <button onClick={() => {
                        if (platformUrl.trim()) {
                          setPlatforms([...platforms, { id: addingPlatform, username: platformUrl.trim() }])
                        }
                        setAddingPlatform(null); setPlatformUrl('')
                      }}
                        className="flex-1 py-2 rounded-full bg-[#1A1A1A] text-white text-[12px] font-semibold cursor-pointer">Add</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_LIST.filter((p) => !platforms.some((x) => x.id === p.id)).map((p) => {
                      const Logo = PLATFORM_LOGOS[p.id]
                      return (
                        <button key={p.id} onClick={() => { setAddingPlatform(p.id); setPlatformUrl(p.prefix) }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#F5F3EE] text-[12px] font-medium text-[#8A8A8A] cursor-pointer hover:bg-[#E8E5DE] transition-colors">
                          {Logo && <Logo size={14} />} {p.name}
                        </button>
                      )
                    })}
                  </div>
                )}

                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <button onClick={handleComplete} disabled={loading}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-40">
                  {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Finish setup'}
                </button>
              </motion.div>
            )}

            {/* ═══ DONE ═══ */}
            {step === 'done' && (
              <motion.div key="done" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="text-center space-y-6">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}>
                  <div className="w-20 h-20 rounded-full bg-sold-green/15 flex items-center justify-center mx-auto">
                    <Check size={36} className="text-sold-green" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>You're all set!</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-2">
                    Your Reelst is ready at <span className="font-semibold text-tangerine">reel.st/{username}</span>.<br />
                    Once verified, it'll go live for the world.
                  </p>
                </div>
                <button onClick={() => navigate('/dashboard')}
                  className="w-full py-4 rounded-full bg-tangerine text-white text-[16px] font-bold cursor-pointer hover:brightness-105 transition-all shadow-lg shadow-tangerine/20">
                  Go to Dashboard
                </button>
                <button onClick={() => navigate('/dashboard/pin/new')}
                  className="w-full py-3.5 rounded-full border-2 border-[#E8E5DE] text-[14px] font-semibold text-[#2A2A2A] cursor-pointer hover:bg-[#F5F3EE] transition-colors">
                  Drop your first pin
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── Animated Moment Step ──
function MomentStep({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3800),
      setTimeout(() => onComplete(), 5200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div key="moment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex items-center min-h-[300px]">
      <div className="space-y-4">
        <AnimatePresence>
          {phase >= 0 && (
            <motion.p key="l1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-[28px] font-bold leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              <span className="text-tangerine">{name}</span>, let's bring
            </motion.p>
          )}
          {phase >= 1 && (
            <motion.p key="l2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-[28px] font-bold text-[#1A1A1A] leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              your listings to life.
            </motion.p>
          )}
          {phase >= 2 && (
            <motion.p key="l3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-[18px] text-[#8A8A8A] leading-relaxed mt-4">
              Your map. Your reels. Your story.
            </motion.p>
          )}
          {phase >= 3 && (
            <motion.p key="l4" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-[18px] font-semibold text-tangerine mt-2">
              Let's build it.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
