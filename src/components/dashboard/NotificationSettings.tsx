import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellSlash as BellOff, Check, CalendarCheck, Heart, HandWaving as Hand, DeviceMobile, Envelope } from '@phosphor-icons/react'
import { useNotifications } from '@/hooks/useNotifications'
import { updateUserDoc } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'
import type { NotificationPrefs } from '@/lib/types'

const DEFAULT_PREFS: NotificationPrefs = {
  showingRequest: true,
  newSubscriber: true,
  newWave: true,
}

const PREF_ROWS: { id: keyof NotificationPrefs; label: string; desc: string; icon: typeof Heart; color: string }[] = [
  { id: 'showingRequest', label: 'Showing requests', desc: 'A visitor wants to tour one of your listings.', icon: CalendarCheck, color: '#FF6B3D' },
  { id: 'newSubscriber', label: 'New subscribers', desc: 'Someone subscribed to you for weekly updates.', icon: Heart, color: '#A855F7' },
  { id: 'newWave', label: 'Waves', desc: 'A buyer asked a question about a listing.', icon: Hand, color: '#34C759' },
]

export function NotificationSettings() {
  const { permission, enable } = useNotifications()
  const { userDoc, setUserDoc } = useAuthStore()
  // Push lives in `notificationPrefs`; email lives in `emailPrefs`.
  // Both default to all-on so existing users keep getting both
  // channels until they explicitly turn one off.
  const [pushPrefs, setPushPrefs] = useState<NotificationPrefs>(userDoc?.notificationPrefs || DEFAULT_PREFS)
  const [emailPrefs, setEmailPrefs] = useState<NotificationPrefs>(userDoc?.emailPrefs || DEFAULT_PREFS)
  const [enabling, setEnabling] = useState(false)
  const [notificationsOn, setNotificationsOn] = useState(() => {
    const p = userDoc?.notificationPrefs
    const e = userDoc?.emailPrefs
    if (!p && !e) return true
    return (p?.showingRequest || p?.newSubscriber || p?.newWave || e?.showingRequest || e?.newSubscriber || e?.newWave) ?? true
  })

  useEffect(() => {
    if (userDoc?.notificationPrefs) setPushPrefs(userDoc.notificationPrefs)
    if (userDoc?.emailPrefs) setEmailPrefs(userDoc.emailPrefs)
  }, [userDoc?.notificationPrefs, userDoc?.emailPrefs])

  const handleEnable = async () => {
    setEnabling(true)
    await enable()
    setEnabling(false)
  }

  const togglePref = (channel: 'push' | 'email', key: keyof NotificationPrefs) => {
    if (channel === 'push') {
      const next: NotificationPrefs = { ...pushPrefs, [key]: !pushPrefs[key] }
      setPushPrefs(next)
      if (userDoc) {
        setUserDoc({ ...userDoc, notificationPrefs: next })
        updateUserDoc(userDoc.uid, { notificationPrefs: next }).catch(() => {})
      }
    } else {
      const next: NotificationPrefs = { ...emailPrefs, [key]: !emailPrefs[key] }
      setEmailPrefs(next)
      if (userDoc) {
        setUserDoc({ ...userDoc, emailPrefs: next })
        updateUserDoc(userDoc.uid, { emailPrefs: next }).catch(() => {})
      }
    }
  }

  const handleToggleAll = () => {
    if (notificationsOn) {
      const off: NotificationPrefs = { showingRequest: false, newSubscriber: false, newWave: false }
      setPushPrefs(off)
      setEmailPrefs(off)
      setNotificationsOn(false)
      if (userDoc) {
        setUserDoc({ ...userDoc, notificationPrefs: off, emailPrefs: off })
        updateUserDoc(userDoc.uid, { notificationPrefs: off, emailPrefs: off }).catch(() => {})
      }
    } else {
      const on = DEFAULT_PREFS
      setPushPrefs(on)
      setEmailPrefs(on)
      setNotificationsOn(true)
      if (userDoc) {
        setUserDoc({ ...userDoc, notificationPrefs: on, emailPrefs: on })
        updateUserDoc(userDoc.uid, { notificationPrefs: on, emailPrefs: on }).catch(() => {})
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

      {/* Column header — Push | Email */}
      {notificationsOn && (
        <div className="flex items-center gap-3 px-4 pt-1">
          <div className="flex-1" />
          <div className="w-[58px] flex flex-col items-center gap-0.5 text-smoke">
            <DeviceMobile size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Push</span>
          </div>
          <div className="w-[58px] flex flex-col items-center gap-0.5 text-smoke">
            <Envelope size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
          </div>
        </div>
      )}

      {/* Per-category toggles — two columns each */}
      {PREF_ROWS.map((row) => {
        const Icon = row.icon
        return (
          <div
            key={row.id}
            className={`w-full flex items-center gap-3 bg-cream rounded-[14px] p-3.5 sm:p-4 ${!notificationsOn ? 'opacity-40' : ''}`}
          >
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: `${row.color}1A` }}>
              <Icon size={17} style={{ color: row.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ink">{row.label}</p>
              <p className="text-[11px] text-smoke leading-snug mt-0.5">{row.desc}</p>
            </div>
            <button
              onClick={() => notificationsOn && togglePref('push', row.id)}
              className="w-[58px] flex items-center justify-center cursor-pointer"
              aria-label={`${row.label} push`}
            >
              <Toggle on={notificationsOn && pushPrefs[row.id]} />
            </button>
            <button
              onClick={() => notificationsOn && togglePref('email', row.id)}
              className="w-[58px] flex items-center justify-center cursor-pointer"
              aria-label={`${row.label} email`}
            >
              <Toggle on={notificationsOn && emailPrefs[row.id]} />
            </button>
          </div>
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
