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
import { ReelstLogo } from '../components/ReelstLogo'
import { BrandButton } from '../components/BrandButton'
import { BrandInput } from '../components/BrandInput'
import { COLORS, FONTS } from '../lib/tokens'
import { createUserWithEmailAndPassword, sendEmailVerification, authErrorMessage } from '../lib/firebaseAuth'
import { lightTap, success, errorTap } from '../lib/haptics'

/**
 * Welcome / Get Started — mirrors `src/pages/Welcome.tsx` HERO step
 * visually (large logo, "Your portfolio. Your block. Your link."
 * headline, Get Started CTA) but flows directly into email/password
 * fields. The 12-step web wizard rebuild is Milestone 4.
 */

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
    try {
      await createUserWithEmailAndPassword(cleanEmail, password)
      await sendEmailVerification()
      success()
    } catch (e: unknown) {
      const err = e as { code?: string }
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
          {/* Hero — matches web Welcome.tsx hero step */}
          <View style={styles.hero}>
            <ReelstLogo size="xl" />
            <Text style={styles.h1}>Your portfolio.{'\n'}Your block. Your link.</Text>
            <Text style={styles.subhead}>
              A live map of your listings — and the reels,{'\n'}
              walkthroughs, and stories you already make.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Pressable
              onPress={() => lightTap()}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              disabled={loading}
            >
              <Text style={styles.secondaryBtnText}>Continue with Google</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

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
                placeholder="Password (6+ characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="new-password"
                editable={!loading}
                onSubmitEditing={handleSignup}
                returnKeyType="go"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>

            <BrandButton
              label="Get Started"
              trailing={<Text style={styles.arrowChar}>→</Text>}
              loading={loading}
              disabled={loading}
              onPress={handleSignup}
            />

            <View style={styles.bottomRow}>
              <Text style={styles.bottomText}>Already have an account?</Text>
              <Pressable onPress={() => { lightTap(); navigation.goBack() }} disabled={loading}>
                <Text style={styles.bottomLink}> Sign in</Text>
              </Pressable>
            </View>
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
  hero: { alignItems: 'center', marginBottom: 32 },
  h1: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 26,
    lineHeight: 32,
    color: COLORS.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  subhead: {
    fontFamily: FONTS.humanist,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.smoke,
    textAlign: 'center',
  },
  formCard: { gap: 16 },
  secondaryBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 2,
    borderColor: COLORS.pearl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONTS.humanistSemibold,
    fontSize: 15,
    color: COLORS.ink,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.pearl },
  dividerText: { fontFamily: FONTS.humanistMedium, fontSize: 11, color: COLORS.smoke, textTransform: 'uppercase', letterSpacing: 0.8 },
  fields: { gap: 12 },
  error: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.liveRed, marginTop: 2 },
  arrowChar: { fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.warmWhite, lineHeight: 18 },
  pressed: { opacity: 0.9 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  bottomText: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.ash },
  bottomLink: { fontFamily: FONTS.humanistSemibold, fontSize: 13, color: COLORS.tangerine },
})
