/**
 * Theme preference — mirrors web `themeStore.ts`. Stored in
 * AsyncStorage (web uses localStorage), key matches the web key so a
 * cross-platform value would be portable if we ever rehydrate from
 * cloud-synced settings.
 *
 * Theme application (actually swapping palette values) is deferred
 * until dark-mode rendering ships; for now the picker just persists
 * the choice so the desktop preference stays the source of truth.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemePreference = 'light' | 'dark' | 'system'

const KEY = 'reelst_theme'

export async function getThemePreference(): Promise<ThemePreference> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // fall through
  }
  return 'system'
}

export async function setThemePreference(value: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, value)
  } catch {
    // ignore — non-critical persistence
  }
}
