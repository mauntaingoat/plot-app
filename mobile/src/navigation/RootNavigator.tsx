/**
 * Root navigator — auth-state-aware routing. Mirrors the gates in the
 * web app's `App.tsx` (RequireVerified): signed out → SignIn/Welcome
 * stack; signed in but unverified → Verify; signed in + verified →
 * Dashboard + Settings stack.
 */
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SignInScreen } from '../screens/SignInScreen'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { VerifyScreen } from '../screens/VerifyScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { onAuthStateChanged, type FirebaseUser } from '../lib/firebaseAuth'
import { COLORS } from '../lib/tokens'

export type AuthStackParamList = {
  SignIn: undefined
  Welcome: undefined
}

export type AppStackParamList = {
  Verify: undefined
  Dashboard: undefined
  Settings: undefined
}

const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const AppStack = createNativeStackNavigator<AppStackParamList>()

export function RootNavigator() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    return onAuthStateChanged((u) => {
      setUser(u)
      if (!initialized) setInitialized(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.ivory, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.tangerine} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {user == null ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <AuthStack.Screen name="SignIn" component={SignInScreen} />
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
        </AuthStack.Navigator>
      ) : !user.emailVerified ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="Verify" component={VerifyScreen} />
        </AppStack.Navigator>
      ) : (
        <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <AppStack.Screen name="Dashboard" component={DashboardScreen} />
          <AppStack.Screen name="Settings" component={SettingsScreen} />
        </AppStack.Navigator>
      )}
    </NavigationContainer>
  )
}
