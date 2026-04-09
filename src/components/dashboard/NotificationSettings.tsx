import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, AlertTriangle, Check, UserPlus, CalendarCheck, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNotifications } from '@/hooks/useNotifications'
import { updateUserDoc } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'
import type { NotificationPrefs } from '@/lib/types'

const DEFAULT_PREFS: NotificationPrefs = {
  newFollower: true,
  showingRequest: true,
  pinSaved: false, // off by default — can get noisy on popular listings
}

interface PrefRow {
  id: keyof NotificationPrefs
  label: string
  desc: string
  icon: typeof UserPlus
  color: string
}

const PREF_ROWS: PrefRow[] = [
  {
    id: 'newFollower',
    label: 'New followers',
    desc: 'Someone follows your Reelst.',
    icon: UserPlus,
    color: '#3B82F6',
  },
  {
    id: 'showingRequest',
    label: 'Showing requests',
    desc: 'A visitor wants to tour one of your listings.',
    icon: CalendarCheck,
    color: '#FF6B3D',
  },
  {
    id: 'pinSaved',
    label: 'Listing saved',
    desc: 'Visitors save your pins to their map. Can be noisy on popular listings.',
    icon: Bookmark,
    color: '#A855F7',
  },
]

export function NotificationSettings() {
  const { permission, enable } = useNotifications()
  const { userDoc, setUserDoc } = useAuthStore()
  const [prefs, setPrefs] = useState<NotificationPrefs>(userDoc?.notificationPrefs || DEFAULT_PREFS)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    if (userDoc?.notificationPrefs) setPrefs(userDoc.notificationPrefs)
  }, [userDoc?.notificationPrefs])

  const handleEnable = async () => {
    setEnabling(true)
    const ok = await enable()
    if (ok && userDoc) {
      // Persist default prefs on first enable
      const initial = userDoc.notificationPrefs || DEFAULT_PREFS
      setUserDoc({ ...userDoc, notificationPrefs: initial })
      await updateUserDoc(userDoc.uid, { notificationPrefs: initial }).catch(() => {})
    }
    setEnabling(false)
  }

  const togglePref = async (key: keyof NotificationPrefs) => {
    if (!userDoc) return
    const next: NotificationPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setUserDoc({ ...userDoc, notificationPrefs: next })
    await updateUserDoc(userDoc.uid, { notificationPrefs: next }).catch(() => {})
  }

  // ── Permission states ──

  if (permission === 'denied') {
    return (
      <div className="bg-cream rounded-[16px] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-live-red/15 flex items-center justify-center shrink-0">
            <BellOff size={18} className="text-live-red" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink">Notifications blocked</p>
            <p className="text-[12px] text-smoke mt-1 leading-snug">
              Your browser is blocking notifications. To turn them on, click the lock icon next to the URL → Site settings → Notifications → Allow.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (permission !== 'granted') {
    return (
      <div className="bg-warm-white border border-border-light rounded-[16px] p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-tangerine/15 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-tangerine" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink">Stay in the loop</p>
            <p className="text-[12px] text-smoke mt-1 leading-snug">
              Get a buzz when someone follows you, requests a showing, or saves your listing. Push works on desktop, Android, and iOS 16.4+ (when added to home screen).
            </p>
          </div>
        </div>
        <Button variant="primary" size="md" fullWidth onClick={handleEnable} disabled={enabling}>
          {enabling ? 'Asking…' : 'Enable notifications'}
        </Button>
      </div>
    )
  }

  // ── Granted ──

  return (
    <div className="space-y-2">
      <div className="bg-sold-green/10 border border-sold-green/20 rounded-[14px] px-4 py-3 flex items-center gap-2.5 mb-3">
        <Check size={14} className="text-sold-green shrink-0" />
        <p className="text-[12px] font-semibold text-sold-green">Notifications are on for this device</p>
      </div>

      {PREF_ROWS.map((row) => {
        const Icon = row.icon
        const enabled = prefs[row.id]
        return (
          <button
            key={row.id}
            onClick={() => togglePref(row.id)}
            className="w-full flex items-center gap-3 bg-cream rounded-[14px] p-3.5 sm:p-4 text-left cursor-pointer hover:bg-pearl transition-colors"
          >
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: `${row.color}1A` }}
            >
              <Icon size={17} style={{ color: row.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink">{row.label}</p>
              <p className="text-[11px] text-smoke leading-snug mt-0.5">{row.desc}</p>
            </div>
            <Toggle on={enabled} />
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
        on ? 'bg-tangerine' : 'bg-pearl'
      }`}
    >
      <motion.div
        animate={{ x: on ? 22 : 4 }}
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        style={{ x: on ? 22 : 4 }}
      />
    </div>
  )
}
