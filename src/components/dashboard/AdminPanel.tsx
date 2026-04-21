import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, UserCheck, Eye, Gift, Clock, Users, Bookmark, MousePointerClick, LogOut, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getUserByUsername, updateUserDoc } from '@/lib/firestore'
import { Timestamp } from 'firebase/firestore'
import type { UserDoc, UserTier } from '@/lib/types'

interface AdminPanelProps {
  onImpersonate: (user: UserDoc) => void
}

export function AdminPanel({ onImpersonate }: AdminPanelProps) {
  const [username, setUsername] = useState('')
  const [searching, setSearching] = useState(false)
  const [lookedUp, setLookedUp] = useState<UserDoc | null>(null)
  const [error, setError] = useState('')
  const [giftSuccess, setGiftSuccess] = useState('')

  const handleLookup = async () => {
    if (!username.trim()) return
    setSearching(true)
    setError('')
    setLookedUp(null)
    try {
      const user = await getUserByUsername(username.trim().toLowerCase().replace('@', ''))
      if (!user) { setError('User not found'); return }
      setLookedUp(user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('INTERNAL ASSERTION')) {
        setError('Firestore connection reset — try again.')
      } else {
        console.error('[Admin] lookup failed', err)
        setError(`Lookup failed: ${msg}`)
      }
    } finally {
      setSearching(false)
    }
  }

  const handleGift = async (tier: UserTier, days: number | null) => {
    if (!lookedUp) return
    const expiry = days
      ? Timestamp.fromMillis(Date.now() + days * 86400000)
      : Timestamp.fromMillis(Date.now() + 365 * 10 * 86400000)
    await updateUserDoc(lookedUp.uid, { giftTier: tier, giftExpiry: expiry } as any)
    setLookedUp({ ...lookedUp, giftTier: tier, giftExpiry: expiry } as UserDoc)
    setGiftSuccess(`Gifted ${tier} for ${days ? `${days} days` : 'indefinitely'}`)
    setTimeout(() => setGiftSuccess(''), 3000)
  }

  const handleRevokeGift = async () => {
    if (!lookedUp) return
    await updateUserDoc(lookedUp.uid, { giftTier: null, giftExpiry: null } as any)
    setLookedUp({ ...lookedUp, giftTier: undefined, giftExpiry: undefined } as UserDoc)
    setGiftSuccess('Gift revoked')
    setTimeout(() => setGiftSuccess(''), 3000)
  }

  const fmtDate = (ts: any) => {
    if (!ts) return 'Never'
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(typeof ts.toMillis === 'function' ? ts.toMillis() : ts)
    return d.toLocaleString()
  }

  return (
    <div className="space-y-5">
      <div className="bg-live-red/8 border border-live-red/20 rounded-2xl p-4 flex items-center gap-3">
        <Shield size={18} className="text-live-red shrink-0" />
        <p className="text-[13px] font-semibold text-ink">Admin panel — only visible to you.</p>
      </div>

      {/* User Lookup */}
      <div className="bg-warm-white border border-border-light rounded-[18px] p-5 space-y-4">
        <h3 className="text-[15px] font-bold text-ink">User Lookup</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="flex-1 px-4 py-2.5 rounded-[12px] bg-cream border border-border-light text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-tangerine/30"
          />
          <Button variant="primary" size="md" loading={searching} onClick={handleLookup} icon={<Search size={14} />}>
            Look up
          </Button>
        </div>
        {error && <p className="text-[12px] text-live-red">{error}</p>}

        {lookedUp && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* User info card */}
            <div className="bg-cream rounded-[14px] p-4 space-y-3">
              <div className="flex items-center gap-3">
                {lookedUp.photoURL ? (
                  <img src={lookedUp.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-pearl flex items-center justify-center text-smoke text-[14px] font-bold">
                    {(lookedUp.displayName || '?')[0]}
                  </div>
                )}
                <div>
                  <p className="text-[14px] font-bold text-ink">{lookedUp.displayName || 'No name'}</p>
                  <p className="text-[12px] text-smoke">@{lookedUp.username || 'no-username'} · {lookedUp.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <Stat icon={<Clock size={12} />} label="Joined" value={fmtDate(lookedUp.createdAt)} />
                <Stat icon={<Clock size={12} />} label="Last active" value={fmtDate((lookedUp as any).lastActiveAt)} />
                <Stat icon={<Users size={12} />} label="Followers" value={String(lookedUp.followerCount)} />
                <Stat icon={<Users size={12} />} label="Following" value={String(lookedUp.followingCount)} />
                <Stat icon={<Eye size={12} />} label="Role" value={lookedUp.role} />
                <Stat icon={<UserCheck size={12} />} label="Verified" value={lookedUp.verificationStatus} />
              </div>

              {/* Tier info */}
              <div className="flex items-center gap-2 pt-2 border-t border-border-light">
                <span className="text-[12px] text-smoke">Tier:</span>
                <span className="text-[12px] font-bold text-ink">{lookedUp.tier || 'free'}</span>
                {lookedUp.giftTier && (
                  <span className="text-[10px] font-bold text-sold-green bg-sold-green/10 px-2 py-0.5 rounded-full">
                    Gift: {lookedUp.giftTier} until {fmtDate(lookedUp.giftExpiry)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" icon={<Eye size={13} />} onClick={() => onImpersonate(lookedUp)}>
                Impersonate
              </Button>
            </div>

            {/* Gift subscription */}
            <div className="bg-cream rounded-[14px] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gift size={14} className="text-tangerine" />
                <span className="text-[13px] font-bold text-ink">Gift Subscription</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['pro', 'studio'] as UserTier[]).map((tier) => (
                  [30, 60, 90, null].map((days) => (
                    <button key={`${tier}-${days}`} onClick={() => handleGift(tier, days)}
                      className="px-3 py-1.5 rounded-full bg-warm-white border border-border-light text-[11px] font-semibold text-graphite hover:border-tangerine/30 cursor-pointer transition-colors">
                      {tier} {days ? `${days}d` : '∞'}
                    </button>
                  ))
                ))}
                {lookedUp.giftTier && (
                  <button onClick={handleRevokeGift}
                    className="px-3 py-1.5 rounded-full bg-live-red/10 border border-live-red/20 text-[11px] font-semibold text-live-red hover:bg-live-red/20 cursor-pointer transition-colors">
                    Revoke
                  </button>
                )}
              </div>
              {giftSuccess && <p className="text-[11px] text-sold-green font-semibold">{giftSuccess}</p>}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-graphite">
      <span className="text-ash shrink-0">{icon}</span>
      <span className="text-smoke">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  )
}
