/**
 * TeamSettings — Settings panel section for organization (brokerage /
 * team) admins. Two render modes:
 *
 *   - Org owner: full management UI — seat counter, member roster,
 *     pending invites, invite-by-(email | username | copy link),
 *     revoke pending invites, remove members.
 *   - Org member (non-owner): compact "You're on {Org Name}" badge +
 *     "Leave organization" button.
 *
 * Mount this in dashboard Settings between Plan and Feedback. Returns
 * null when the user has no organizationId so the section silently
 * disappears for solo Pro / Free users.
 *
 * Stripe note: nothing here writes seatsTotal. That's manual-
 * fulfillment for now (admin script), or driven by Stripe webhook
 * once billing is wired. The UI just reads + displays seatsTotal.
 */
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  CaretDown,
  Plus,
  Copy,
  Check,
  X,
  At,
  Link as LinkIcon,
  Envelope,
  ArrowsClockwise,
  WarningCircle,
} from '@phosphor-icons/react'
import { collection, doc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore'
import { db, app } from '@/config/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuthStore } from '@/stores/authStore'
import type { Organization, OrganizationMember, OrganizationInvite } from '@/lib/types'

type InviteKind = 'email' | 'username' | 'link'

export function TeamSettings() {
  const userDoc = useAuthStore((s) => s.userDoc)
  const [expanded, setExpanded] = useState(false)
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<OrganizationInvite[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const orgId = userDoc?.organizationId || null
  const isAdmin = !!orgId && userDoc?.organizationRole === 'admin'

  // Live org doc subscription.
  useEffect(() => {
    if (!orgId || !db) {
      setOrg(null)
      return
    }
    const unsub = onSnapshot(doc(db, 'organizations', orgId), (snap) => {
      if (!snap.exists()) {
        setOrg(null)
        return
      }
      setOrg({ id: snap.id, ...(snap.data() as Omit<Organization, 'id'>) })
    }, () => setOrg(null))
    return unsub
  }, [orgId])

  // Live members subscription.
  useEffect(() => {
    if (!orgId || !db) {
      setMembers([])
      return
    }
    const unsub = onSnapshot(
      query(collection(db, 'organizations', orgId, 'members'), orderBy('joinedAt', 'asc')),
      (snap) => {
        const list: OrganizationMember[] = []
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<OrganizationMember, 'id'>) }))
        setMembers(list)
      },
      () => setMembers([])
    )
    return unsub
  }, [orgId])

  // Live pending invites. Only meaningful for admins.
  useEffect(() => {
    if (!orgId || !db || !isAdmin) {
      setPendingInvites([])
      return
    }
    const unsub = onSnapshot(
      query(
        collection(db, 'organizationInvites'),
        where('organizationId', '==', orgId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snap) => {
        const list: OrganizationInvite[] = []
        snap.forEach((d) => list.push({ ...(d.data() as OrganizationInvite) }))
        setPendingInvites(list)
      },
      () => setPendingInvites([])
    )
    return unsub
  }, [orgId, isAdmin])

  // Clear messages after a few seconds so they don't linger.
  useEffect(() => {
    if (!errorMsg && !successMsg) return
    const id = setTimeout(() => {
      setErrorMsg(null)
      setSuccessMsg(null)
    }, 4500)
    return () => clearTimeout(id)
  }, [errorMsg, successMsg])

  // No org → render nothing. Settings section silently absent.
  if (!orgId || !org) return null

  const seatsUsed = org.seatsAllocated
  const seatsTotal = org.seatsTotal
  const seatsAvailable = Math.max(0, seatsTotal - seatsUsed)
  const seatPct = seatsTotal > 0 ? Math.min(100, (seatsUsed / seatsTotal) * 100) : 0

  return (
    <div>
      <p className="text-[12px] font-semibold text-smoke uppercase tracking-wider px-1 pb-1 pt-4">
        Team membership
      </p>

      <div className="bg-cream rounded-[14px] overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-3.5 p-4 text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-[12px] bg-pearl flex items-center justify-center">
            <Users size={18} className="text-graphite" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-medium text-ink block truncate">{org.name}</span>
            <span className="text-[12px] text-smoke">
              {isAdmin
                ? `${seatsUsed} of ${seatsTotal} seat${seatsTotal === 1 ? '' : 's'} used`
                : 'You\'re on this team'}
            </span>
          </div>
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
            <CaretDown size={14} className="text-ash" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 space-y-4">
                {/* Status messages */}
                {errorMsg && (
                  <div
                    className="rounded-lg px-3 py-2 flex items-start gap-2"
                    style={{ background: 'rgba(217,74,31,0.06)', border: '1px solid rgba(217,74,31,0.18)' }}
                  >
                    <WarningCircle size={14} weight="bold" className="text-tangerine shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-graphite leading-snug">{errorMsg}</p>
                  </div>
                )}
                {successMsg && (
                  <div
                    className="rounded-lg px-3 py-2 flex items-start gap-2"
                    style={{ background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)' }}
                  >
                    <Check size={14} weight="bold" className="text-sold-green shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-graphite leading-snug">{successMsg}</p>
                  </div>
                )}

                {/* Seat meter — admin only */}
                {isAdmin && (
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[11px] font-mono font-semibold tracking-[0.16em] uppercase text-smoke">
                        Seats
                      </span>
                      <span className="text-[12px] text-graphite">
                        <span className="font-semibold text-ink">{seatsUsed}</span>
                        <span className="text-smoke"> / {seatsTotal} used</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-pearl overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg,#D94A1F,#FF8552)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${seatPct}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    {seatsAvailable === 0 && seatsTotal > 0 && (
                      <p className="text-[11px] text-smoke mt-2">
                        All seats are allocated. Contact{' '}
                        <a href="mailto:hello@reelst.co" className="text-tangerine">hello@reelst.co</a>{' '}
                        to add more.
                      </p>
                    )}
                  </div>
                )}

                {/* Member roster */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-mono font-semibold tracking-[0.16em] uppercase text-smoke">
                    {isAdmin ? 'Roster' : 'Owner'}
                  </p>
                  {members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      isOwner={m.userId === org.ownerId}
                      isSelf={m.userId === userDoc?.uid}
                      canManage={isAdmin}
                      onRemove={async () => {
                        if (!confirm(`Remove ${m.displayName || m.email} from ${org.name}?`)) return
                        setBusy(true)
                        setErrorMsg(null)
                        try {
                          const fn = httpsCallable<{ orgId: string; userId: string }>(
                            getFunctions(app ?? undefined),
                            'releaseOrganizationMember'
                          )
                          await fn({ orgId, userId: m.userId })
                          setSuccessMsg(`${m.displayName || m.email} released.`)
                        } catch (e) {
                          const err = e as { message?: string; details?: { message?: string } }
                          setErrorMsg(err?.details?.message || err?.message || 'Could not release member.')
                        } finally {
                          setBusy(false)
                        }
                      }}
                    />
                  ))}
                </div>

                {/* Pending invites — admin only */}
                {isAdmin && pendingInvites.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-mono font-semibold tracking-[0.16em] uppercase text-smoke">
                      Pending invites ({pendingInvites.length})
                    </p>
                    {pendingInvites.map((inv) => (
                      <PendingInviteRow
                        key={inv.token}
                        invite={inv}
                        onRevoke={async () => {
                          setBusy(true)
                          setErrorMsg(null)
                          try {
                            const fn = httpsCallable<{ token: string }>(
                              getFunctions(app ?? undefined),
                              'revokeOrganizationInvite'
                            )
                            await fn({ token: inv.token })
                            setSuccessMsg('Invite revoked.')
                          } catch (e) {
                            const err = e as { message?: string; details?: { message?: string } }
                            setErrorMsg(err?.details?.message || err?.message || 'Could not revoke invite.')
                          } finally {
                            setBusy(false)
                          }
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Invite button or Leave button */}
                {isAdmin ? (
                  <button
                    onClick={() => setInviteOpen(true)}
                    disabled={busy || seatsAvailable === 0}
                    className="brand-btn-flat w-full py-2.5 text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={14} weight="bold" />
                    Invite agent
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (!confirm(`Leave ${org.name}? Your account will drop back to Free.`)) return
                      setBusy(true)
                      try {
                        const fn = httpsCallable<{ orgId: string; userId: string }>(
                          getFunctions(app ?? undefined),
                          'releaseOrganizationMember'
                        )
                        await fn({ orgId, userId: userDoc!.uid })
                        setSuccessMsg('You\'ve left the organization.')
                      } catch (e) {
                        const err = e as { message?: string; details?: { message?: string } }
                        setErrorMsg(err?.details?.message || err?.message || 'Could not leave organization.')
                      } finally {
                        setBusy(false)
                      }
                    }}
                    disabled={busy}
                    className="w-full py-2.5 text-[13.5px] font-semibold cursor-pointer rounded-lg text-graphite bg-pearl hover:bg-pearl/80 disabled:opacity-50"
                  >
                    Leave organization
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {inviteOpen && (
          <InviteModal
            orgId={orgId}
            seatsAvailable={seatsAvailable}
            onClose={() => setInviteOpen(false)}
            onSuccess={(msg) => {
              setSuccessMsg(msg)
              setInviteOpen(false)
            }}
            onError={(msg) => setErrorMsg(msg)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
function MemberRow({
  member,
  isOwner,
  isSelf,
  canManage,
  onRemove,
}: {
  member: OrganizationMember
  isOwner: boolean
  isSelf: boolean
  canManage: boolean
  onRemove: () => void
}) {
  const initials = (member.displayName || member.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-black/[0.04]">
      {member.photoURL ? (
        <img src={member.photoURL} alt="" className="w-8 h-8 rounded-full object-cover bg-pearl" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center text-[11px] font-semibold text-graphite">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-ink truncate">
            {member.displayName || member.email || 'Agent'}
          </span>
          {isOwner && (
            <span
              className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(217,74,31,0.1)', color: '#D94A1F' }}
            >
              Owner
            </span>
          )}
          {isSelf && !isOwner && (
            <span className="text-[9px] font-semibold tracking-wider uppercase text-smoke">You</span>
          )}
        </div>
        <p className="text-[11.5px] text-smoke truncate">{member.email}</p>
      </div>
      {canManage && !isOwner && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${member.displayName || member.email}`}
          className="text-smoke hover:text-tangerine transition-colors cursor-pointer p-1"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
function PendingInviteRow({
  invite,
  onRevoke,
}: {
  invite: OrganizationInvite
  onRevoke: () => void
}) {
  const isLink = (invite as { kind?: string }).kind === 'link'
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${invite.token}`
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* noop */
    }
  }
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-black/[0.04]">
      <div className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center">
        {isLink ? (
          <LinkIcon size={14} className="text-graphite" />
        ) : (
          <Envelope size={14} className="text-graphite" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-ink truncate">
          {isLink ? 'Shareable link' : invite.email}
        </p>
        <p className="text-[11px] text-smoke">
          Sent {formatRelative(invite.createdAt)} · expires {formatRelative(invite.expiresAt)}
        </p>
      </div>
      {isLink && (
        <button
          onClick={handleCopy}
          className="text-[11px] font-medium text-graphite hover:text-tangerine flex items-center gap-1 px-2 py-1 cursor-pointer"
          aria-label="Copy invite link"
        >
          {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      <button
        onClick={onRevoke}
        aria-label="Revoke invite"
        className="text-smoke hover:text-tangerine transition-colors cursor-pointer p-1"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}

function formatRelative(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '—'
  const ms = (ts as { toMillis?: () => number }).toMillis?.() ?? 0
  if (!ms) return '—'
  const diff = ms - Date.now()
  const absDays = Math.round(Math.abs(diff) / (1000 * 60 * 60 * 24))
  if (diff > 0) {
    if (absDays === 0) return 'today'
    if (absDays === 1) return 'in 1 day'
    return `in ${absDays}d`
  }
  if (absDays === 0) return 'today'
  if (absDays === 1) return '1d ago'
  return `${absDays}d ago`
}

// ──────────────────────────────────────────────────────────────────
function InviteModal({
  orgId,
  seatsAvailable,
  onClose,
  onSuccess,
  onError,
}: {
  orgId: string
  seatsAvailable: number
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [kind, setKind] = useState<InviteKind>('email')
  const [emailInput, setEmailInput] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const noSeats = seatsAvailable === 0

  const inviteByEmail = async () => {
    const email = emailInput.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onError('Enter a valid email.')
      return
    }
    setBusy(true)
    try {
      const fn = httpsCallable<{ orgId: string; email: string }>(
        getFunctions(app ?? undefined),
        'inviteToOrganization'
      )
      await fn({ orgId, email })
      onSuccess(`Invite sent to ${email}.`)
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } }
      onError(err?.details?.message || err?.message || 'Could not send invite.')
    } finally {
      setBusy(false)
    }
  }

  const inviteByUsername = async () => {
    const username = usernameInput.trim().toLowerCase().replace(/^@/, '')
    if (!/^[a-z]{3,24}$/.test(username)) {
      onError('Username must be 3–24 lowercase letters.')
      return
    }
    setBusy(true)
    try {
      const fn = httpsCallable<{ orgId: string; username: string }>(
        getFunctions(app ?? undefined),
        'inviteByUsername'
      )
      await fn({ orgId, username })
      onSuccess(`Invite sent to @${username}.`)
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } }
      onError(err?.details?.message || err?.message || 'Could not send invite.')
    } finally {
      setBusy(false)
    }
  }

  const generateLink = async () => {
    setBusy(true)
    try {
      const fn = httpsCallable<{ orgId: string }, { ok: boolean; inviteUrl: string }>(
        getFunctions(app ?? undefined),
        'createInviteLink'
      )
      const res = await fn({ orgId })
      setLinkUrl(res.data.inviteUrl)
    } catch (e) {
      const err = e as { message?: string; details?: { message?: string } }
      onError(err?.details?.message || err?.message || 'Could not create invite link.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    if (!linkUrl) return
    try {
      await navigator.clipboard.writeText(linkUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1800)
    } catch {
      /* noop */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-white rounded-[20px] p-6"
        style={{
          boxShadow: '0 30px 80px -30px rgba(10,14,23,0.4), 0 10px 32px -16px rgba(10,14,23,0.2)',
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[18px] font-semibold text-ink leading-tight">Invite agent</h3>
            <p className="text-[12.5px] text-smoke mt-1">
              {noSeats
                ? 'No seats available.'
                : `${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'} available.`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center text-graphite cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Kind picker — pill toggle group */}
        <div className="flex gap-1 bg-cream rounded-full p-1 mb-5">
          {(['email', 'username', 'link'] as InviteKind[]).map((k) => (
            <button
              key={k}
              onClick={() => {
                setKind(k)
                setLinkUrl(null)
                setLinkCopied(false)
              }}
              className={`flex-1 py-1.5 text-[12.5px] font-semibold rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                kind === k ? 'bg-white text-ink shadow-sm' : 'text-smoke hover:text-graphite'
              }`}
            >
              {k === 'email' && <Envelope size={12} />}
              {k === 'username' && <At size={12} weight="bold" />}
              {k === 'link' && <LinkIcon size={12} />}
              {k === 'email' ? 'Email' : k === 'username' ? 'Username' : 'Link'}
            </button>
          ))}
        </div>

        {/* Per-kind body */}
        {kind === 'email' && (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="agent@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={noSeats || busy}
              className="w-full px-4 py-3 rounded-[12px] border border-pearl bg-cream/50 text-[14px] text-ink outline-none focus:border-tangerine focus:bg-white transition-colors disabled:opacity-50"
            />
            <button
              onClick={inviteByEmail}
              disabled={noSeats || busy || !emailInput.trim()}
              className="brand-btn-flat w-full py-2.5 text-[13.5px] font-semibold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send invite'}
            </button>
            <p className="text-[11.5px] text-smoke leading-relaxed">
              They'll get an email with a link. Only this address can accept the invite.
            </p>
          </div>
        )}

        {kind === 'username' && (
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-smoke text-[14px]">@</span>
              <input
                type="text"
                placeholder="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                disabled={noSeats || busy}
                className="w-full pl-9 pr-4 py-3 rounded-[12px] border border-pearl bg-cream/50 text-[14px] text-ink outline-none focus:border-tangerine focus:bg-white transition-colors disabled:opacity-50"
              />
            </div>
            <button
              onClick={inviteByUsername}
              disabled={noSeats || busy || !usernameInput.trim()}
              className="brand-btn-flat w-full py-2.5 text-[13.5px] font-semibold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send invite'}
            </button>
            <p className="text-[11.5px] text-smoke leading-relaxed">
              We'll look up the Reelst account and send an invite to their email on file.
            </p>
          </div>
        )}

        {kind === 'link' && (
          <div className="space-y-3">
            {!linkUrl ? (
              <>
                <button
                  onClick={generateLink}
                  disabled={noSeats || busy}
                  className="brand-btn-flat w-full py-2.5 text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate invite link'
                  )}
                </button>
                <p className="text-[11.5px] text-smoke leading-relaxed">
                  Single-use, expires in 14 days. Anyone with the link can claim the seat — share it carefully.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-cream rounded-[12px] px-3 py-2.5">
                  <code className="flex-1 text-[12px] text-graphite truncate font-mono">{linkUrl}</code>
                  <button
                    onClick={copyLink}
                    className="brand-btn-flat px-3 py-1.5 text-[12px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {linkCopied ? <Check size={11} weight="bold" /> : <Copy size={11} />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11.5px] text-smoke leading-relaxed">
                  Share this link in Slack, WhatsApp, anywhere. Whoever opens it first and signs in claims the seat.
                </p>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
