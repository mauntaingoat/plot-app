import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { sendEmailVerification, reloadCurrentUser, signOut, currentUser } from '../lib/firebaseAuth'
import { lightTap, success, errorTap } from '../lib/haptics'
import { COLORS, FONTS } from '../lib/tokens'
import { ReelstLogo } from '../components/ReelstLogo'
import { BrandButton } from '../components/BrandButton'

/**
 * Verify — gates entry to the dashboard until the user's email is
 * verified. Mirrors the web `RequireVerified` gate. Polls user.reload()
 * every 4s; when emailVerified flips true, the auth-state listener in
 * RootNavigator swaps stacks automatically.
 */

export function VerifyScreen() {
  const user = currentUser()
  const [resending, setResending] = useState(false)
  const [resentAt, setResentAt] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => { reloadCurrentUser() }, 4000)
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
        <View style={styles.logoBlock}>
          <ReelstLogo size="md" />
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>Verify your email</Text>
          <Text style={styles.subhead}>
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
          <BrandButton
            label={checking ? 'Checking…' : 'I verified — check now'}
            loading={checking}
            disabled={checking}
            onPress={handleManualCheck}
          />
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
  logoBlock: {},
  body: { flex: 1, justifyContent: 'center' },
  h1: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 28,
    lineHeight: 34,
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subhead: { fontFamily: FONTS.humanist, fontSize: 16, color: COLORS.smoke, lineHeight: 24, marginBottom: 16 },
  email: { color: COLORS.ink, fontFamily: FONTS.humanistSemibold },
  helper: { fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.smoke, lineHeight: 20 },
  confirm: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.tangerine, marginTop: 12 },
  actions: { gap: 12 },
  secondaryBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 2,
    borderColor: COLORS.pearl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: FONTS.humanistSemibold, fontSize: 15, color: COLORS.ink },
  signOutText: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.smoke, textAlign: 'center', marginTop: 4, paddingVertical: 8 },
  pressed: { opacity: 0.9 },
})
