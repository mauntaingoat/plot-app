import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlass as Search, Eye, Gift, Clock, Users, Shield, CheckCircle, XCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { getUserByUsername } from '@/lib/firestore'
import { resetFirestore, app } from '@/config/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Timestamp } from 'firebase/firestore'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { UserDoc, UserTier, VerificationStatus } from '@/lib/types'

interface AdminPanelProps {
  onImpersonate: (user: UserDoc) => void
}

async function callAdmin(data: { action: string; targetUid?: string; giftTier?: string; giftExpiry?: number }) {
  const functions = getFunctions(app ?? undefined)
  const fn = httpsCallable(functions, 'adminAction')
  const res = await fn(data)
  return res.data as any
}

export function AdminPanel({ onImpersonate }: AdminPanelProps) {
  const [username, setUsername] = useState('')
  const [searching, setSearching] = useState(false)
  const [lookedUp, setLookedUp] = useState<UserDoc | null>(null)
  const [error, setError] = useState('')
  const [giftSuccess, setGiftSuccess] = useState('')
  const [unverifiedAgents, setUnverifiedAgents] = useState<UserDoc[]>([])
  const [loadingQueue, setLoadingQueue] = useState(true)

  useEffect(() => {
    loadUnverifiedQueue()
  }, [])

  const loadUnverifiedQueue = async () => {
    if (!db) return
    setLoadingQueue(true)
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'agent'),
        where('verificationStatus', '==', 'unverified'),
        limit(50),
      )
      const snap = await getDocs(q)
      setUnverifiedAgents(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserDoc)))
    } catch (err) {
      console.warn('[Admin] queue load failed:', err)
      try {
        const q = query(collection(db!, 'users'), where('role', '==', 'agent'), limit(100))
        const snap = await getDocs(q)
        setUnverifiedAgents(snap.docs
          .map((d) => ({ uid: d.id, ...d.data() } as UserDoc))
          .filter((u) => u.verificationStatus !== 'verified'))
      } catch { /* ignore */ }
    } finally {
      setLoadingQueue(false)
    }
  }

  const handleLookup = async () => {
    if (!username.trim()) return
    setSearching(true)
    setError('')
    setLookedUp(null)
    const attempt = async (retries: number): Promise<void> => {
      try {
        const user = await getUserByUsername(username.trim().toLowerCase().replace('@', ''))
        if (!user) { setError('User not found'); return }
        setLookedUp(user)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('INTERNAL ASSERTION') && retries > 0) {
          await resetFirestore()
          return attempt(retries - 1)
        }
        setError(`Lookup failed: ${msg.includes('INTERNAL ASSERTION') ? 'Connection issue — try again.' : msg}`)
      }
    }
    await attempt(2).finally(() => setSearching(false))
  }

  const handleVerify = async (user: UserDoc) => {
    if (!window.confirm(`Verify @${user.username || user.displayName}? Their profile will go live.`)) return
    try {
      await callAdmin({ action: 'verify', targetUid: user.uid })
      if (lookedUp?.uid === user.uid) setLookedUp({ ...user, verificationStatus: 'verified' })
      setUnverifiedAgents((prev) => prev.filter((u) => u.uid !== user.uid))
    } catch (err) {
      console.error('[Admin] verify failed', err)
      alert('Verify failed — try again.')
    }
  }

  const handleReject = async (user: UserDoc) => {
    try {
      await callAdmin({ action: 'reject', targetUid: user.uid })
      if (lookedUp?.uid === user.uid) setLookedUp({ ...user, verificationStatus: 'rejected' as VerificationStatus })
      setUnverifiedAgents((prev) => prev.filter((u) => u.uid !== user.uid))
    } catch (err) {
      console.error('[Admin] reject failed', err)
    }
  }

  const handleGift = async (tier: UserTier, days: number | null) => {
    if (!lookedUp) return
    const expiryMs = days ? Date.now() + days * 86400000 : Date.now() + 365 * 10 * 86400000
    try {
      await callAdmin({ action: 'gift', targetUid: lookedUp.uid, giftTier: tier, giftExpiry: expiryMs })
      setLookedUp({ ...lookedUp, giftTier: tier, giftExpiry: Timestamp.fromMillis(expiryMs) } as UserDoc)
      setGiftSuccess(`Gifted ${tier} for ${days ? `${days} days` : 'indefinitely'}`)
      setTimeout(() => setGiftSuccess(''), 3000)
    } catch (err) {
      console.error('[Admin] gift failed', err)
    }
  }

  const handleRevokeGift = async () => {
    if (!lookedUp) return
    try {
      await callAdmin({ action: 'revokeGift', targetUid: lookedUp.uid })
      setLookedUp({ ...lookedUp, giftTier: undefined, giftExpiry: undefined } as UserDoc)
      setGiftSuccess('Gift revoked')
      setTimeout(() => setGiftSuccess(''), 3000)
    } catch (err) {
      console.error('[Admin] revoke failed', err)
    }
  }

  const fmtDate = (ts: any) => {
    if (!ts) return 'Never'
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(typeof ts.toMillis === 'function' ? ts.toMillis() : ts)
    return d.toLocaleString()
  }

  const verificationBadge = (status: VerificationStatus) => {
    const map = {
      verified: { bg: 'bg-sold-green/15', text: 'text-sold-green', label: 'Verified' },
      pending: { bg: 'bg-tangerine/15', text: 'text-tangerine', label: 'Pending' },
      unverified: { bg: 'bg-smoke/15', text: 'text-smoke', label: 'Unverified' },
      rejected: { bg: 'bg-live-red/15', text: 'text-live-red', label: 'Rejected' },
    }
    const s = map[status] || map.unverified
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
  }

  return (
    <div className="space-y-5">
      <div className="bg-live-red/8 border border-live-red/20 rounded-2xl p-4 flex items-center gap-3">
        <Shield size={18} className="text-live-red shrink-0" />
        <p className="text-[13px] font-semibold text-ink">Admin panel — only visible to you.</p>
      </div>

      {/* ── User Lookup ── */}
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
            <div className="bg-cream rounded-[14px] p-4 space-y-3">
              <div className="flex items-center gap-3">
                {lookedUp.photoURL ? (
                  <img src={lookedUp.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-pearl flex items-center justify-center text-smoke text-[14px] font-bold">
                    {(lookedUp.displayName || '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-ink">{lookedUp.displayName || 'No name'}</p>
                    {verificationBadge(lookedUp.verificationStatus)}
                  </div>
                  <p className="text-[12px] text-smoke truncate">@{lookedUp.username || 'no-username'} · {lookedUp.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <Stat icon={<Clock size={12} />} label="Joined" value={fmtDate(lookedUp.createdAt)} />
                <Stat icon={<Clock size={12} />} label="Last active" value={fmtDate((lookedUp as any).lastActiveAt)} />
                <Stat icon={<Users size={12} />} label="Followers" value={String(lookedUp.followerCount)} />
                <Stat icon={<Users size={12} />} label="Following" value={String(lookedUp.followingCount)} />
              </div>

              {lookedUp.licenseNumber && (
                <div className="flex items-center gap-2 pt-2 border-t border-border-light text-[12px] text-graphite">
                  <Shield size={12} className="text-ash" />
                  <span>License: {lookedUp.licenseState} #{lookedUp.licenseNumber}</span>
                  {lookedUp.licenseName && <span className="text-smoke">({lookedUp.licenseName})</span>}
                </div>
              )}

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
              {lookedUp.verificationStatus !== 'verified' && (
                <Button variant="primary" size="sm" icon={<CheckCircle size={13} />}
                  onClick={() => handleVerify(lookedUp)}
                  className="!bg-sold-green hover:!brightness-110">
                  Verify
                </Button>
              )}
              {lookedUp.verificationStatus !== 'rejected' && lookedUp.verificationStatus !== 'verified' && (
                <Button variant="danger" size="sm" icon={<XCircle size={13} />} onClick={() => handleReject(lookedUp)}>
                  Reject
                </Button>
              )}
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

      {/* ── Unverified Queue ── */}
      <div className="bg-warm-white border border-border-light rounded-[18px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">Pending Verification</h3>
          {!loadingQueue && (
            <span className="text-[11px] font-bold text-smoke bg-cream px-2.5 py-1 rounded-full">
              {unverifiedAgents.length}
            </span>
          )}
        </div>

        {loadingQueue ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-cream rounded-[12px] p-3 animate-pulse">
                <div className="h-3 w-1/3 bg-pearl rounded" />
              </div>
            ))}
          </div>
        ) : unverifiedAgents.length === 0 ? (
          <div className="bg-cream rounded-[14px] p-6 text-center">
            <CheckCircle size={24} className="text-sold-green mx-auto mb-2" />
            <p className="text-[13px] text-smoke">All caught up — no pending agents.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unverifiedAgents.map((agent) => (
              <div key={agent.uid} className="flex items-center gap-3 bg-cream rounded-[14px] px-4 py-3">
                {agent.photoURL ? (
                  <img src={agent.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center text-smoke text-[12px] font-bold shrink-0">
                    {(agent.displayName || '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{agent.displayName || 'No name'}</p>
                  <p className="text-[11px] text-smoke truncate">
                    @{agent.username || '—'}
                    {agent.licenseNumber ? ` · ${agent.licenseState} #${agent.licenseNumber}` : ' · No license'}
                  </p>
                </div>
                <button onClick={() => handleVerify(agent)}
                  className="px-3 py-1.5 rounded-full bg-sold-green/15 text-[11px] font-bold text-sold-green hover:bg-sold-green/25 cursor-pointer transition-colors shrink-0">
                  Verify
                </button>
                <button onClick={() => handleReject(agent)}
                  className="px-2 py-1.5 rounded-full text-[11px] font-semibold text-smoke hover:text-live-red cursor-pointer transition-colors shrink-0">
                  Reject
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-graphite text-[12px]">
      <span className="text-ash shrink-0">{icon}</span>
      <span className="text-smoke">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  )
}
