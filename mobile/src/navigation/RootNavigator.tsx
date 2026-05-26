/**
 * Root navigator — auth-state-aware routing. Mirrors the gates in the
 * web app's `App.tsx` (RequireVerified): signed out → SignIn/Welcome
 * stack; signed in but unverified → Verify; signed in + verified →
 * Dashboard + Settings stack.
 */
import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SplashLogo } from '../components/SplashLogo'
import { LandingScreen } from '../screens/LandingScreen'
import { SignInScreen } from '../screens/SignInScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'
import { VerifyScreen } from '../screens/VerifyScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { PinCreateScreen } from '../screens/PinCreateScreen'
import { ContentCreateScreen } from '../screens/ContentCreateScreen'
import { onAuthStateChanged, type FirebaseUser } from '../lib/firebaseAuth'

export type AuthStackParamList = {
  Landing: undefined
  SignIn: undefined
  Welcome: undefined
  ForgotPassword: { email?: string }
}

export type AppStackParamList = {
  Verify: undefined
  Dashboard: undefined
  Settings: undefined
  PinCreate: undefined
  ContentCreate: { pinId?: string }
}

const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const AppStack = createNativeStackNavigator<AppStackParamList>()

// Minimum splash duration. Firebase auth bootstraps in 50-300ms which
// makes the splash flash by — feels broken, not designed. Holding for
// ~1.2s gives the brand mark a real moment.
const MIN_SPLASH_MS = 1200

export function RootNavigator() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [minSplashElapsed, setMinSplashElapsed] = useState(false)

  useEffect(() => {
    return onAuthStateChanged((u) => {
      setUser(u)
      if (!authReady) setAuthReady(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setMinSplashElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  if (!authReady || !minSplashElapsed) {
    return <SplashLogo />
  }

  return (
    <NavigationContainer>
      {user == null ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <AuthStack.Screen name="Landing" component={LandingScreen} />
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
          <AuthStack.Screen name="Welcome" component={OnboardingScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      ) : !user.emailVerified ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="Verify" component={VerifyScreen} />
        </AppStack.Navigator>
      ) : (
        <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <AppStack.Screen name="Dashboard" component={DashboardScreen} />
          <AppStack.Screen name="Settings" component={SettingsScreen} />
          <AppStack.Screen name="PinCreate" component={PinCreateScreen} />
          <AppStack.Screen name="ContentCreate" component={ContentCreateScreen} />
        </AppStack.Navigator>
      )}
    </NavigationContainer>
  )
}
