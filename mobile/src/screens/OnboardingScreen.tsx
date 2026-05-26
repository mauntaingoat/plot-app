/**
 * Onboarding — multi-step wizard mirroring the desktop Welcome flow.
 *
 * Deliberate ordering: **username FIRST**, account creation LAST.
 * The framing is "claim your URL" — the value is the URL, the
 * email/password is just plumbing.
 *
 * Steps:
 *  1. username      — `reel.st/<you>` with live availability check
 *  2. name          — display name on profile
 *  3. goals         — multi-select (drives onboarding personalization)
 *  4. photo         — avatar (optional, skippable)
 *  5. license       — state + license number + legal name (required to publish)
 *  6. bio           — short bio (optional)
 *  7. notifications — push + email prefs (per-event)
 *  8. auth          — email + password → creates Firebase user + writes
 *                     userDoc + reserves username + sends verification
 *  9. done          — success card → auto-routes to Verify via auth listener
 *
 * On account creation the RootNavigator auth listener flips and routes
 * to Verify (until email verified) or Dashboard (grace window).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import storage from '@react-native-firebase/storage'
import {
  CaretLeft,
  Check,
  Camera,
  Plus,
  Bell,
  Envelope,
  CheckCircle,
  X,
} from 'phosphor-react-native'
import { BrandButton } from '../components/BrandButton'
import { BrandInput } from '../components/BrandInput'
import { ReelstLogo } from '../components/ReelstLogo'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { LegalFooter } from './LandingScreen'
import { COLORS, FONTS } from '../lib/tokens'
import { lightTap, selection, success, errorTap } from '../lib/haptics'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  authErrorMessage,
} from '../lib/firebaseAuth'
import { seedAgentOnSignup, type NotificationPrefs } from '../lib/firestoreDb'
import { cleanUsername, isReservedUsername } from '../lib/reservedUsernames'
import { US_STATES } from '../lib/usStates'
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore'
import type { AuthStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>
type Step = 'username' | 'name' | 'moment' | 'goals' | 'photo' | 'license' | 'bio' | 'notifications' | 'auth' | 'done'
const STEPS: Step[] = ['username', 'name', 'moment', 'goals', 'photo', 'license', 'bio', 'notifications', 'auth', 'done']

const GOAL_OPTIONS = [
  { id: 'showcase',     label: 'Showcase my listings',     desc: 'Video tours, carousels, and reels on a map' },
  { id: 'leads',        label: 'Generate more leads',      desc: 'Get showing requests from interested buyers' },
  { id: 'brand',        label: 'Build my personal brand',  desc: 'Stand out with a unique agent profile' },
  { id: 'neighborhood', label: 'Highlight neighborhoods',  desc: 'Share local knowledge and community content' },
  { id: 'social',       label: 'Grow my social presence',  desc: 'Connect platforms and expand your reach' },
]

const DEFAULT_PUSH: NotificationPrefs = {
  showingRequest: true,
  newSubscriber: true,
  newWave: true,
}
const DEFAULT_EMAIL: NotificationPrefs = {
  showingRequest: true,
  newSubscriber: true,
  newWave: true,
}

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>()
  const [step, setStep] = useState<Step>('username')

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null)
  const [licenseState, setLicenseState] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseName, setLicenseName] = useState('')
  const [bio, setBio] = useState('')
  const [pushPrefs, setPushPrefs] = useState<NotificationPrefs>(DEFAULT_PUSH)
  const [emailPrefs, setEmailPrefs] = useState<NotificationPrefs>(DEFAULT_EMAIL)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Username availability check ─────────────────────────
  type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'too-short'
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    const cleaned = cleanUsername(username)
    if (cleaned.length < 3) {
      setUsernameStatus(cleaned.length === 0 ? 'idle' : 'too-short')
      return
    }
    if (isReservedUsername(cleaned)) { setUsernameStatus('reserved'); return }
    setUsernameStatus('checking')
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const db = getFirestore()
        const snap = await getDoc(doc(db, 'usernames', cleaned))
        setUsernameStatus(snap.exists() ? 'taken' : 'available')
      } catch {
        setUsernameStatus('available')
      }
    }, 350)
    return () => { if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current) }
  }, [username])

  // Photo picker ────────────────────────────────────────
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Photos access', 'Enable photo library access in Settings to add an avatar.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1],
    })
    if (result.canceled || result.assets.length === 0) return
    lightTap()
    setLocalPhotoUri(result.assets[0].uri)
  }

  // Goals toggle ────────────────────────────────────────
  const toggleGoal = (id: string) => {
    selection()
    setGoals((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  // Step navigation ─────────────────────────────────────
  const idx = STEPS.indexOf(step)
  const canBack = idx > 0 && step !== 'done'
  const onBack = () => {
    if (!canBack) { navigation.goBack(); return }
    selection()
    // Skip the celebratory 'moment' step on back-nav — auto-playing
    // its 4.4s animation just because the user hit Back would be jank.
    const target = STEPS[idx - 1]
    setStep(target === 'moment' ? STEPS[idx - 2] : target)
  }

  // X close — abandon the wizard, return to Landing. Confirms first
  // if the user has typed any meaningful data so we don't blow it
  // away with an accidental tap.
  const hasUnsavedWork = () =>
    !!(username || displayName || goals.length || localPhotoUri || licenseState || licenseNumber || licenseName || bio || email || password)

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const onClose = () => {
    if (!hasUnsavedWork()) {
      navigation.goBack()
      return
    }
    setLeaveConfirmOpen(true)
  }

  const canContinue = useMemo(() => {
    switch (step) {
      case 'username':      return usernameStatus === 'available'
      case 'name':          return displayName.trim().length >= 2
      case 'goals':         return goals.length > 0
      case 'photo':         return true
      case 'license':       return licenseState.length === 2 && licenseNumber.trim().length >= 3 && licenseName.trim().length >= 3
      case 'bio':           return true
      case 'notifications': return true
      case 'auth':          return email.trim().length > 3 && password.length >= 6
      case 'done':          return true
    }
  }, [step, usernameStatus, displayName, goals, licenseState, licenseNumber, licenseName, email, password])

  const onContinue = () => {
    if (!canContinue) return
    selection()
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  // Auth + write userDoc on auth step ───────────────────
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')

  const onFinish = async () => {
    setSubmitting(true)
    setAuthError('')
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanedUsername = cleanUsername(username)
      const user = await createUserWithEmailAndPassword(cleanEmail, password)

      // Upload avatar (best-effort)
      let photoURL: string | null = null
      if (localPhotoUri) {
        try {
          const ref = storage().ref(`users/${user.uid}/avatar-${Date.now()}.jpg`)
          await ref.putFile(localPhotoUri, { contentType: 'image/jpeg' })
          photoURL = await ref.getDownloadURL()
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[onboarding] avatar upload failed', e)
        }
      }

      await seedAgentOnSignup(user.uid, {
        email: cleanEmail,
        username: cleanedUsername,
        displayName: displayName.trim(),
        photoURL,
        bio: bio.trim() || null,
        goals,
        license: {
          state: licenseState,
          number: licenseNumber.trim(),
          name: licenseName.trim(),
        },
        notificationPrefs: pushPrefs,
        emailPrefs,
      })

      try { await sendEmailVerification() } catch { /* user can resend on Verify */ }
      success()
      // Show done screen briefly before auth listener swaps the stack.
      setStep('done')
    } catch (e: unknown) {
      const err = e as { code?: string }
      setAuthError(authErrorMessage(err.code, `Sign-up failed (${err.code || 'unknown'})`))
      errorTap()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Header — back + dot indicator + close (hidden on done) */}
        {step !== 'done' ? (
          <View style={styles.header}>
            <Pressable
              onPress={() => { lightTap(); onBack() }}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <CaretLeft size={20} color={COLORS.ink} weight="bold" />
            </Pressable>
            <View style={styles.dots}>
              {STEPS.slice(0, -1).map((_, i) => (
                <View key={i} style={[styles.dot, i <= idx ? styles.dotActive : null]} />
              ))}
            </View>
            <Pressable
              onPress={() => { lightTap(); onClose() }}
              hitSlop={10}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            >
              <X size={18} color={COLORS.ink} weight="bold" />
            </Pressable>
          </View>
        ) : null}

        {/* Reelst brand anchor — appears at the top of every step so
            the user always feels rooted in the brand. */}
        {step !== 'done' ? (
          <View style={styles.brandAnchor}>
            <ReelstLogo size="sm" />
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'username' ? (
            <StepUsername username={username} setUsername={setUsername} status={usernameStatus} />
          ) : step === 'name' ? (
            <StepName displayName={displayName} setDisplayName={setDisplayName} />
          ) : step === 'moment' ? (
            <StepMoment
              name={displayName.split(' ')[0] || 'there'}
              onComplete={() => setStep('goals')}
            />
          ) : step === 'goals' ? (
            <StepGoals selected={goals} onToggle={toggleGoal} />
          ) : step === 'photo' ? (
            <StepPhoto photoUri={localPhotoUri} onPick={pickPhoto} />
          ) : step === 'license' ? (
            <StepLicense
              state={licenseState} setState={setLicenseState}
              number={licenseNumber} setNumber={setLicenseNumber}
              legalName={licenseName} setLegalName={setLicenseName}
            />
          ) : step === 'bio' ? (
            <StepBio bio={bio} setBio={setBio} />
          ) : step === 'notifications' ? (
            <StepNotifications
              push={pushPrefs} setPush={setPushPrefs}
              email={emailPrefs} setEmail={setEmailPrefs}
            />
          ) : step === 'auth' ? (
            <StepAuth
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              error={authError} submitting={submitting}
              onSubmit={onFinish}
            />
          ) : (
            <StepDone displayName={displayName} />
          )}
        </ScrollView>

        <ConfirmSheet
          visible={leaveConfirmOpen}
          title="Leave onboarding?"
          message="You'll lose anything you've entered. You can always start again from the home screen."
          confirmLabel="Leave"
          cancelLabel="Keep going"
          destructive
          onConfirm={() => { setLeaveConfirmOpen(false); navigation.goBack() }}
          onClose={() => setLeaveConfirmOpen(false)}
        />

        {step !== 'done' && step !== 'moment' ? (
          <View style={styles.footer}>
            {step === 'auth' ? (
              <BrandButton
                label={submitting ? 'Creating account…' : 'Create account'}
                loading={submitting}
                disabled={!canContinue || submitting}
                onPress={onFinish}
              />
            ) : step === 'photo' || step === 'bio' ? (
              // Skip-or-Continue pair for optional steps
              <View style={styles.skipRow}>
                <Pressable
                  onPress={() => { lightTap(); onContinue() }}
                  style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
                <View style={{ flex: 2 }}>
                  <BrandButton
                    label="Continue"
                    disabled={!canContinue}
                    onPress={onContinue}
                    trailing={<Text style={styles.arrow}>→</Text>}
                  />
                </View>
              </View>
            ) : (
              <BrandButton
                label="Continue"
                disabled={!canContinue}
                onPress={onContinue}
                trailing={<Text style={styles.arrow}>→</Text>}
              />
            )}

            {step === 'auth' ? (
              <View style={{ marginTop: 14 }}><LegalFooter /></View>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── Step: username ──────────────────────────────────────
function StepUsername({
  username, setUsername, status,
}: { username: string; setUsername: (s: string) => void; status: 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'too-short' }) {
  const cleaned = cleanUsername(username)
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>Claim your URL</Text>
      <Text style={styles.subhead}>
        This is where your reels and listings live. You can change it later.
      </Text>
      <View style={styles.urlRow}>
        <Text style={styles.urlPrefix}>reel.st/</Text>
        <TextInput
          value={username}
          onChangeText={(v) => setUsername(cleanUsername(v))}
          placeholder="yourname"
          placeholderTextColor="#D4D0C8"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          maxLength={24}
          style={styles.urlInput}
        />
      </View>
      <View style={styles.statusRow}>
        {status === 'checking' ? <ActivityIndicator size="small" color={COLORS.tangerine} />
          : status === 'available' ? <Text style={[styles.statusText, { color: '#34C759' }]}>✓ Available — claim it</Text>
          : status === 'taken' ? <Text style={[styles.statusText, { color: COLORS.liveRed }]}>That username is taken</Text>
          : status === 'reserved' ? <Text style={[styles.statusText, { color: COLORS.liveRed }]}>That username is reserved</Text>
          : status === 'too-short' ? <Text style={[styles.statusText, { color: COLORS.smoke }]}>3+ letters</Text>
          : <Text style={[styles.statusText, { color: COLORS.smoke }]}>Letters only · 3-24 chars</Text>}
      </View>
      {cleaned.length > 0 ? <Text style={styles.previewUrl} numberOfLines={1}>reel.st/{cleaned}</Text> : null}
    </View>
  )
}

// ─── Step: name ──────────────────────────────────────────
function StepName({ displayName, setDisplayName }: { displayName: string; setDisplayName: (s: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>What's your name?</Text>
      <Text style={styles.subhead}>This is the name that shows on your profile.</Text>
      <View style={{ height: 12 }} />
      <BrandInput
        forceLight
        placeholder="Your full name"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />
    </View>
  )
}

// ─── Step: goals ─────────────────────────────────────────
function StepGoals({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>What's your main goal?</Text>
      <Text style={styles.subhead}>Select all that apply — we'll tailor your setup.</Text>
      <View style={{ height: 16 }} />
      {GOAL_OPTIONS.map((opt) => {
        const active = selected.includes(opt.id)
        return (
          <Pressable
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={({ pressed }) => [
              styles.optionCard,
              active && styles.optionCardActive,
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, active && { color: COLORS.tangerine }]}>{opt.label}</Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            <View style={[styles.checkCircle, active && styles.checkCircleActive]}>
              {active ? <Check size={14} color={COLORS.warmWhite} weight="bold" /> : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

// ─── Step: photo ─────────────────────────────────────────
function StepPhoto({ photoUri, onPick }: { photoUri: string | null; onPick: () => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>Add a photo</Text>
      <Text style={styles.subhead}>Agents with photos get 3× more engagement. You can skip and add it later.</Text>
      <View style={{ height: 24 }} />
      <View style={styles.photoCenter}>
        <Pressable
          onPress={onPick}
          style={({ pressed }) => [styles.photoFrame, pressed && { opacity: 0.85 }]}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={28} color={COLORS.tangerine} weight="regular" />
            </View>
          )}
        </Pressable>
        <Pressable onPress={onPick} style={styles.photoCta}>
          <Plus size={14} color={COLORS.tangerine} weight="bold" />
          <Text style={styles.photoCtaText}>{photoUri ? 'Change photo' : 'Choose photo'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Step: license ───────────────────────────────────────
function StepLicense({
  state, setState, number, setNumber, legalName, setLegalName,
}: {
  state: string; setState: (s: string) => void
  number: string; setNumber: (s: string) => void
  legalName: string; setLegalName: (s: string) => void
}) {
  const [stateOpen, setStateOpen] = useState(false)
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>License verification</Text>
      <Text style={styles.subhead}>Required to publish your Reelst.</Text>

      <Text style={styles.fieldLabel}>State</Text>
      {/* Wrap select trigger + dropdown panel in a relative container so
          the panel can absolutely position over the fields below rather
          than pushing License # / Legal name down when opened. */}
      <View style={styles.selectAnchor}>
        <Pressable
          onPress={() => { lightTap(); setStateOpen((o) => !o) }}
          style={({ pressed }) => [
            styles.selectBox,
            stateOpen && styles.selectBoxOpen,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.selectValue, !state && { color: '#D4D0C8' }]}>
            {state ? `${state} — ${stateName(state)}` : 'Select state'}
          </Text>
          <Text style={[styles.selectChevron, stateOpen && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
        </Pressable>

        {stateOpen ? (
          <View style={styles.dropdownPanel}>
            <ScrollView
              nestedScrollEnabled
              style={styles.dropdownScroll}
              keyboardShouldPersistTaps="handled"
            >
              {US_STATES.map((s) => {
                const active = s === state
                return (
                  <Pressable
                    key={s}
                    onPress={() => { selection(); setState(s); setStateOpen(false) }}
                    style={({ pressed }) => [
                      styles.dropdownRow,
                      active && styles.dropdownRowActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.dropdownRowText, active && { color: COLORS.tangerine, fontFamily: FONTS.humanistBold }]}>
                      {s} — {stateName(s)}
                    </Text>
                    {active ? <Check size={14} color={COLORS.tangerine} weight="bold" /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <Text style={styles.fieldLabel}>License number</Text>
      <BrandInput
        forceLight
        placeholder="e.g. SL1234567"
        value={number}
        onChangeText={setNumber}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Text style={styles.fieldLabel}>Legal name on license</Text>
      <BrandInput
        forceLight
        placeholder="Full legal name"
        value={legalName}
        onChangeText={setLegalName}
        autoCapitalize="words"
        autoCorrect={false}
      />
    </View>
  )
}

// Friendly state names so the select chip reads "FL — Florida".
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}
function stateName(abbr: string): string { return STATE_NAMES[abbr] || abbr }


// ─── Step: bio ───────────────────────────────────────────
function StepBio({ bio, setBio }: { bio: string; setBio: (s: string) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>Short bio</Text>
      <Text style={styles.subhead}>One line that says who you are. Skip and add later if you want.</Text>
      <View style={{ height: 12 }} />
      <BrandInput
        forceLight
        placeholder="Tell visitors who you are and what you specialize in."
        value={bio}
        onChangeText={(v) => v.length <= 250 && setBio(v)}
        multiline
        numberOfLines={4}
        maxLength={250}
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      <Text style={styles.charCount}>{bio.length}/250</Text>
    </View>
  )
}

// ─── Step: notifications ─────────────────────────────────
function StepNotifications({
  push, setPush, email, setEmail,
}: {
  push: NotificationPrefs; setPush: (p: NotificationPrefs) => void
  email: NotificationPrefs; setEmail: (p: NotificationPrefs) => void
}) {
  const events: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
    { key: 'showingRequest', label: 'Showing requests', desc: 'A buyer wants to see one of your listings' },
    { key: 'newSubscriber',  label: 'New subscribers',  desc: 'Someone subscribed to you for weekly updates' },
    { key: 'newWave',        label: 'Waves',            desc: 'A buyer typed a question on a listing' },
  ]
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>Stay in the loop</Text>
      <Text style={styles.subhead}>Pick which alerts you want. You can change these any time in Settings.</Text>

      <View style={styles.notifHeaderRow}>
        <Text style={styles.notifHeaderLabel}>Event</Text>
        <View style={styles.notifCol}><Bell size={14} color={COLORS.smoke} weight="regular" /><Text style={styles.notifColLabel}>Push</Text></View>
        <View style={styles.notifCol}><Envelope size={14} color={COLORS.smoke} weight="regular" /><Text style={styles.notifColLabel}>Email</Text></View>
      </View>

      {events.map((e) => (
        <View key={e.key} style={styles.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifEventLabel}>{e.label}</Text>
            <Text style={styles.notifEventDesc}>{e.desc}</Text>
          </View>
          <Toggle
            value={push[e.key]}
            onChange={(v) => setPush({ ...push, [e.key]: v })}
          />
          <Toggle
            value={email[e.key]}
            onChange={(v) => setEmail({ ...email, [e.key]: v })}
          />
        </View>
      ))}
      <Text style={styles.notifFooter}>
        iOS will ask for push permission the first time we send one.
      </Text>
    </View>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => { selection(); onChange(!value) }}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </Pressable>
  )
}

// ─── Step: auth ──────────────────────────────────────────
function StepAuth({
  email, setEmail, password, setPassword, error, submitting, onSubmit,
}: {
  email: string; setEmail: (s: string) => void
  password: string; setPassword: (s: string) => void
  error: string; submitting: boolean; onSubmit: () => void
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.h1}>Almost there</Text>
      <Text style={styles.subhead}>Your email and a password to sign in. We'll verify your email next.</Text>
      <View style={{ height: 12 }} />
      <View style={styles.fields}>
        <BrandInput
          forceLight
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="email"
          textContentType="username"
          editable={!submitting}
        />
        <BrandInput
          forceLight
          placeholder="Password (6+ characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          // Opt out of iOS Strong Password Autofill (yellow overlay).
          autoComplete="off"
          textContentType="oneTimeCode"
          passwordRules=""
          editable={!submitting}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <Text style={styles.consent}>
        By creating an account, you agree to our{' '}
        <Text style={styles.consentLink} onPress={() => Linking.openURL('https://reel.st/terms')}>Terms of Use</Text>
        {' '}and{' '}
        <Text style={styles.consentLink} onPress={() => Linking.openURL('https://reel.st/privacy')}>Privacy Policy</Text>.
      </Text>
    </View>
  )
}

// ─── Step: moment ────────────────────────────────────────
// Port of desktop `MomentStep` — animated text reveal that pauses the
// flow for a beat after the user typed their name. 4 phrases fade-in
// + slide-up on a ~4.2s timeline, then auto-advances to goals.
function StepMoment({ name, onComplete }: { name: string; onComplete: () => void }) {
  const opacity1 = useRef(new Animated.Value(0)).current
  const opacity2 = useRef(new Animated.Value(0)).current
  const opacity3 = useRef(new Animated.Value(0)).current
  const opacity4 = useRef(new Animated.Value(0)).current
  const translate1 = useRef(new Animated.Value(12)).current
  const translate2 = useRef(new Animated.Value(12)).current
  const translate3 = useRef(new Animated.Value(12)).current
  const translate4 = useRef(new Animated.Value(12)).current
  // "Tap to continue" hint — fades in + gently pulses to draw the eye.
  const hintOpacity = useRef(new Animated.Value(0)).current
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ease = Easing.bezier(0.22, 1, 0.36, 1)
    const reveal = (op: Animated.Value, tr: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 800, delay, easing: ease, useNativeDriver: true }),
        Animated.timing(tr, { toValue: 0, duration: 800, delay, easing: ease, useNativeDriver: true }),
      ])

    Animated.parallel([
      reveal(opacity1, translate1, 200),
      reveal(opacity2, translate2, 1000),
      reveal(opacity3, translate3, 2200),
      reveal(opacity4, translate4, 3200),
    ]).start()

    // After line 4 finishes (~4.2s), fade in the tap hint and let it
    // breathe via a slow opacity loop so it reads as "I'm waiting".
    // Narrow opacity range (0.55 ↔ 1.0) means the hint NEVER reads as
    // disappearing — always clearly legible, just gently pulsing.
    const hintTimer = setTimeout(() => {
      setReady(true)
      Animated.sequence([
        Animated.timing(hintOpacity, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(hintOpacity, { toValue: 0.55, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(hintOpacity, { toValue: 1,    duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
      ]).start()
    }, 4200)
    return () => clearTimeout(hintTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Pressable
      onPress={() => { if (ready) { lightTap(); onComplete() } }}
      style={styles.momentPressable}
    >
      <View style={styles.momentWrap}>
        <Animated.Text
          style={[
            styles.momentLine, styles.momentLineBold,
            { opacity: opacity1, transform: [{ translateY: translate1 }] },
          ]}
        >
          <Text style={{ color: COLORS.tangerine }}>Hi {name}</Text>, let's bring
        </Animated.Text>
        <Animated.Text
          style={[
            styles.momentLine, styles.momentLineBold,
            { opacity: opacity2, transform: [{ translateY: translate2 }] },
          ]}
        >
          your listings to life.
        </Animated.Text>
        <Animated.Text
          style={[
            styles.momentSub,
            { opacity: opacity3, transform: [{ translateY: translate3 }] },
          ]}
        >
          Your map. Your reels. Your story.
        </Animated.Text>
        <Animated.Text
          style={[
            styles.momentSub, styles.momentSubAccent,
            { opacity: opacity4, transform: [{ translateY: translate4 }] },
          ]}
        >
          Let's build it.
        </Animated.Text>
      </View>
      <Animated.Text style={[styles.momentHint, { opacity: hintOpacity }]}>
        Tap anywhere to continue
      </Animated.Text>
    </Pressable>
  )
}

// ─── Step: done ──────────────────────────────────────────
function StepDone({ displayName }: { displayName: string }) {
  return (
    <View style={styles.doneWrap}>
      <View style={styles.doneIconCircle}>
        <CheckCircle size={64} color={COLORS.tangerine} weight="fill" />
      </View>
      <Text style={styles.h1}>You're in, {displayName.split(' ')[0] || 'agent'}.</Text>
      <Text style={styles.subhead}>
        We sent a verification link to your email. Open it to start
        building your Reelst.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.10)' },
  dotActive: { backgroundColor: COLORS.tangerine },

  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
  stepWrap: { gap: 4 },

  brandAnchor: { alignItems: 'center', paddingTop: 4, paddingBottom: 14 },
  h1: {
    fontFamily: FONTS.humanistSemibold, fontSize: 26, lineHeight: 32,
    color: COLORS.ink, letterSpacing: -0.5,
  },
  subhead: {
    fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.smoke, lineHeight: 20, marginTop: 6,
  },

  urlRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.warmWhite, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.pearl,
    paddingHorizontal: 18, paddingVertical: 14, marginTop: 18,
  },
  urlPrefix: { fontFamily: FONTS.humanistSemibold, fontSize: 16, color: COLORS.smoke },
  urlInput: {
    flex: 1, fontFamily: FONTS.humanistSemibold, fontSize: 16, color: COLORS.ink, paddingVertical: 0,
  },
  statusRow: { minHeight: 22, marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  statusText: { fontFamily: FONTS.humanistSemibold, fontSize: 13 },
  previewUrl: { marginTop: 12, fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke },

  // Goals
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 16, borderWidth: 2, borderColor: COLORS.pearl,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 10,
  },
  optionCardActive: { borderColor: COLORS.tangerine, backgroundColor: 'rgba(255,107,61,0.05)' },
  optionLabel: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  optionDesc: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#D4D0C8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { borderColor: COLORS.tangerine, backgroundColor: COLORS.tangerine },

  // Photo
  photoCenter: { alignItems: 'center', gap: 14, marginTop: 16 },
  photoFrame: {
    width: 156, height: 156, borderRadius: 78,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 2, borderColor: COLORS.pearl,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,107,61,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, backgroundColor: 'rgba(255,107,61,0.10)',
  },
  photoCtaText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.tangerine },

  // Field labels (shared)
  fieldLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 16, marginBottom: 8,
  },

  // License
  // Relative wrapper for the select + its absolute-positioned panel.
  // zIndex bumped so the panel floats above the License# / Legal name
  // fields below it instead of getting tucked underneath.
  selectAnchor: { position: 'relative', zIndex: 20 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.warmWhite,
    borderRadius: 16, borderWidth: 2, borderColor: COLORS.pearl,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  selectValue: { fontFamily: FONTS.humanist, fontSize: 15, color: COLORS.ink, flex: 1 },
  selectChevron: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.smoke, marginLeft: 8 },
  // When the dropdown is open, the select-box visually "joins" the
  // panel below by squaring its bottom corners.
  selectBoxOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottomWidth: 0, borderColor: COLORS.tangerine,
  },

  // Dropdown panel — absolutely positioned under the select so opening
  // it overlays the License# / Legal name fields instead of pushing them.
  // top: 100% pins to the select-box's bottom edge.
  dropdownPanel: {
    position: 'absolute',
    top: '100%', left: 0, right: 0,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 2, borderTopWidth: 0, borderColor: COLORS.tangerine,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    overflow: 'hidden',
    // Subtle shadow gives it a slight elevation cue
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16,
    elevation: 8,
  },
  dropdownScroll: { maxHeight: 280 },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.pearl,
  },
  dropdownRowActive: { backgroundColor: 'rgba(255,107,61,0.06)' },
  dropdownRowText: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.ink },

  // Bio
  charCount: { alignSelf: 'flex-end', fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 6 },

  // Notifications
  notifHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 22, marginBottom: 10,
    paddingHorizontal: 4,
  },
  notifHeaderLabel: { flex: 1, fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke, textTransform: 'uppercase', letterSpacing: 0.6 },
  notifCol: { width: 56, alignItems: 'center', flexDirection: 'column', gap: 2 },
  notifColLabel: { fontFamily: FONTS.humanistSemibold, fontSize: 10.5, color: COLORS.smoke, textTransform: 'uppercase', letterSpacing: 0.6 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 8,
  },
  notifEventLabel: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  notifEventDesc: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  notifFooter: { marginTop: 8, fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, textAlign: 'center' },

  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: '#D9D5CB',
    padding: 2, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: COLORS.tangerine },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.10, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
  },
  toggleKnobOn: { transform: [{ translateX: 18 }] },

  // Auth
  fields: { gap: 12, marginTop: 8 },
  error: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.liveRed, marginTop: 2 },
  consent: {
    marginTop: 18, fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke,
    lineHeight: 16, textAlign: 'center',
  },
  consentLink: { fontFamily: FONTS.humanistSemibold, color: COLORS.tangerine, textDecorationLine: 'underline' },

  // Moment (animated name reveal). All four lines share the same display
  // size so the screen fills top-to-bottom rather than tapering to small
  // body type after the headline — keeps the beat feeling cinematic.
  // Consistent 24px stanza spacing throughout (no jammed accent line at
  // the end — the build-it line deserves the same beat as the others).
  momentPressable: { flex: 1, justifyContent: 'space-between', paddingBottom: 36 },
  momentWrap: { paddingTop: 32 },
  momentLine: {
    fontFamily: FONTS.humanistSemibold, fontSize: 30, lineHeight: 38,
    color: COLORS.ink, letterSpacing: -0.6,
  },
  momentLineBold: {},
  momentSub: {
    fontFamily: FONTS.humanistSemibold, fontSize: 30, lineHeight: 38,
    color: COLORS.smoke, letterSpacing: -0.6,
    marginTop: 24,
  },
  momentSubAccent: {
    fontFamily: FONTS.humanistBold, color: COLORS.tangerine,
    marginTop: 24,
  },
  momentHint: {
    textAlign: 'center', fontFamily: FONTS.humanistSemibold, fontSize: 12,
    color: COLORS.smoke, letterSpacing: 0.6, textTransform: 'uppercase',
    marginTop: 24,
  },

  // Done
  doneWrap: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 24, gap: 8 },
  doneIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,107,61,0.10)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },

  // Footer
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  skipRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: 999, borderWidth: 2, borderColor: COLORS.pearl,
    backgroundColor: COLORS.warmWhite, alignItems: 'center',
  },
  skipText: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.smoke },
  arrow: { fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.warmWhite, lineHeight: 18 },
})
