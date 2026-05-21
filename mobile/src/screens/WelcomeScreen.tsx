import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation/RootNavigator'
import { createUserWithEmailAndPassword, sendEmailVerification, authErrorMessage } from '../lib/firebaseAuth'
import { lightTap, success, errorTap } from '../lib/haptics'

/**
 * Welcome / Signup screen — slimmed-down v1 (email + password only).
 *
 * The full web Welcome.tsx also collects username + license up-front
 * via a multi-step flow; for the v1 of the iOS app we collect just
 * email/password here, fire a verification email, then send the user
 * to Verify. Username + license collection lands in the next
 * milestone as a multi-step onboarding stack.
 */

const COLORS = {
  ivory: '#FFF8F1',
  pearl: '#F2E5D5',
  ink: '#0A0E17',
  smoke: '#5C6373',
  ash: '#9AA0AC',
  tangerine: '#D94A1F',
  border: '#E8DDC8',
  white: '#FFFFFF',
  liveRed: '#DC2626',
}

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>

export function WelcomeScreen() {
  const navigation = useNavigation<Nav>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { setError('Enter an email'); errorTap(); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); errorTap(); return }
    setLoading(true)
    setError('')
    lightTap()
    try {
      await createUserWithEmailAndPassword(cleanEmail, password)
      await sendEmailVerification()
      success()
      // Auth listener takes us into the App stack → Verify screen.
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      setError(authErrorMessage(err.code, `Sign-up failed (${err.code || 'unknown'})`))
      errorTap()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoBadge} />
            <Text style={styles.logoText}>Reelst</Text>
          </View>

          <Text style={styles.h1}>Claim your Reelst</Text>
          <Text style={styles.subtitle}>The link in bio for real estate agents</Text>

          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
            disabled={loading}
          >
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.fields}>
            <TextInput
              placeholder="Email address"
              placeholderTextColor={COLORS.ash}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="email"
              style={styles.input}
              editable={!loading}
            />
            <TextInput
              placeholder="Password (6+ characters)"
              placeholderTextColor={COLORS.ash}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="new-password"
              style={styles.input}
              editable={!loading}
              onSubmitEditing={handleSignup}
              returnKeyType="go"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.signupBtn, pressed && styles.pressed, loading && styles.disabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.signupBtnText}>Create account</Text>
            )}
          </Pressable>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <Pressable onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.bottomLink}> Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40 },
  logoBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.tangerine },
  logoText: { fontSize: 22, fontWeight: '700', color: COLORS.ink, letterSpacing: -0.5 },
  h1: { fontSize: 32, fontWeight: '600', color: COLORS.ink, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.smoke, marginBottom: 32 },
  googleBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.ink },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.pearl },
  dividerText: { fontSize: 11, color: COLORS.smoke, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  fields: { gap: 12, marginBottom: 24 },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 15,
    color: COLORS.ink,
  },
  error: { fontSize: 12, color: COLORS.liveRed, marginTop: 4 },
  signupBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.tangerine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  bottomText: { fontSize: 13, color: COLORS.smoke },
  bottomLink: { fontSize: 13, fontWeight: '600', color: COLORS.tangerine },
})
