import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Linking, Share, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import {
  ArrowLeft,
  User,
  Buildings,
  LinkSimple,
  Shield,
  CreditCard,
  ShareNetwork,
  SignOut,
  CaretRight,
  Sun,
  Moon,
  Gear,
} from 'phosphor-react-native'
import { useColorScheme } from 'react-native'
import { currentUser, signOut } from '../lib/firebaseAuth'
import { signOutFromGoogle } from '../lib/googleSignIn'
import { lightTap, warning } from '../lib/haptics'
import { COLORS, FONTS } from '../lib/tokens'
import { useUserDoc } from '../lib/useUserDoc'
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore'
import functions from '@react-native-firebase/functions'
import { type ThemePreference } from '../lib/appearance'
import { useColors, useTheme, useThemedStyles } from '../lib/theme'
import { useEffect } from 'react'
import { Toggle } from '../components/style/primitives'
import { ConfirmSheet } from '../components/ConfirmSheet'
import {
  EditProfileSheet,
  EditBrokerageSheet,
  AddPlatformSheet,
} from '../components/style/sheets'

/**
 * Settings — mirrors the web Dashboard settings tab
 * (src/pages/Dashboard.tsx ~lines 966-1040). Same section structure:
 *  - Account (Edit Profile, Brokerage, Social Links, License Verification)
 *  - Notifications (toggles — placeholder for now)
 *  - Appearance (light / dark / system — placeholder)
 *  - Plan (Subscription row)
 *  - Feedback (placeholder)
 *  - Share Reelst
 *  - Sign out
 *  - Danger Zone (Delete account, Privacy/Terms links)
 *
 * Real interactive sheets (Edit Profile, Brokerage, Social Links,
 * NotificationSettings, AppearancePicker, FeedbackForm) drop in
 * tab-by-tab in subsequent milestones. Rows currently no-op when tapped
 * except Subscription, Share, Sign out, and Privacy/Terms which work.
 */
export function SettingsScreen() {
  const navigation = useNavigation()
  const user = currentUser()
  const { userDoc } = useUserDoc()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const styles = useThemedStyles(_styles)
  const colors = useColors()

  // ── Sheets ──
  type SheetKey = 'profile' | 'brokerage' | 'platform' | null
  const [openSheet, setOpenSheet] = useState<SheetKey>(null)
  const closeSheet = () => setOpenSheet(null)

  const writeUser = async (patch: Record<string, unknown>) => {
    if (!userDoc?.uid) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(doc(getFirestore(), 'users', userDoc.uid), patch as any)
  }

  const platformCount = userDoc?.platforms?.length ?? 0
  const brokerageDesc = userDoc?.brokerage || 'Add to amplify your About page'
  const profileDesc = userDoc?.displayName
    ? `${userDoc.displayName}${userDoc.bio ? ' · ' + userDoc.bio.slice(0, 24) + (userDoc.bio.length > 24 ? '…' : '') : ''}`
    : 'Name, bio, photo'
  const socialDesc = platformCount > 0 ? `${platformCount} connected` : 'Connect Instagram, TikTok, more'

  const handleSignOut = () => {
    warning()
    setSignOutConfirmOpen(true)
  }

  const performSignOut = async () => {
    setSigningOut(true)
    try {
      // Sign out from both providers so the next "Continue with Google"
      // tap shows the account picker rather than auto-resuming the last
      // session. Google sign-out is best-effort — never block Firebase
      // signOut on it.
      await Promise.all([signOut(), signOutFromGoogle()])
      // RootNavigator auth listener will swap back to the Auth stack.
    } finally {
      setSigningOut(false)
      setSignOutConfirmOpen(false)
    }
  }

  const performDelete = async () => {
    setDeleting(true)
    try {
      // Server-side callable purges the user doc, pins, content, storage,
      // and the Firebase Auth user. Client just observes the auth state
      // flip back to signed-out via the RootNavigator listener.
      await functions().httpsCallable('deleteSelfAccount')({})
      // Auth listener handles the swap; close the sheet on success too.
      setDeleteConfirmOpen(false)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Settings] deleteAccount failed', e)
      Alert.alert('Could not delete account', 'Try again in a moment, or contact support if this keeps happening.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { lightTap(); navigation.goBack() }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ArrowLeft size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ACCOUNT */}
        <Text style={styles.sectionLabel}>Account</Text>
        <SettingsRow
          Icon={User}
          label="Edit Profile"
          desc={profileDesc}
          onPress={() => { lightTap(); setOpenSheet('profile') }}
        />
        <SettingsRow
          Icon={Buildings}
          label="Brokerage / Company"
          desc={brokerageDesc}
          onPress={() => { lightTap(); setOpenSheet('brokerage') }}
        />
        <SettingsRow
          Icon={LinkSimple}
          label="Social Links"
          desc={socialDesc}
          onPress={() => { lightTap(); setOpenSheet('platform') }}
        />
        <SettingsRow
          Icon={Shield}
          label="License Verification"
          desc={userDoc?.licenseNumber ? 'Submitted · pending review' : 'Not verified'}
          onPress={() => lightTap()}
        />

        {/* NOTIFICATIONS */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Notifications</Text>
        <NotificationToggles
          pushPrefs={userDoc?.notificationPrefs ?? null}
          emailPrefs={userDoc?.emailPrefs ?? null}
          onChangePush={(prefs) => writeUser({ notificationPrefs: prefs })}
          onChangeEmail={(prefs) => writeUser({ emailPrefs: prefs })}
        />

        {/* APPEARANCE */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Appearance</Text>
        <AppearancePicker />

        {/* PLAN */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Plan</Text>
        <SettingsRow
          Icon={CreditCard}
          label="Subscription"
          desc={userDoc?.tier === 'pro' ? 'Pro plan' : 'Free plan'}
          onPress={() => lightTap()}
          trailing={<Text style={styles.tierBadge}>{userDoc?.tier === 'pro' ? 'Pro' : 'Free'}</Text>}
        />

        {/* FEEDBACK */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Feedback</Text>
        <View style={styles.placeholderRow}>
          <Text style={styles.placeholderText}>Tell us what'd make Reelst better.</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={async () => {
              lightTap()
              const username = userDoc?.username
              if (!username) {
                Alert.alert('Pick a username first', 'You need a username before you can share your profile.')
                return
              }
              const url = `https://reel.st/${username}`
              const name = userDoc?.displayName || username
              try {
                await Share.share({
                  url, // iOS uses url for rich previews
                  message: `Check out ${name}'s map of listings on Reelst — ${url}`,
                  title: `${name} on Reelst`,
                })
              } catch {
                // user cancelled or unavailable — silent
              }
            }}
            style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
          >
            <ShareNetwork size={16} color={colors.ink} />
            <Text style={styles.shareText}>Share Reelst</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed, signingOut && styles.disabled]}
        >
          <SignOut size={16} color={COLORS.liveRed} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        {/* Email + UID footer (proof of who's signed in) */}
        {user ? (
          <View style={styles.uidFooter}>
            <Text style={styles.uidLabel}>Signed in as</Text>
            <Text style={styles.uidEmail}>{user.email}</Text>
          </View>
        ) : null}

        {/* DANGER ZONE */}
        <Text style={[styles.dangerLabel, styles.sectionTop]}>Danger Zone</Text>
        <Pressable
          onPress={() => { warning(); setDeleteConfirmOpen(true) }}
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete my account</Text>
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL('https://reel.st/privacy')}>
            <Text style={styles.legalLink}>Privacy</Text>
          </Pressable>
          <Text style={styles.legalDivider}>·</Text>
          <Pressable onPress={() => Linking.openURL('https://reel.st/terms')}>
            <Text style={styles.legalLink}>Terms</Text>
          </Pressable>
          <Text style={styles.legalDivider}>·</Text>
          <Text style={styles.legalVersion}>Reelst v1.0.0</Text>
        </View>
      </ScrollView>

      {/* ── Sheets ── */}
      <EditProfileSheet
        visible={openSheet === 'profile'}
        uid={userDoc?.uid ?? null}
        initialName={userDoc?.displayName ?? null}
        initialBio={userDoc?.bio ?? null}
        initialPhotoURL={userDoc?.photoURL ?? null}
        onClose={closeSheet}
        onSave={(patch) => writeUser(patch)}
      />
      <EditBrokerageSheet
        visible={openSheet === 'brokerage'}
        initialValue={userDoc?.brokerage ?? null}
        onClose={closeSheet}
        onSave={(brokerage) => writeUser({ brokerage })}
      />
      <AddPlatformSheet
        visible={openSheet === 'platform'}
        onClose={closeSheet}
        onSave={async (platformId, username) => {
          const list = userDoc?.platforms ?? []
          const exists = list.some((p) => p.id === platformId)
          const next = exists
            ? list.map((p) => (p.id === platformId ? { ...p, username } : p))
            : [...list, { id: platformId, username }]
          await writeUser({ platforms: next })
        }}
      />

      {/* Branded sign-out confirmation — replaces iOS native Alert.alert */}
      <ConfirmSheet
        visible={signOutConfirmOpen}
        title="Sign out?"
        message="You'll need to sign in again to access your dashboard."
        confirmLabel="Sign out"
        destructive
        loading={signingOut}
        onConfirm={performSignOut}
        onClose={() => setSignOutConfirmOpen(false)}
      />

      {/* Irreversible account deletion — type-DELETE gate before confirm */}
      <ConfirmSheet
        visible={deleteConfirmOpen}
        title="Delete your account?"
        message="This permanently removes your profile, listings, content, and analytics. We can't recover any of it after this."
        confirmLabel="Delete forever"
        destructive
        loading={deleting}
        requireTypedConfirmation="DELETE"
        onConfirm={performDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </SafeAreaView>
  )
}

interface SettingsRowProps {
  Icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  desc: string
  onPress: () => void
  trailing?: React.ReactNode
}

// ─── AppearancePicker — Light / Dark / System segmented control ──
// Stored in AsyncStorage under the same key the web themeStore uses
// (`reelst_theme`). Theme application is deferred until dark mode
// renders ship; this just persists the preference for now.
function AppearancePicker() {
  const { preference, resolved, setPreference } = useTheme()
  const appearanceStyles = useThemedStyles(_appearanceStyles)
  const colors = useColors()

  const options: { id: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { id: 'light',  label: 'Light',  Icon: Sun },
    { id: 'dark',   label: 'Dark',   Icon: Moon },
    { id: 'system', label: 'System', Icon: Gear },
  ]

  const subtitle = preference === 'system'
    ? `Following your device · currently ${resolved}`
    : preference === 'dark'
      ? 'Dark mode'
      : 'Light mode'

  return (
    <View style={appearanceStyles.wrap}>
      <View style={appearanceStyles.segmented}>
        {options.map((o) => {
          const active = preference === o.id
          return (
            <Pressable
              key={o.id}
              onPress={() => {
                if (active) return
                lightTap()
                setPreference(o.id)
              }}
              style={({ pressed }) => [
                appearanceStyles.segment,
                active && appearanceStyles.segmentActive,
                pressed && !active && { opacity: 0.7 },
              ]}
            >
              <o.Icon size={14} color={active ? colors.ink : colors.smoke} />
              <Text style={[appearanceStyles.segmentText, active && appearanceStyles.segmentTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Text style={appearanceStyles.subtitle}>{subtitle}</Text>
    </View>
  )
}

const _appearanceStyles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.cream, borderRadius: 14, padding: 8 },
  segmented: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: COLORS.pearl },
  segment: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: COLORS.warmWhite,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1,
  },
  segmentText: { fontFamily: FONTS.humanistSemibold, fontSize: 12.5, color: COLORS.smoke },
  segmentTextActive: { color: COLORS.ink },
  subtitle: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 8, marginLeft: 4 },
})

// ─── NotificationToggles ─────────────────────────────────────────
// Master toggle + 3 per-category × 2 columns (Push | Email). Push
// gates FCM; email gates per-event email. Backend `notifyUser`
// checks each channel independently. Master OFF zeroes both
// channels; master ON re-enables both.
interface NotificationPrefs { showingRequest: boolean; newSubscriber: boolean; newWave: boolean }
const NOTIF_DEFAULT: NotificationPrefs = { showingRequest: true, newSubscriber: true, newWave: true }

function resolvePrefs(p: { showingRequest?: boolean; newSubscriber?: boolean; newWave?: boolean } | null): NotificationPrefs {
  return {
    showingRequest: p?.showingRequest ?? NOTIF_DEFAULT.showingRequest,
    newSubscriber:  p?.newSubscriber  ?? NOTIF_DEFAULT.newSubscriber,
    newWave:        p?.newWave        ?? NOTIF_DEFAULT.newWave,
  }
}

function NotificationToggles({
  pushPrefs,
  emailPrefs,
  onChangePush,
  onChangeEmail,
}: {
  pushPrefs: { showingRequest?: boolean; newSubscriber?: boolean; newWave?: boolean } | null
  emailPrefs: { showingRequest?: boolean; newSubscriber?: boolean; newWave?: boolean } | null
  onChangePush: (next: NotificationPrefs) => void
  onChangeEmail: (next: NotificationPrefs) => void
}) {
  const notifStyles = useThemedStyles(_notifStyles)
  const push = resolvePrefs(pushPrefs)
  const email = resolvePrefs(emailPrefs)
  const anyOn =
    push.showingRequest || push.newSubscriber || push.newWave ||
    email.showingRequest || email.newSubscriber || email.newWave

  const setMaster = (value: boolean) => {
    const next = { showingRequest: value, newSubscriber: value, newWave: value }
    onChangePush(next)
    onChangeEmail(next)
  }
  const setPushKey = (key: keyof NotificationPrefs, value: boolean) => {
    onChangePush({ ...push, [key]: value })
  }
  const setEmailKey = (key: keyof NotificationPrefs, value: boolean) => {
    onChangeEmail({ ...email, [key]: value })
  }

  const rows: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
    { key: 'showingRequest', label: 'Showing requests', desc: 'A visitor wants to tour one of your listings.' },
    { key: 'newSubscriber',  label: 'New subscribers',  desc: 'Someone subscribed to you for weekly updates.' },
    { key: 'newWave',        label: 'Waves',            desc: 'A buyer asked a question about a listing.' },
  ]

  return (
    <View style={notifStyles.wrap}>
      <View style={notifStyles.masterRow}>
        <View style={{ flex: 1 }}>
          <Text style={notifStyles.masterLabel}>Notifications</Text>
          <Text style={notifStyles.masterDesc}>
            {anyOn ? 'Reelst will let you know what matters.' : 'Notifications are off.'}
          </Text>
        </View>
        <Toggle value={anyOn} onChange={setMaster} />
      </View>
      {anyOn ? (
        <View style={notifStyles.rowList}>
          <View style={notifStyles.columnHeader}>
            <View style={{ flex: 1 }} />
            <Text style={notifStyles.columnLabel}>PUSH</Text>
            <Text style={notifStyles.columnLabel}>EMAIL</Text>
          </View>
          {rows.map((r) => (
            <View key={r.key} style={notifStyles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={notifStyles.rowLabel}>{r.label}</Text>
                <Text style={notifStyles.rowDesc}>{r.desc}</Text>
              </View>
              <View style={notifStyles.toggleCol}>
                <Toggle value={push[r.key]} onChange={(v) => setPushKey(r.key, v)} size="small" />
              </View>
              <View style={notifStyles.toggleCol}>
                <Toggle value={email[r.key]} onChange={(v) => setEmailKey(r.key, v)} size="small" />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const _notifStyles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.cream, borderRadius: 14, padding: 12 },
  masterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  masterLabel: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.ink },
  masterDesc: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 2 },
  rowList: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  columnHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 6 },
  columnLabel: {
    width: 50, textAlign: 'center',
    fontFamily: FONTS.humanistBold, fontSize: 9, color: COLORS.smoke,
    letterSpacing: 0.6,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  toggleCol: { width: 50, alignItems: 'center' },
  rowLabel: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.ink },
  rowDesc: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 2 },
})

function SettingsRow({ Icon, label, desc, onPress, trailing }: SettingsRowProps) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.rowIcon}>
        <Icon size={18} color={colors.graphite} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      {trailing ?? <CaretRight size={16} color={colors.ash} />}
    </Pressable>
  )
}

const _styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.ivory,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cream },
  headerTitle: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 8 },

  sectionLabel: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 12,
    color: COLORS.smoke,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  sectionTop: { paddingTop: 16 },
  dangerLabel: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 12,
    color: 'rgba(255, 59, 48, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.cream,
    borderRadius: 14,
    padding: 16,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.pearl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontFamily: FONTS.humanistMedium, fontSize: 15, color: COLORS.ink },
  rowDesc: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },

  tierBadge: {
    fontFamily: FONTS.humanistBold,
    fontSize: 11,
    color: COLORS.smoke,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.pearl,
    overflow: 'hidden',
  },

  placeholderRow: {
    backgroundColor: 'rgba(217, 74, 31, 0.06)',
    borderRadius: 14,
    padding: 16,
  },
  placeholderText: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke },

  actionRow: { paddingTop: 16 },
  shareBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 2,
    borderColor: COLORS.pearl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareText: { fontFamily: FONTS.humanistSemibold, fontSize: 15, color: COLORS.ink },
  signOutBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  signOutText: { fontFamily: FONTS.humanistSemibold, fontSize: 15, color: COLORS.liveRed },

  uidFooter: { alignItems: 'center', paddingTop: 16 },
  uidLabel: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.ash, textTransform: 'uppercase', letterSpacing: 0.8 },
  uidEmail: { fontFamily: FONTS.humanistMedium, fontSize: 13, color: COLORS.smoke, marginTop: 4 },

  deleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
    backgroundColor: 'rgba(255, 59, 48, 0.03)',
  },
  deleteText: { fontFamily: FONTS.humanist, fontSize: 13, color: 'rgba(255, 59, 48, 0.85)' },

  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 16 },
  legalLink: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.ash },
  legalDivider: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.ash },
  legalVersion: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.ash },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
})
