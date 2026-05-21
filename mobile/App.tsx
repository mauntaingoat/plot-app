import './global.css'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SignInScreen } from './src/screens/SignInScreen'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SignInScreen />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
