import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation/RootNavigator'
import { signInWithEmailAndPassword, authErrorMessage } from '../lib/firebaseAuth'
import { errorTap, lightTap } from '../lib/haptics'
import { COLORS, FONTS } from '../lib/tokens'
import { ReelstLogo } from '../components/ReelstLogo'
import { BrandButton } from '../components/BrandButton'
import { BrandInput } from '../components/BrandInput'

/**
 * SignIn — 1:1 port of `src/pages/SignIn.tsx` mobile layout.
 * Uses the Reelst brand button gradient, Outfit fonts, exact color
 * tokens, and native iOS haptics.
 */

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>

export function SignInScreen() {
  const navigation = useNavigation<Nav>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { setError('Enter an email'); errorTap(); return }
    if (!password) { setError('Enter your password'); errorTap(); return }
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(cleanEmail, password)
    } catch (e: unknown) {
      const err = e as { code?: string }
      setError(authErrorMessage(err.code, `Sign-in failed (${err.code || 'unknown'})`))
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
          {/* Logo */}
          <View style={styles.logoBlock}>
            <ReelstLogo size="md" />
          </View>

          {/* Header */}
          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.subhead}>Sign in to your Reelst account</Text>

          {/* Google */}
          <Pressable
            onPress={() => lightTap()}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            disabled={loading}
          >
            <Text style={styles.secondaryBtnText}>Continue with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email + password */}
          <View style={styles.fields}>
            <BrandInput
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="email"
              editable={!loading}
            />
            <BrandInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="current-password"
              editable={!loading}
              onSubmitEditing={handleSignIn}
              returnKeyType="go"
            />
            <View style={styles.forgotRow}>
              <Pressable disabled={loading} onPress={() => lightTap()}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <BrandButton
            label="Sign in"
            trailing={<Text style={styles.arrowChar}>→</Text>}
            loading={loading}
            disabled={loading}
            onPress={handleSignIn}
          />

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Don't have an account?</Text>
            <Pressable onPress={() => { lightTap(); navigation.navigate('Welcome') }} disabled={loading}>
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 },
  logoBlock: { marginBottom: 40 },
  h1: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 28,
    lineHeight: 34,
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subhead: {
    fontFamily: FONTS.humanist,
    fontSize: 15,
    color: COLORS.smoke,
    marginBottom: 24,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 2,
    borderColor: COLORS.pearl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  secondaryBtnText: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 15,
    color: COLORS.ink,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.pearl },
  dividerText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke, textTransform: 'uppercase', letterSpacing: 0.8 },
  fields: { gap: 12, marginBottom: 20 },
  forgotRow: { alignItems: 'flex-end' },
  forgotText: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.tangerine },
  error: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.liveRed, marginTop: 2 },
  arrowChar: { fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.warmWhite, lineHeight: 18 },
  pressed: { opacity: 0.9 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  bottomText: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.ash },
  bottomLink: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.tangerine },
})
