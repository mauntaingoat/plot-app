import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from 'react-native'
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
} from 'phosphor-react-native'
import { currentUser, signOut } from '../lib/firebaseAuth'
import { lightTap, warning } from '../lib/haptics'
import { COLORS, FONTS } from '../lib/tokens'

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
  const [signingOut, setSigningOut] = useState(false)

  const accountRows = [
    { Icon: User,       label: 'Edit Profile',        desc: 'Name, bio, photo' },
    { Icon: Buildings,  label: 'Brokerage / Company', desc: 'Add to amplify your About page' },
    { Icon: LinkSimple, label: 'Social Links',        desc: 'Connected platforms' },
    { Icon: Shield,     label: 'License Verification', desc: 'Not verified' },
  ]

  const handleSignOut = async () => {
    setSigningOut(true)
    warning()
    try {
      await signOut()
      // RootNavigator auth listener will swap back to the Auth stack.
    } finally {
      setSigningOut(false)
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
          <ArrowLeft size={20} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ACCOUNT */}
        <Text style={styles.sectionLabel}>Account</Text>
        {accountRows.map((row) => (
          <SettingsRow
            key={row.label}
            Icon={row.Icon}
            label={row.label}
            desc={row.desc}
            onPress={() => lightTap()}
          />
        ))}

        {/* NOTIFICATIONS */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Notifications</Text>
        <View style={styles.placeholderRow}>
          <Text style={styles.placeholderText}>Notification preferences land here next.</Text>
        </View>

        {/* APPEARANCE */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Appearance</Text>
        <View style={styles.placeholderRow}>
          <Text style={styles.placeholderText}>Light / Dark / System picker drops in next.</Text>
        </View>

        {/* PLAN */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Plan</Text>
        <SettingsRow
          Icon={CreditCard}
          label="Subscription"
          desc="Free plan"
          onPress={() => lightTap()}
          trailing={<Text style={styles.tierBadge}>Free</Text>}
        />

        {/* FEEDBACK */}
        <Text style={[styles.sectionLabel, styles.sectionTop]}>Feedback</Text>
        <View style={styles.placeholderRow}>
          <Text style={styles.placeholderText}>Tell us what'd make Reelst better.</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => lightTap()}
            style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
          >
            <ShareNetwork size={16} color={COLORS.ink} />
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
          onPress={() => lightTap()}
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

function SettingsRow({ Icon, label, desc, onPress, trailing }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.rowIcon}>
        <Icon size={18} color={COLORS.graphite} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      {trailing ?? <CaretRight size={16} color={COLORS.ash} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
