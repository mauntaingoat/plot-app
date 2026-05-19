import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { UsersThree, MapPin } from '@phosphor-icons/react'
import { getWithinProfileCrossover, type WithinProfileCrossoverEntry } from '@/lib/firestore'

// Mirrors functions/src/crossoverInsights.ts CrossAgentInsights shape.
interface CrossAgentInsights {
  topAgents: {
    agentId: string
    displayName: string
    username: string
    photoURL: string | null
    sharedVisitors: number
    overlapPct: number
  }[]
  topNeighborhoods: {
    name: string
    sharedVisitors: number
    overlapPct: number
  }[]
  myVisitorCount: number
  computedAt: number
}

type TabId = 'within' | 'across'
type WindowId = 'all' | '30d'

interface CrossoverInsightsProps {
  agentId: string
}

export function CrossoverInsights({ agentId }: CrossoverInsightsProps) {
  const [tab, setTab] = useState<TabId>('within')
  const [windowId, setWindowId] = useState<WindowId>('all')
  const [withinData, setWithinData] = useState<Record<string, WithinProfileCrossoverEntry>>({})
  const [acrossData, setAcrossData] = useState<CrossAgentInsights | null>(null)
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [loadingWithin, setLoadingWithin] = useState(false)
  const [loadingAcross, setLoadingAcross] = useState(false)

  const windowDays = windowId === '30d' ? 30 : undefined

  useEffect(() => {
    if (tab !== 'within' || !agentId) return
    let cancelled = false
    setLoadingWithin(true)
    getWithinProfileCrossover(agentId, windowDays)
      .then((data) => {
        if (cancelled) return
        setWithinData(data)
        // Auto-select the first pin with co-taps so the panel isn't
        // empty when data exists. Fall back to first pin overall.
        const firstWithCoTaps = Object.values(data).find((e) => e.coTaps.length > 0)
        setSelectedPin(firstWithCoTaps?.pinId || Object.keys(data)[0] || null)
      })
      .catch(() => {
        if (!cancelled) setWithinData({})
      })
      .finally(() => {
        if (!cancelled) setLoadingWithin(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, agentId, windowDays])

  useEffect(() => {
    if (tab !== 'across' || !agentId) return
    let cancelled = false
    setLoadingAcross(true)
    Promise.all([import('firebase/functions'), import('@/config/firebase')])
      .then(async ([{ getFunctions, httpsCallable }, { app }]) => {
        const fn = httpsCallable(getFunctions(app ?? undefined), 'getCrossAgentInsights')
        try {
          const res = await fn({ agentId, window: windowId })
          if (!cancelled) setAcrossData(res.data as CrossAgentInsights)
        } catch {
          if (!cancelled) setAcrossData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAcross(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, agentId, windowId])

  const pinOptions = useMemo(() => {
    return Object.values(withinData)
      .map((e) => ({
        pinId: e.pinId,
        address: e.address,
        totalVisitors: e.totalVisitors,
        hasCoTaps: e.coTaps.length > 0,
      }))
      .sort((a, b) => b.totalVisitors - a.totalVisitors)
  }, [withinData])

  const selectedEntry = selectedPin ? withinData[selectedPin] || null : null

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[14px] font-bold text-ink">Crossover Insights</h3>
          <p className="text-[11px] text-smoke mt-0.5">
            {tab === 'within'
              ? 'Pins your visitors tap together'
              : 'Other agents and neighborhoods your visitors explore'}
          </p>
        </div>
        <div className="flex items-center bg-cream rounded-full p-0.5 shrink-0">
          {([
            { id: 'all', label: 'All time' },
            { id: '30d', label: 'Last 30d' },
          ] as { id: WindowId; label: string }[]).map((w) => {
            const active = windowId === w.id
            return (
              <button
                key={w.id}
                onClick={() => setWindowId(w.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${active ? 'bg-warm-white text-ink shadow-sm' : 'text-smoke hover:text-ink'}`}
              >
                {w.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border-light">
        {([
          { id: 'within', label: 'Within profile' },
          { id: 'across', label: 'Across Reelst' },
        ] as { id: TabId; label: string }[]).map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-[13px] font-semibold px-3 py-2 cursor-pointer transition-colors border-b-2 -mb-px ${active ? 'border-tangerine text-ink' : 'border-transparent text-smoke hover:text-ink'}`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'within' ? (
        <WithinTab
          loading={loadingWithin}
          pinOptions={pinOptions}
          selectedPin={selectedPin}
          setSelectedPin={setSelectedPin}
          selectedEntry={selectedEntry}
        />
      ) : (
        <AcrossTab loading={loadingAcross} data={acrossData} />
      )}
    </div>
  )
}

interface PinOption {
  pinId: string
  address: string
  totalVisitors: number
  hasCoTaps: boolean
}

function WithinTab({
  loading,
  pinOptions,
  selectedPin,
  setSelectedPin,
  selectedEntry,
}: {
  loading: boolean
  pinOptions: PinOption[]
  selectedPin: string | null
  setSelectedPin: (id: string) => void
  selectedEntry: WithinProfileCrossoverEntry | null
}) {
  if (loading) return <p className="text-[12px] text-smoke text-center py-6">Loading…</p>
  if (pinOptions.length === 0) {
    return (
      <p className="text-[12px] text-smoke text-center py-6">
        Not enough data yet. Co-tap insights appear once visitors start tapping multiple pins on your profile.
      </p>
    )
  }
  return (
    <>
      <div className="mb-3">
        <label className="text-[11px] text-smoke font-medium block mb-1.5">Visitors who tapped…</label>
        <select
          value={selectedPin || ''}
          onChange={(e) => setSelectedPin(e.target.value)}
          className="w-full h-10 rounded-lg border border-border-light bg-warm-white px-3 text-[13px] text-ink font-medium outline-none focus:border-tangerine/40 cursor-pointer"
        >
          {pinOptions.map((p) => (
            <option key={p.pinId} value={p.pinId}>
              {p.address} ({p.totalVisitors} visitor{p.totalVisitors !== 1 ? 's' : ''})
            </option>
          ))}
        </select>
      </div>
      {selectedEntry && selectedEntry.coTaps.length > 0 ? (
        <>
          <p className="text-[11px] text-smoke mb-2">…also tapped</p>
          <div className="space-y-2">
            {selectedEntry.coTaps.map((ct, i) => (
              <motion.div
                key={ct.pinId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-cream rounded-[14px] p-3 flex items-center justify-between gap-3"
              >
                <p className="text-[13px] font-semibold text-ink truncate flex-1 min-w-0">{ct.address}</p>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[15px] font-extrabold text-tangerine font-mono">{ct.overlapPct}%</span>
                  <span className="text-[10px] text-smoke">{ct.sharedVisitors} shared</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[12px] text-smoke text-center py-4">
          No visitors have tapped this pin alongside others yet.
        </p>
      )}
    </>
  )
}

function AcrossTab({ loading, data }: { loading: boolean; data: CrossAgentInsights | null }) {
  if (loading) return <p className="text-[12px] text-smoke text-center py-6">Loading…</p>
  if (!data || (data.topAgents.length === 0 && data.topNeighborhoods.length === 0)) {
    return (
      <p className="text-[12px] text-smoke text-center py-6">
        Not enough data yet. Cross-Reelst insights appear once your visitors engage with other agents on Reelst.
      </p>
    )
  }
  return (
    <div className="space-y-4">
      {data.topAgents.length > 0 && (
        <div>
          <h4 className="text-[12px] font-bold text-ink mb-2 flex items-center gap-1.5">
            <UsersThree size={13} weight="bold" className="text-smoke" />
            Other agents your visitors check out
          </h4>
          <div className="space-y-2">
            {data.topAgents.map((a, i) => (
              <motion.div
                key={a.agentId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-cream rounded-[14px] p-3 flex items-center gap-3"
              >
                {a.photoURL ? (
                  <img src={a.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-pearl flex items-center justify-center shrink-0">
                    <UsersThree size={14} className="text-smoke" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-ink truncate">{a.displayName}</p>
                  {a.username && <p className="text-[11px] text-smoke truncate">@{a.username}</p>}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[15px] font-extrabold text-tangerine font-mono">{a.overlapPct}%</span>
                  <span className="text-[10px] text-smoke">{a.sharedVisitors} shared</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {data.topNeighborhoods.length > 0 && (
        <div>
          <h4 className="text-[12px] font-bold text-ink mb-2 flex items-center gap-1.5">
            <MapPin size={13} weight="bold" className="text-smoke" />
            Neighborhoods they explore elsewhere
          </h4>
          <div className="space-y-2">
            {data.topNeighborhoods.map((n, i) => (
              <motion.div
                key={n.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-cream rounded-[14px] p-3 flex items-center justify-between gap-3"
              >
                <p className="text-[13px] font-semibold text-ink truncate flex-1 min-w-0">{n.name}</p>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[15px] font-extrabold text-tangerine font-mono">{n.overlapPct}%</span>
                  <span className="text-[10px] text-smoke">{n.sharedVisitors} shared</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
