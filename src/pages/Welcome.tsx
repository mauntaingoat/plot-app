import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Camera, Loader2 } from 'lucide-react'
import { GoogleLogo, PLATFORM_LIST, PLATFORM_LOGOS } from '@/components/icons/PlatformLogos'
import { useUsername } from '@/hooks/useUsername'
import { useAuthStore } from '@/stores/authStore'
import { auth } from '@/config/firebase'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from 'firebase/auth'
import { createUserDoc } from '@/lib/firestore'
import { uploadFile, avatarPath } from '@/lib/storage'
import { Timestamp } from 'firebase/firestore'
import type { UserDoc } from '@/lib/types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

type Step = 'hero' | 'username' | 'name' | 'moment' | 'goals' | 'photo' | 'license' | 'bio' | 'auth' | 'done'
const STEPS: Step[] = ['hero', 'username', 'name', 'moment', 'goals', 'photo', 'license', 'bio', 'auth', 'done']

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

  const [username, setUsername] = useState(prefillUsername)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [goals, setGoals] = useState<string[]>([])
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
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (prefillUsername) check(prefillUsername) }, []) // eslint-disable-line

  const handleGoogle = async () => {
    if (!auth) return
    setLoading(true); setError('')
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      await saveProfile(result.user.uid, result.user.email || '')
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
      setLoading(false)
    }
  }

  const handleEmail = async () => {
    if (!auth || !email || !password) return
    setLoading(true); setError('')
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      sendEmailVerification(result.user).catch(() => {})
      await saveProfile(result.user.uid, email)
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('Email already in use. Try signing in.')
      else if (err.code === 'auth/weak-password') setError('Password must be at least 6 characters.')
      else setError(err.message || 'Sign up failed')
      setLoading(false)
    }
  }

  const saveProfile = async (uid: string, userEmail: string) => {
    try {
      let photoURL = photoPreview?.startsWith('http') ? photoPreview : null
      if (photoFile) {
        photoURL = await uploadFile({ path: avatarPath(uid), file: photoFile })
      }
      const userData: Partial<UserDoc> = {
        email: userEmail,
        role: 'agent',
        agentType: 'agent',
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
      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/config/firebase')
      if (db) await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid, createdAt: serverTimestamp() })
      setAuthDoc({ uid, ...userData, createdAt: Timestamp.now(), followerCount: 0, followingCount: 0, setupPercent: 50, tier: 'free', brandColor: null, brokerage: null } as UserDoc)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally { setLoading(false) }
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file))
  }

  const pageVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 50 : -50 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -50 : 50 }),
  }
  const pageTrans = { duration: 0.3, ease: [0.22, 1, 0.36, 1] }

  const canGoBack = STEPS.indexOf(step) > 0 && step !== 'hero' && step !== 'done'

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      {step !== 'hero' && step !== 'done' && step !== 'moment' && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-[#EAE7E0]">
          <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full bg-tangerine rounded-r-full" />
        </div>
      )}

      {canGoBack && step !== 'moment' && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={prevStep}
          className="fixed top-5 left-5 z-50 w-9 h-9 rounded-full bg-[#EAE7E0] flex items-center justify-center cursor-pointer hover:bg-[#DDD9D0] transition-colors">
          <ArrowLeft size={16} className="text-[#2A2A2A]" />
        </motion.button>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[440px]">
          <AnimatePresence mode="wait" custom={dir}>

            {step === 'hero' && (
              <motion.div key="hero" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="text-center space-y-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <img src="/reelst-logo.png" alt="" className="w-11 h-11" />
                  <span className="text-[30px] font-extrabold text-[#1A1A1A] tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Reelst</span>
                </div>
                <div className="space-y-3">
                  <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Where listings<br />come alive.
                  </h1>
                  <p className="text-[14px] text-[#8A8A8A] leading-relaxed">
                    Your map. Your content. Your brand.<br />
                    Built for agents who show, not just tell.
                  </p>
                </div>
                <button onClick={() => setStep('username')}
                  className="w-full py-4 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all shadow-lg shadow-tangerine/20">
                  Get Started
                </button>
                <p className="text-[13px] text-[#AAAAAA]">
                  Already have an account? <Link to="/sign-in" className="text-tangerine font-semibold hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {step === 'username' && (
              <motion.div key="username" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>Claim your link</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">This is where clients find you.</p>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-2xl bg-white border-2 border-[#EAE7E0] shadow-sm focus-within:border-tangerine/40 transition-colors">
                  <div className="flex-1 flex items-center px-3">
                    <span className="text-[16px] font-semibold text-[#1A1A1A]">reel.st/</span>
                    <input type="text" value={username} autoFocus placeholder="yourname"
                      onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24); setUsername(v); if (v.length >= 3) check(v) }}
                      className="text-[16px] font-semibold text-tangerine placeholder:text-[#D4D0C8] outline-none bg-transparent w-full" />
                  </div>
                  <button onClick={nextStep} disabled={!available || username.length < 3}
                    className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-tangerine text-white text-[14px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    Claim it <ArrowRight size={15} />
                  </button>
                </div>
                <div className="h-5 flex items-center px-1">
                  {checking && <span className="text-[12px] text-[#AAAAAA]">Checking...</span>}
                  {!checking && available === true && username.length >= 3 && (
                    <span className="text-[12px] text-sold-green flex items-center gap-1"><Check size={13} /> Available</span>
                  )}
                  {!checking && available === false && (
                    <span className="text-[12px] text-live-red">That username is taken</span>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'name' && (
              <motion.div key="name" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>What should we<br />call you?</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Your name as it appears on your profile.</p>
                </div>
                <input type="text" placeholder="Your name" value={displayName} autoFocus
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && displayName.trim() && nextStep()}
                  className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[15px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none focus:border-tangerine/40 transition-colors" />
                <button onClick={nextStep} disabled={!displayName.trim()}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'moment' && (
              <MomentStep name={displayName.split(' ')[0] || 'there'} onComplete={nextStep} />
            )}

            {step === 'goals' && (
              <motion.div key="goals" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>What's your<br />main goal?</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Select all that apply.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'showcase', label: 'Showcase my listings', desc: 'Video tours, carousels, and reels on a map' },
                    { id: 'leads', label: 'Generate more leads', desc: 'Get showing requests from interested buyers' },
                    { id: 'brand', label: 'Build my personal brand', desc: 'Stand out with a unique agent profile' },
                    { id: 'neighborhood', label: 'Highlight neighborhoods', desc: 'Share local knowledge and community content' },
                    { id: 'social', label: 'Grow my social presence', desc: 'Connect platforms and expand your reach' },
                  ].map((opt) => {
                    const selected = goals.includes(opt.id)
                    return (
                      <button key={opt.id} onClick={() => setGoals(selected ? goals.filter((g) => g !== opt.id) : [...goals, opt.id])}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                          selected ? 'border-tangerine bg-tangerine/5' : 'border-[#EAE7E0] hover:border-tangerine/20'
                        }`}>
                        <div className="flex-1">
                          <p className="text-[14px] font-semibold text-[#2A2A2A]">{opt.label}</p>
                          <p className="text-[12px] text-[#8A8A8A] mt-0.5">{opt.desc}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'border-tangerine bg-tangerine' : 'border-[#D4D0C8]'
                        }`}>
                          {selected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <button onClick={nextStep} disabled={goals.length === 0}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'photo' && (
              <motion.div key="photo" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="space-y-6 text-center">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>Add a photo</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Agents with photos get 3x more engagement.</p>
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="w-28 h-28 rounded-full mx-auto flex items-center justify-center cursor-pointer overflow-hidden bg-[#EAE7E0] hover:bg-[#DDD9D0] transition-colors relative group">
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={22} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <Camera size={32} className="text-[#AAAAAA]" />
                  )}
                </button>
                <div className="flex gap-3">
                  <button onClick={nextStep}
                    className="flex-1 py-3.5 rounded-full border-2 border-[#EAE7E0] text-[14px] font-semibold text-[#8A8A8A] cursor-pointer hover:bg-[#F5F3EE] transition-colors">
                    Skip
                  </button>
                  {photoPreview && (
                    <button onClick={nextStep}
                      className="flex-1 py-3.5 rounded-full bg-tangerine text-white text-[14px] font-bold cursor-pointer hover:brightness-105 transition-all">
                      Continue
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'license' && (
              <motion.div key="license" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="space-y-5">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>License verification</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Required to publish your Reelst.</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">State</label>
                  <select value={licenseState} onChange={(e) => setLicenseState(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] outline-none focus:border-tangerine/40 appearance-none cursor-pointer">
                    <option value="">Select state</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">License number</label>
                  <input type="text" placeholder="e.g. SL1234567" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none focus:border-tangerine/40" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider block mb-1.5">Legal name on license</label>
                  <input type="text" placeholder="Full legal name" value={licenseName} onChange={(e) => setLicenseName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none focus:border-tangerine/40" />
                </div>
                <button onClick={nextStep} disabled={!licenseState || !licenseNumber || !licenseName}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'bio' && (
              <motion.div key="bio" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
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
                    className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none resize-none focus:border-tangerine/40" />
                  <span className="text-[11px] text-[#BBBBBB]">{bio.length}/250</span>
                </div>
                {platforms.length > 0 && (
                  <div className="space-y-2">
                    {platforms.map((p) => {
                      const Logo = PLATFORM_LOGOS[p.id]
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-[#EAE7E0]">
                          {Logo && <Logo size={18} />}
                          <span className="text-[13px] font-medium text-[#2A2A2A] flex-1 truncate">{PLATFORM_LIST.find((x) => x.id === p.id)?.name}</span>
                          <button onClick={() => setPlatforms(platforms.filter((x) => x.id !== p.id))}
                            className="text-[11px] text-[#AAAAAA] cursor-pointer hover:text-live-red">Remove</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {addingPlatform ? (
                  <div className="space-y-2">
                    <input type="url" placeholder={PLATFORM_LIST.find((p) => p.id === addingPlatform)?.placeholder}
                      value={platformUrl} onChange={(e) => setPlatformUrl(e.target.value)} autoFocus
                      className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none focus:border-tangerine/40" />
                    <div className="flex gap-2">
                      <button onClick={() => { setAddingPlatform(null); setPlatformUrl('') }}
                        className="flex-1 py-2 rounded-full border border-[#EAE7E0] text-[12px] font-semibold text-[#8A8A8A] cursor-pointer">Cancel</button>
                      <button onClick={() => {
                        if (platformUrl.trim()) setPlatforms([...platforms, { id: addingPlatform, username: platformUrl.trim() }])
                        setAddingPlatform(null); setPlatformUrl('')
                      }} className="flex-1 py-2 rounded-full bg-[#1A1A1A] text-white text-[12px] font-semibold cursor-pointer">Add</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_LIST.filter((p) => !platforms.some((x) => x.id === p.id)).map((p) => {
                      const Logo = PLATFORM_LOGOS[p.id]
                      return (
                        <button key={p.id} onClick={() => { setAddingPlatform(p.id); setPlatformUrl(p.prefix) }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#EAE7E0] text-[12px] font-medium text-[#8A8A8A] cursor-pointer hover:border-tangerine/20 transition-colors">
                          {Logo && <Logo size={14} />} {p.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                <button onClick={nextStep}
                  className="w-full py-3.5 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all">
                  Continue
                </button>
              </motion.div>
            )}

            {step === 'auth' && (
              <motion.div key="auth" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
                className="space-y-6">
                <div>
                  <h2 className="text-[26px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Outfit', sans-serif" }}>One last step</h2>
                  <p className="text-[14px] text-[#8A8A8A] mt-1">Create your account to save everything.</p>
                </div>
                <button onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-[#EAE7E0] text-[14px] font-semibold text-[#2A2A2A] cursor-pointer hover:bg-[#F5F3EE] transition-colors disabled:opacity-50">
                  <GoogleLogo size={20} /> Sign up with Google
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#EAE7E0]" />
                  <span className="text-[12px] text-[#BBBBBB] font-medium">or</span>
                  <div className="flex-1 h-px bg-[#EAE7E0]" />
                </div>
                <div className="space-y-3">
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none focus:border-tangerine/40" />
                  <input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border-2 border-[#EAE7E0] text-[14px] text-[#2A2A2A] placeholder:text-[#D4D0C8] outline-none focus:border-tangerine/40" />
                </div>
                {error && <p className="text-[12px] text-live-red">{error}</p>}
                <button onClick={handleEmail} disabled={loading || !email || password.length < 6}
                  className="w-full py-3.5 rounded-full bg-[#1A1A1A] text-white text-[14px] font-bold cursor-pointer hover:bg-[#2A2A2A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Create account'}
                </button>
                <p className="text-[11px] text-[#BBBBBB] text-center">
                  By signing up, you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" custom={dir} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={pageTrans}
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
                  className="w-full py-4 rounded-full bg-tangerine text-white text-[15px] font-bold cursor-pointer hover:brightness-105 transition-all shadow-lg shadow-tangerine/20">
                  Go to Dashboard
                </button>
                <button onClick={() => navigate('/dashboard/pin/new')}
                  className="w-full py-3.5 rounded-full border-2 border-[#EAE7E0] text-[14px] font-semibold text-[#2A2A2A] cursor-pointer hover:bg-[#F5F3EE] transition-colors">
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

function MomentStep({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [phase, setPhase] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => onCompleteRef.current(), 4200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <motion.div key="moment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center min-h-[280px]">
      <div className="space-y-3">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-[30px] font-bold leading-snug" style={{ fontFamily: "'Outfit', sans-serif" }}>
          <span className="text-tangerine">{name}</span>, let's bring
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-[30px] font-bold text-[#1A1A1A] leading-snug" style={{ fontFamily: "'Outfit', sans-serif", opacity: phase >= 1 ? 1 : 0 }}>
          your listings to life.
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-[17px] text-[#8A8A8A] leading-relaxed mt-6" style={{ opacity: phase >= 2 ? 1 : 0 }}>
          Your map. Your reels. Your story.
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-[17px] font-semibold text-tangerine mt-1" style={{ opacity: phase >= 3 ? 1 : 0 }}>
          Let's build it.
        </motion.p>
      </div>
    </motion.div>
  )
}
