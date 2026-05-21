import { useState } from 'react'
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * SignIn screen — first visual milestone. Mirrors `src/pages/SignIn.tsx`
 * from the web app on a phone-narrow viewport. Wires-up of Firebase
 * Auth lives in the next milestone; for now this is a styling +
 * keyboard-handling proof-of-toolchain.
 */
export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <SafeAreaView className="flex-1 bg-ivory">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-10 pb-8">
            {/* Logo */}
            <View className="flex-row items-center gap-2 mb-10">
              <View className="w-9 h-9 rounded-lg bg-tangerine" />
              <Text className="text-[22px] font-bold text-ink tracking-tight">Reelst</Text>
            </View>

            {/* Header */}
            <Text className="text-[32px] font-semibold text-ink leading-tight mb-2">
              Welcome back
            </Text>
            <Text className="text-[15px] text-smoke mb-8">
              Sign in to your Reelst account
            </Text>

            {/* Google button */}
            <Pressable
              className="h-14 rounded-xl bg-white border border-border-light flex-row items-center justify-center mb-5 active:opacity-80"
            >
              <Text className="text-[15px] font-semibold text-ink">
                Continue with Google
              </Text>
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center gap-3 mb-5">
              <View className="flex-1 h-px bg-pearl" />
              <Text className="text-[11px] text-smoke font-medium uppercase tracking-wider">
                OR
              </Text>
              <View className="flex-1 h-px bg-pearl" />
            </View>

            {/* Email + password */}
            <View className="gap-3 mb-6">
              <TextInput
                placeholder="Email address"
                placeholderTextColor="#9AA0AC"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="email"
                className="h-14 px-4 rounded-xl bg-white border border-border-light text-[15px] text-ink"
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9AA0AC"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="current-password"
                className="h-14 px-4 rounded-xl bg-white border border-border-light text-[15px] text-ink"
              />
              <View className="items-end">
                <Pressable>
                  <Text className="text-[13px] font-semibold text-tangerine">
                    Forgot password?
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Sign in button */}
            <Pressable
              className="h-14 rounded-xl bg-tangerine flex-row items-center justify-center active:opacity-90"
            >
              <Text className="text-[15px] font-semibold text-white">
                Sign in
              </Text>
            </Pressable>

            {/* Bottom link */}
            <View className="flex-row items-center justify-center gap-1.5 mt-6">
              <Text className="text-[13px] text-smoke">
                Don't have an account?
              </Text>
              <Pressable>
                <Text className="text-[13px] font-semibold text-tangerine">
                  Get started
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
