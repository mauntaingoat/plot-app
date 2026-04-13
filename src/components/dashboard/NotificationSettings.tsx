import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, Check, UserPlus, CalendarCheck, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNotifications } from '@/hooks/useNotifications'
import { updateUserDoc } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'
import type { NotificationPrefs } from '@/lib/types'

const DEFAULT_PREFS: NotificationPrefs = {
  newFollower: true,
  showingRequest: true,
  pinSaved: false,
}

const PREF_ROWS: { id: keyof NotificationPrefs; label: string; desc: string; icon: typeof UserPlus; color: string }[] = [
  { id: 'newFollower', label: 'New followers', desc: 'Someone follows your Reelst.', icon: UserPlus, color: '#3B82F6' },
  { id: 'showingRequest', label: 'Showing requests', desc: 'A visitor wants to tour one of your listings.', icon: CalendarCheck, color: '#FF6B3D' },
  { id: 'pinSaved', label: 'Listing saved', desc: 'Visitors save your pins to their map.', icon: Bookmark, color: '#A855F7' },
]

export function NotificationSettings() {
  const { permission, enable } = useNotifications()
  const { userDoc, setUserDoc } = useAuthStore()
  const [prefs, setPrefs] = useState<NotificationPrefs>(userDoc?.notificationPrefs || DEFAULT_PREFS)
  const [enabling, setEnabling] = useState(false)
  const [notificationsOn, setNotificationsOn] = useState(() => {
    if (!userDoc?.notificationPrefs) return true
    const p = userDoc.notificationPrefs
    return p.newFollower || p.showingRequest || p.pinSaved
  })

  useEffect(() => {
    if (userDoc?.notificationPrefs) {
      setPrefs(userDoc.notificationPrefs)
    }
  }, [userDoc?.notificationPrefs])

  const handleEnable = async () => {
    setEnabling(true)
    await enable()
    setEnabling(false)
  }

  const togglePref = (key: keyof NotificationPrefs) => {
    const next: NotificationPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    if (userDoc) {
      setUserDoc({ ...userDoc, notificationPrefs: next })
      updateUserDoc(userDoc.uid, { notificationPrefs: next }).catch(() => {})
    }
  }

  const handleToggleAll = () => {
    if (notificationsOn) {
      const off: NotificationPrefs = { newFollower: false, showingRequest: false, pinSaved: false }
      setPrefs(off)
      setNotificationsOn(false)
      if (userDoc) {
        setUserDoc({ ...userDoc, notificationPrefs: off })
        updateUserDoc(userDoc.uid, { notificationPrefs: off }).catch(() => {})
      }
    } else {
      const on = DEFAULT_PREFS
      setPrefs(on)
      setNotificationsOn(true)
      if (userDoc) {
        setUserDoc({ ...userDoc, notificationPrefs: on })
        updateUserDoc(userDoc.uid, { notificationPrefs: on }).catch(() => {})
      }
      if (permission !== 'granted') handleEnable()
    }
  }

  const pushBlocked = permission === 'denied'

  return (
    <div className="space-y-2">
      {/* Push permission banner */}
      {pushBlocked && (
        <div className="bg-cream rounded-[14px] p-3.5 flex items-start gap-3 mb-2">
          <BellOff size={16} className="text-live-red shrink-0 mt-0.5" />
          <p className="text-[12px] text-smoke leading-snug">Push notifications are blocked by your browser. Open site settings to allow.</p>
        </div>
      )}
      {permission === 'default' && notificationsOn && (
        <div className="bg-tangerine/10 border border-tangerine/20 rounded-[14px] p-3.5 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <Bell size={14} className="text-tangerine shrink-0" />
            <p className="text-[12px] font-medium text-ink">Enable push to receive alerts</p>
          </div>
          <button onClick={handleEnable} disabled={enabling}
            className="text-[11px] font-bold text-tangerine cursor-pointer hover:underline">
            {enabling ? 'Asking…' : 'Enable'}
          </button>
        </div>
      )}

      {/* Master toggle */}
      <div className={`${notificationsOn ? 'bg-sold-green/10 border-sold-green/20' : 'bg-cream border-border-light'} border rounded-[14px] px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          {notificationsOn ? <Check size={14} className="text-sold-green shrink-0" /> : <BellOff size={14} className="text-ash shrink-0" />}
          <p className={`text-[12px] font-semibold ${notificationsOn ? 'text-sold-green' : 'text-smoke'}`}>
            {notificationsOn ? 'Notifications on' : 'Notifications off'}
          </p>
        </div>
        <button onClick={handleToggleAll}
          className={`text-[11px] font-bold cursor-pointer ${notificationsOn ? 'text-smoke hover:text-ink' : 'text-tangerine hover:underline'}`}>
          {notificationsOn ? 'Turn off' : 'Turn on'}
        </button>
      </div>

      {/* Per-category toggles */}
      {PREF_ROWS.map((row) => {
        const Icon = row.icon
        const enabled = prefs[row.id]
        return (
          <button
            key={row.id}
            onClick={() => notificationsOn && togglePref(row.id)}
            className={`w-full flex items-center gap-3 bg-cream rounded-[14px] p-3.5 sm:p-4 text-left cursor-pointer hover:bg-pearl transition-colors ${!notificationsOn ? 'opacity-40' : ''}`}
          >
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `${row.color}1A` }}>
              <Icon size={17} style={{ color: row.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink">{row.label}</p>
              <p className="text-[11px] text-smoke leading-snug mt-0.5">{row.desc}</p>
            </div>
            <Toggle on={notificationsOn && enabled} />
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-tangerine' : 'bg-pearl'}`}>
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </div>
  )
}
