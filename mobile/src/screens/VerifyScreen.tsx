import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sendEmailVerification, reloadCurrentUser, signOut, currentUser } from '../lib/firebaseAuth'
import { lightTap, success, errorTap } from '../lib/haptics'

/**
 * Verify screen — gates entry to the dashboard until the user's email
 * is verified. Mirrors the web app's `RequireVerified` gate. The user
 * goes to Mail, taps the verification link, returns to the app, and
 * the screen auto-detects verification via a poll loop.
 */

const COLORS = {
  ivory: '#FFF8F1',
  ink: '#0A0E17',
  smoke: '#5C6373',
  tangerine: '#D94A1F',
  border: '#E8DDC8',
  white: '#FFFFFF',
}

export function VerifyScreen() {
  const user = currentUser()
  const [resending, setResending] = useState(false)
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)

  // Poll for verification every 4s while this screen is mounted.
  // When user.emailVerified flips true, the RootNavigator auth listener
  // swaps stacks automatically and we land in the dashboard.
  useEffect(() => {
    const interval = setInterval(() => {
      reloadCurrentUser()
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleResend = async () => {
    setResending(true)
    lightTap()
    try {
      await sendEmailVerification()
      setResentAt(Date.now())
      success()
    } catch {
      errorTap()
    } finally {
      setResending(false)
    }
  }

  const handleManualCheck = async () => {
    setChecking(true)
    lightTap()
    await reloadCurrentUser()
    setChecking(false)
  }

  const handleSignOut = async () => {
    lightTap()
    await signOut()
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge} />
          <Text style={styles.logoText}>Reelst</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to{'\n'}
            <Text style={styles.email}>{user?.email ?? 'your email'}</Text>
          </Text>
          <Text style={styles.helper}>
            Open the link in your email to continue. We'll detect it automatically.
          </Text>

          {resentAt && Date.now() - resentAt < 5000 ? (
            <Text style={styles.confirm}>✓ Verification email resent</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={handleManualCheck}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryBtnText}>I verified — check now</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={handleResend}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color={COLORS.ink} />
            ) : (
              <Text style={styles.secondaryBtnText}>Resend verification email</Text>
            )}
          </Pressable>
          <Pressable onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.tangerine },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.ink, letterSpacing: -0.5 },
  body: { flex: 1, justifyContent: 'center' },
  h1: { fontSize: 32, fontWeight: '600', color: COLORS.ink, lineHeight: 38, marginBottom: 12 },
  subtitle: { fontSize: 16, color: COLORS.smoke, lineHeight: 24, marginBottom: 16 },
  email: { color: COLORS.ink, fontWeight: '600' },
  helper: { fontSize: 14, color: COLORS.smoke, lineHeight: 20 },
  confirm: { fontSize: 13, color: COLORS.tangerine, fontWeight: '600', marginTop: 12 },
  actions: { gap: 12 },
  primaryBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  secondaryBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  signOutText: { fontSize: 13, fontWeight: '600', color: COLORS.smoke, textAlign: 'center', marginTop: 4, paddingVertical: 8 },
  pressed: { opacity: 0.85 },
})
