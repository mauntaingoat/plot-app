import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { savePin as savePinFs, unsavePin as unsavePinFs, getUserSaves } from '@/lib/firestore'
import { firebaseConfigured } from '@/config/firebase'
import type { ContentItem } from '@/lib/types'

// Hook for managing the user's saved pins/content collection.
// Backed by Firestore in production, localStorage in demo mode.

const DEMO_KEY = 'reelst-demo-saves'

interface SaveEntry {
  pinId: string
  contentId?: string
}

export function useSaves() {
  const { userDoc } = useAuthStore()
  const { open: openAuth } = useAuthModalStore()
  const [saves, setSaves] = useState<SaveEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load saves on mount or when user changes
  useEffect(() => {
    if (!userDoc) {
      // Demo mode — load from localStorage
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        setSaves(raw ? JSON.parse(raw) : [])
      } catch {
        setSaves([])
      }
      setLoaded(true)
      return
    }
    if (firebaseConfigured) {
      getUserSaves(userDoc.uid).then((data) => {
        setSaves(data as SaveEntry[])
        setLoaded(true)
      }).catch(() => setLoaded(true))
    } else {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        setSaves(raw ? JSON.parse(raw) : [])
      } catch {
        setSaves([])
      }
      setLoaded(true)
    }
  }, [userDoc])

  // Persist demo saves to localStorage
  const persistDemo = useCallback((next: SaveEntry[]) => {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)) } catch {}
  }, [])

  const isSaved = useCallback((pinId: string, contentId?: string): boolean => {
    return saves.some((s) => s.pinId === pinId && s.contentId === contentId)
  }, [saves])

  const isPinSaved = useCallback((pinId: string): boolean => {
    return saves.some((s) => s.pinId === pinId && !s.contentId)
  }, [saves])

  const toggleSave = useCallback(async (pinId: string, contentId?: string, contentType?: ContentItem['type']) => {
    // Stories are ephemeral — don't allow saving them
    if (contentType === 'story') {
      console.warn('Stories cannot be saved (ephemeral content)')
      return false
    }

    // If not signed in, prompt for auth
    if (!userDoc && firebaseConfigured) {
      openAuth('signup')
      return false
    }

    const exists = isSaved(pinId, contentId)
    let next: SaveEntry[]
    if (exists) {
      next = saves.filter((s) => !(s.pinId === pinId && s.contentId === contentId))
    } else {
      next = [...saves, { pinId, contentId }]
    }
    setSaves(next)

    // Persist
    if (userDoc && firebaseConfigured) {
      try {
        if (exists) await unsavePinFs(userDoc.uid, pinId, contentId)
        else await savePinFs(userDoc.uid, pinId, contentId)
      } catch (e) {
        // Revert on failure
        setSaves(saves)
        return false
      }
    } else {
      persistDemo(next)
    }

    return !exists // returns true if now saved
  }, [saves, userDoc, isSaved, openAuth, persistDemo])

  return { saves, isSaved, isPinSaved, toggleSave, loaded }
}
