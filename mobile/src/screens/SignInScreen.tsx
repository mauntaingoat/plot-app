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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * SignIn screen — first visual milestone. Mirrors `src/pages/SignIn.tsx`
 * from the web app on a phone viewport. Firebase wiring lands in the
 * next milestone; for now this is a styling + keyboard proof-of-toolchain.
 *
 * Plain RN StyleSheet for now — NativeWind 4.2 isn't yet compatible
 * with Expo SDK 56's Metro version. Once that lands we can port the
 * `style={...}` props back to `className="..."`.
 */
const COLORS = {
  ivory: '#FFF8F1',
  cream: '#FCEFE1',
  pearl: '#F2E5D5',
  ink: '#0A0E17',
  smoke: '#5C6373',
  ash: '#9AA0AC',
  tangerine: '#D94A1F',
  border: '#E8DDC8',
  white: '#FFFFFF',
}

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBadge} />
            <Text style={styles.logoText}>Reelst</Text>
          </View>

          {/* Header */}
          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Reelst account</Text>

          {/* Google button */}
          <Pressable style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email + password */}
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
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={COLORS.ash}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="current-password"
              style={styles.input}
            />
            <View style={styles.forgotRow}>
              <Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>

          {/* Sign in button */}
          <Pressable style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}>
            <Text style={styles.signInBtnText}>Sign in</Text>
          </Pressable>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Don't have an account?</Text>
            <Pressable>
              <Text style={styles.bottomLink}> Get started</Text>
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
  forgotRow: { alignItems: 'flex-end' },
  forgotText: { fontSize: 13, fontWeight: '600', color: COLORS.tangerine },
  signInBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.tangerine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  pressed: { opacity: 0.85 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  bottomText: { fontSize: 13, color: COLORS.smoke },
  bottomLink: { fontSize: 13, fontWeight: '600', color: COLORS.tangerine },
})
