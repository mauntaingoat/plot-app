/**
 * Forgot Password — full screen reset-link flow. Auth surfaces are
 * intentionally NOT themed (BrandInput uses `forceLight`, the screen
 * styles are inlined, etc.) so a dashboard dark-mode preference
 * doesn't bleed through.
 *
 * Replaces the prior `ForgotPasswordSheet` which dragged the dashboard
 * theme into the bottom sheet rendering chain.
 */
import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CaretLeft, CheckCircle } from 'phosphor-react-native'
import { BrandButton } from '../components/BrandButton'
import { BrandInput } from '../components/BrandInput'
import { ReelstLogo } from '../components/ReelstLogo'
import { LegalFooter } from './LandingScreen'
import { COLORS, FONTS } from '../lib/tokens'
import { sendPasswordResetEmail } from '../lib/firebaseAuth'
import { lightTap, success, errorTap } from '../lib/haptics'
import type { AuthStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>
type Rt = RouteProp<AuthStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Rt>()
  const [email, setEmail] = useState(route.params?.email ?? '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const onSend = async () => {
    const clean = email.trim().toLowerCase()
    if (!clean) {
      errorTap()
      Alert.alert('Enter your email', 'We need your email to send the reset link.')
      return
    }
    setSending(true)
    try {
      await sendPasswordResetEmail(clean)
      success()
      setSent(true)
    } catch (err) {
      // Privacy posture: don't leak whether the email exists.
      // Mirror server-side approach — always show "check your email"
      // regardless of result.
      // eslint-disable-next-line no-console
      console.warn('[forgot] reset error', (err as { code?: string })?.code)
      errorTap()
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — back to SignIn */}
      <View style={styles.header}>
        <Pressable
          onPress={() => { lightTap(); navigation.goBack() }}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <CaretLeft size={20} color={COLORS.ink} weight="bold" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBlock}>
            <ReelstLogo size="md" />
          </View>

          {sent ? (
            <>
              <View style={styles.iconCircle}>
                <CheckCircle size={56} color={COLORS.tangerine} weight="fill" />
              </View>
              <Text style={styles.h1}>Check your email</Text>
              <Text style={styles.body}>
                If an account exists for <Text style={styles.bodyStrong}>{email}</Text>,
                we sent a reset link. The link expires in 1 hour — check spam too.
              </Text>
              <View style={{ height: 22 }} />
              <BrandButton label="Back to sign in" onPress={() => navigation.goBack()} />
            </>
          ) : (
            <>
              <Text style={styles.h1}>Reset your password</Text>
              <Text style={styles.body}>
                Enter the email you used to sign up and we'll send you a reset link.
              </Text>
              <View style={{ height: 18 }} />
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
                textContentType="emailAddress"
                editable={!sending}
                onSubmitEditing={onSend}
                returnKeyType="send"
              />
              <View style={{ height: 18 }} />
              <BrandButton
                label={sending ? 'Sending…' : 'Send reset link'}
                loading={sending}
                disabled={sending}
                onPress={onSend}
              />
            </>
          )}

          <View style={{ marginTop: 36 }}>
            <LegalFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  logoBlock: { alignItems: 'center', marginBottom: 32 },
  h1: {
    fontFamily: FONTS.humanistSemibold, fontSize: 28, lineHeight: 34,
    color: COLORS.ink, letterSpacing: -0.5,
  },
  body: { fontFamily: FONTS.humanist, fontSize: 15, lineHeight: 22, color: COLORS.smoke, marginTop: 10 },
  bodyStrong: { fontFamily: FONTS.humanistSemibold, color: COLORS.ink },
  iconCircle: {
    alignSelf: 'center',
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,107,61,0.10)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
})
