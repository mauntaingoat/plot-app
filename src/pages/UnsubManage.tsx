import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ArrowLeft, Warning } from '@phosphor-icons/react'
import { app } from '@/config/firebase'
import { ReelstLogo } from '@/components/ui/ReelstLogo'

/**
 * Public unsubscribe / manage-subscriptions page reached from the
 * Manage subscriptions link in every digest email.
 *
 * Route: /u/:token   (token is the unsubToken from any of the
 * recipient's digestSubscriptions docs)
 *
 * Flow:
 *   1. lookup → returns email + all agents this email is subscribed to
 *   2. user toggles per-agent (or "Unsubscribe from all")
 *   3. each toggle fires updateDigestSubscription optimistically
 *   4. when agent flips active→unsubscribed, the agent's subscriber
 *      count auto-decrements (the existing count math filters on
 *      status==='active') and Phase 4's onDigestSubscriptionUpdated
 *      trigger writes an inbox notification
 */

interface AgentSummary {
  subId: string
  agentId: string
  username: string
  displayName: string
  photoURL: string | null
  status: 'active' | 'unsubscribed'
  createdAt: number
  source: 'profile' | 'listing' | 'reels'
}

interface LookupResponse {
  email: string
  agents: AgentSummary[]
}

export default function UnsubManage() {
  const { token = '' } = useParams<{ token: string }>()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [email, setEmail] = useState('')
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [pendingSubIds, setPendingSubIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setState('error')
      setErrorMsg('Missing unsubscribe token. Open the link from your email again.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions')
        const fn = httpsCallable<{ token: string }, LookupResponse>(
          getFunctions(app ?? undefined),
          'lookupDigestSubscriptions',
        )
        const res = await fn({ token })
        if (cancelled) return
        setEmail(res.data.email)
        setAgents(res.data.agents)
        setState('ready')
      } catch (e: unknown) {
        if (cancelled) return
        const code = (e as { code?: string })?.code || ''
        setState('error')
        if (code === 'functions/not-found') setErrorMsg("This link isn't valid — it may have already been used or expired.")
        else if (code === 'functions/invalid-argument') setErrorMsg('That link is malformed. Open it from your email again.')
        else setErrorMsg("We couldn't load your subscriptions. Try again in a moment.")
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const updateOne = async (sub: AgentSummary, nextStatus: 'active' | 'unsubscribed') => {
    if (sub.status === nextStatus) return
    setPendingSubIds((prev) => new Set(prev).add(sub.subId))
    // Optimistic flip
    setAgents((prev) => prev.map((a) => (a.subId === sub.subId ? { ...a, status: nextStatus } : a)))
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions')
      const fn = httpsCallable<
        { token: string; subId: string; status: 'active' | 'unsubscribed' },
        { ok: boolean }
      >(getFunctions(app ?? undefined), 'updateDigestSubscription')
      await fn({ token, subId: sub.subId, status: nextStatus })
    } catch (e) {
      // Revert on failure
      setAgents((prev) => prev.map((a) => (a.subId === sub.subId ? { ...a, status: sub.status } : a)))
      console.error('[unsub] toggle failed:', e)
    } finally {
      setPendingSubIds((prev) => {
        const next = new Set(prev)
        next.delete(sub.subId)
        return next
      })
    }
  }

  const unsubscribeAll = async () => {
    setBulkLoading(true)
    const toFlip = agents.filter((a) => a.status === 'active')
    // Sequential to avoid burst on the SMTP/Firestore side; small N anyway.
    for (const a of toFlip) {
      // eslint-disable-next-line no-await-in-loop
      await updateOne(a, 'unsubscribed')
    }
    setBulkLoading(false)
  }

  const activeCount = useMemo(() => agents.filter((a) => a.status === 'active').length, [agents])
  const allUnsubscribed = activeCount === 0 && agents.length > 0

  return (
    <div className="min-h-screen bg-ivory" style={{ fontFamily: 'var(--font-humanist)' }}>
      {/* Header */}
      <header className="bg-warm-white border-b border-border-light px-5 py-4 flex items-center">
        <Link to="/" className="mr-auto">
          <ReelstLogo size="sm" />
        </Link>
      </header>

      <main className="px-4 py-10 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[480px]"
        >
          {state === 'loading' && (
            <div className="bg-warm-white rounded-[22px] shadow-sm border border-border-light p-8 text-center">
              <span className="inline-block w-7 h-7 border-2 border-tangerine border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[14px] text-graphite">Loading your subscriptions…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="bg-warm-white rounded-[22px] shadow-sm border border-border-light p-7 text-center">
              <div className="inline-flex w-12 h-12 rounded-full bg-live-red/12 items-center justify-center mb-4">
                <Warning weight="fill" size={26} className="text-live-red" />
              </div>
              <h1 className="text-[20px] font-semibold text-ink tracking-tight mb-1">Couldn't open this link</h1>
              <p className="text-[13.5px] text-graphite mb-5 leading-relaxed">{errorMsg}</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-cream text-ink text-[14px] font-semibold hover:bg-pearl transition-colors"
              >
                <ArrowLeft size={14} /> Back to Reelst
              </Link>
            </div>
          )}

          {state === 'ready' && (
            <div className="bg-warm-white rounded-[22px] shadow-sm border border-border-light overflow-hidden">
              <div className="px-7 pt-7 pb-5 text-center">
                <h1 className="text-[24px] font-semibold text-ink tracking-tight mb-2" style={{ letterSpacing: '-0.022em' }}>
                  Manage your subscriptions
                </h1>
                <p className="text-[13.5px] text-graphite leading-relaxed">
                  These are the agents you've saved on Reelst. Toggle off any whose updates you'd like to stop receiving.
                </p>
                <p className="text-[12px] text-smoke mt-2.5">
                  Subscriptions for <span className="font-semibold text-graphite">{maskEmail(email)}</span>
                </p>
              </div>

              <div className="px-4 pb-2">
                {agents.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[13px] text-smoke">
                    No active subscriptions found for this email.
                  </div>
                ) : (
                  <ul className="divide-y divide-border-light">
                    {agents.map((agent) => (
                      <AgentRow
                        key={agent.subId}
                        agent={agent}
                        pending={pendingSubIds.has(agent.subId)}
                        onChange={(next) => updateOne(agent, next)}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {agents.length > 0 && (
                <div className="px-7 pt-3 pb-7 border-t border-border-light bg-cream/40">
                  <AnimatePresence mode="wait">
                    {allUnsubscribed ? (
                      <motion.p
                        key="done"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[13px] text-graphite text-center"
                      >
                        You're unsubscribed from all updates. Re-toggle any above to opt back in anytime.
                      </motion.p>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between gap-3 flex-wrap"
                      >
                        <span className="text-[12px] text-smoke">
                          {activeCount} active · {agents.length - activeCount} unsubscribed
                        </span>
                        <button
                          onClick={unsubscribeAll}
                          disabled={bulkLoading || activeCount === 0}
                          className="text-[12.5px] font-semibold text-live-red hover:underline underline-offset-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ fontFamily: 'inherit' }}
                        >
                          {bulkLoading ? 'Unsubscribing…' : 'Unsubscribe from all'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          <p className="text-[11.5px] text-smoke text-center mt-6 leading-relaxed">
            Reelst is a DBA of <span className="font-semibold text-graphite">Avigage Systems Inc.</span><br />
            Changes save automatically.
          </p>
        </motion.div>
      </main>
    </div>
  )
}

/* ─────────────── Agent row ─────────────── */

function AgentRow({
  agent,
  pending,
  onChange,
}: {
  agent: AgentSummary
  pending: boolean
  onChange: (next: 'active' | 'unsubscribed') => void
}) {
  const isActive = agent.status === 'active'
  const since = agent.createdAt > 0
    ? new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <li className="flex items-center gap-3 py-3 px-3">
      {agent.photoURL ? (
        <img
          src={agent.photoURL}
          alt=""
          className="w-11 h-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white text-[16px] font-semibold"
          style={{ background: 'linear-gradient(135deg, #FF8552 0%, #D94A1F 100%)' }}
        >
          {agent.displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-ink truncate" style={{ letterSpacing: '-0.012em' }}>
          {agent.displayName}
        </p>
        <p className="text-[12px] text-smoke truncate">
          @{agent.username}{since ? ` · saved ${since}` : ''}
        </p>
      </div>
      <Toggle
        checked={isActive}
        disabled={pending}
        onChange={(checked) => onChange(checked ? 'active' : 'unsubscribed')}
      />
    </li>
  )
}

/* ─────────────── Toggle (iOS-style) ─────────────── */

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 h-7 w-12 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-tangerine' : 'bg-pearl'
      }`}
      style={{ fontFamily: 'inherit' }}
    >
      <span
        className={`inline-flex absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform items-center justify-center ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      >
        {checked && <Heart weight="fill" size={11} className="text-tangerine" />}
      </span>
    </button>
  )
}

/* ─────────────── helpers ─────────────── */

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}*@${domain}`
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`
}
