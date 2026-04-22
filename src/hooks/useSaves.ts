import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useAuthModalStore } from '@/stores/authModalStore'
import { savePin as savePinFs, unsavePin as unsavePinFs, getUserSaves } from '@/lib/firestore'
import { firebaseConfigured } from '@/config/firebase'
import type { ContentItem } from '@/lib/types'

const DEMO_KEY = 'reelst-demo-saves'

interface SaveEntry {
  pinId: string
  contentId?: string
}

// Global shared state so all hook instances see the same saves
let globalSaves: SaveEntry[] = []
let globalListeners: Set<(saves: SaveEntry[]) => void> = new Set()
let globalLoaded = false

function notifyListeners() {
  globalListeners.forEach((fn) => fn([...globalSaves]))
}

export function useSaves() {
  const { userDoc } = useAuthStore()
  const { open: openAuth } = useAuthModalStore()
  const [saves, setSaves] = useState<SaveEntry[]>(globalSaves)
  const [loaded, setLoaded] = useState(globalLoaded)

  useEffect(() => {
    const listener = (next: SaveEntry[]) => setSaves(next)
    globalListeners.add(listener)
    return () => { globalListeners.delete(listener) }
  }, [])

  useEffect(() => {
    if (!userDoc) {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        globalSaves = raw ? JSON.parse(raw) : []
      } catch {
        globalSaves = []
      }
      globalLoaded = true
      setSaves(globalSaves)
      setLoaded(true)
      return
    }
    if (firebaseConfigured) {
      getUserSaves(userDoc.uid).then((data) => {
        globalSaves = data as SaveEntry[]
        globalLoaded = true
        notifyListeners()
        setLoaded(true)
      }).catch(() => { globalLoaded = true; setLoaded(true) })
    } else {
      try {
        const raw = localStorage.getItem(DEMO_KEY)
        globalSaves = raw ? JSON.parse(raw) : []
      } catch {
        globalSaves = []
      }
      globalLoaded = true
      setSaves(globalSaves)
      setLoaded(true)
    }
  }, [userDoc])

  const persistDemo = useCallback((next: SaveEntry[]) => {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)) } catch {}
  }, [])

  const isSaved = useCallback((pinId: string, contentId?: string): boolean => {
    return globalSaves.some((s) => s.pinId === pinId && s.contentId === contentId)
  }, [saves])

  const isPinSaved = useCallback((pinId: string): boolean => {
    return globalSaves.some((s) => s.pinId === pinId && !s.contentId)
  }, [saves])

  const toggleSave = useCallback(async (pinId: string, contentId?: string, contentType?: ContentItem['type']) => {
    if (!userDoc && firebaseConfigured) {
      openAuth('signup')
      return false
    }

    const exists = globalSaves.some((s) => s.pinId === pinId && s.contentId === contentId)
    if (exists) {
      globalSaves = globalSaves.filter((s) => !(s.pinId === pinId && s.contentId === contentId))
    } else {
      globalSaves = [...globalSaves, { pinId, contentId }]
    }
    notifyListeners()

    if (userDoc && firebaseConfigured) {
      try {
        if (exists) await unsavePinFs(userDoc.uid, pinId, contentId)
        else await savePinFs(userDoc.uid, pinId, contentId)
      } catch {
        // Revert
        if (exists) globalSaves = [...globalSaves, { pinId, contentId }]
        else globalSaves = globalSaves.filter((s) => !(s.pinId === pinId && s.contentId === contentId))
        notifyListeners()
        return false
      }
    } else {
      persistDemo(globalSaves)
    }

    return !exists
  }, [userDoc, openAuth, persistDemo, saves])

  return { saves, isSaved, isPinSaved, toggleSave, loaded }
}
