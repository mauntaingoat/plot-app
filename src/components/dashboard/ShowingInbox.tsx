import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, Calendar, MessageSquare, Inbox, Check, Clock, UserPlus, Bookmark, ChevronRight, Eye } from 'lucide-react'
import { listShowingRequests, updateShowingRequestStatus, subscribeToNotifications, markNotificationsRead, type NotificationDoc } from '@/lib/firestore'
import { formatDateShort, formatTime12h } from '@/lib/ics'
import type { ShowingRequest, ShowingRequestStatus } from '@/lib/types'

interface ShowingInboxProps {
  agentId: string
}

const STATUS_COLORS: Record<ShowingRequestStatus, { bg: string; text: string; label: string }> = {
  new:       { bg: 'bg-tangerine',     text: 'text-white',       label: 'New' },
  read:      { bg: 'bg-pearl',         text: 'text-graphite',    label: 'Read' },
  scheduled: { bg: 'bg-sold-green',    text: 'text-white',       label: 'Scheduled' },
  closed:    { bg: 'bg-smoke',         text: 'text-white',       label: 'Closed' },
}

type TabId = 'all' | 'showings' | 'follows' | 'saves'

function dateKey(ts: any): string {
  if (!ts) return 'unknown'
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
  return d.toISOString().slice(0, 10)
}

function formatGroupDate(key: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ShowingInbox({ agentId }: ShowingInboxProps) {
  const [requests, setRequests] = useState<ShowingRequest[]>([])
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('all')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listShowingRequests(agentId)
      .then((data) => { if (!cancelled) setRequests(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [agentId])

  useEffect(() => {
    const unsub = subscribeToNotifications(agentId, setNotifications)
    return () => { unsub?.() }
  }, [agentId])

  const follows = useMemo(() => notifications.filter((n) => n.type === 'follow'), [notifications])
  const saves = useMemo(() => notifications.filter((n) => n.type === 'save'), [notifications])

  const followsByDay = useMemo(() => {
    const map = new Map<string, NotificationDoc[]>()
    for (const n of follows) {
      const key = dateKey(n.createdAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [follows])

  const savesByDay = useMemo(() => {
    const map = new Map<string, NotificationDoc[]>()
    for (const n of saves) {
      const key = dateKey(n.createdAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [saves])

  const unreadShowings = requests.filter((r) => r.status === 'new').length
  const unreadFollows = follows.filter((n) => !n.read).length
  const unreadSaves = saves.filter((n) => !n.read).length

  const updateStatus = async (id: string, status: ShowingRequestStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    await updateShowingRequestStatus(id, status).catch(() => {})
  }

  const handleExpandGroup = (groupKey: string, items: NotificationDoc[]) => {
    setExpandedGroup(expandedGroup === groupKey ? null : groupKey)
    const unread = items.filter((n) => !n.read).map((n) => n.id)
    if (unread.length > 0) {
      markNotificationsRead(unread).catch(() => {})
      setNotifications((prev) => prev.map((n) => unread.includes(n.id) ? { ...n, read: true } : n))
    }
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: unreadShowings + unreadFollows + unreadSaves },
    { id: 'showings', label: 'Showings', count: unreadShowings },
    { id: 'follows', label: 'Followers', count: unreadFollows },
    { id: 'saves', label: 'Saves', count: unreadSaves },
  ]

  const showShowings = tab === 'all' || tab === 'showings'
  const showFollows = tab === 'all' || tab === 'follows'
  const showSaves = tab === 'all' || tab === 'saves'

  const isEmpty = requests.length === 0 && notifications.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
              tab === t.id ? 'bg-ink text-warm-white' : 'bg-cream text-graphite hover:bg-pearl'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-tangerine text-white'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-cream rounded-[16px] p-4 animate-pulse">
              <div className="h-3 w-1/3 bg-pearl rounded mb-3" />
              <div className="h-3 w-2/3 bg-pearl rounded" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="bg-cream rounded-[20px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-pearl mx-auto mb-3 flex items-center justify-center">
            <Inbox size={24} className="text-smoke" />
          </div>
          <h3 className="text-[16px] font-bold text-ink mb-1">No notifications yet</h3>
          <p className="text-[13px] text-smoke">
            Showing requests, new followers, and saves will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {showFollows && followsByDay.map(([day, items]) => {
            const unread = items.some((n) => !n.read)
            const groupKey = `follows-${day}`
            const expanded = expandedGroup === groupKey
            return (
              <motion.div key={groupKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-[16px] border overflow-hidden ${unread ? 'bg-tangerine/5 border-tangerine/15' : 'bg-warm-white border-border-light'}`}>
                <button onClick={() => handleExpandGroup(groupKey, items)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-cream/50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${unread ? 'bg-tangerine/15' : 'bg-pearl'}`}>
                    <UserPlus size={16} className={unread ? 'text-tangerine' : 'text-smoke'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold ${unread ? 'text-ink' : 'text-graphite'}`}>
                      {items.length} new follower{items.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-smoke">{formatGroupDate(day)}</p>
                  </div>
                  {unread && <div className="w-2 h-2 rounded-full bg-tangerine shrink-0" />}
                  <ChevronRight size={14} className={`text-ash transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-3 space-y-1.5">
                        {items.map((n) => (
                          <div key={n.id} className="flex items-center gap-2.5 py-1.5 text-[12px] text-graphite">
                            <UserPlus size={12} className="text-ash shrink-0" />
                            <span>{n.actorName || 'Someone'}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {showSaves && savesByDay.map(([day, items]) => {
            const unread = items.some((n) => !n.read)
            const groupKey = `saves-${day}`
            const expanded = expandedGroup === groupKey
            return (
              <motion.div key={groupKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-[16px] border overflow-hidden ${unread ? 'bg-[#A855F7]/5 border-[#A855F7]/15' : 'bg-warm-white border-border-light'}`}>
                <button onClick={() => handleExpandGroup(groupKey, items)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-cream/50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${unread ? 'bg-[#A855F7]/15' : 'bg-pearl'}`}>
                    <Bookmark size={16} className={unread ? 'text-[#A855F7]' : 'text-smoke'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold ${unread ? 'text-ink' : 'text-graphite'}`}>
                      {items.length} listing save{items.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-smoke">{formatGroupDate(day)}</p>
                  </div>
                  {unread && <div className="w-2 h-2 rounded-full bg-[#A855F7] shrink-0" />}
                  <ChevronRight size={14} className={`text-ash transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-3 space-y-1.5">
                        {items.map((n) => (
                          <div key={n.id} className="flex items-center gap-2.5 py-1.5 text-[12px] text-graphite">
                            <Bookmark size={12} className="text-ash shrink-0" />
                            <span>{n.pinAddress || 'A listing'}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {showShowings && requests.map((req) => (
            <RequestCard key={req.id} request={req} onStatusChange={updateStatus} />
          ))}

          {!showShowings && requests.length === 0 && notifications.length === 0 && (
            <p className="text-[13px] text-smoke text-center py-6">Nothing here yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Unread count hook for the tab badge ──
export function useUnreadCount(agentId: string | undefined) {
  const [notifCount, setNotifCount] = useState(0)
  const [showingCount, setShowingCount] = useState(0)
  useEffect(() => {
    if (!agentId) return
    const unsub = subscribeToNotifications(agentId, (docs) => {
      setNotifCount(docs.filter((d) => !d.read).length)
    })
    listShowingRequests(agentId).then((reqs) => {
      setShowingCount(reqs.filter((r) => r.status === 'new').length)
    }).catch(() => {})
    return () => { unsub?.() }
  }, [agentId])
  return notifCount + showingCount
}

function RequestCard({
  request,
  onStatusChange,
}: {
  request: ShowingRequest
  onStatusChange: (id: string, status: ShowingRequestStatus) => void
}) {
  const status = STATUS_COLORS[request.status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-warm-white border border-border-light rounded-[18px] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-ink">{request.visitorName}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="text-[12px] text-smoke truncate mt-0.5">{request.pinAddress}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
        <a href={`mailto:${request.visitorEmail}`} className="flex items-center gap-2 text-graphite hover:text-tangerine truncate">
          <Mail size={12} className="text-ash shrink-0" />
          <span className="truncate">{request.visitorEmail}</span>
        </a>
        <a href={`tel:${request.visitorPhone}`} className="flex items-center gap-2 text-graphite hover:text-tangerine truncate">
          <Phone size={12} className="text-ash shrink-0" />
          {request.visitorPhone}
        </a>
        <div className="flex items-center gap-2 text-graphite">
          <Calendar size={12} className="text-ash shrink-0" />
          {formatDateShort(request.preferredDate)}
        </div>
        <div className="flex items-center gap-2 text-graphite">
          <Clock size={12} className="text-ash shrink-0" />
          {formatTime12h(request.preferredTime)}
        </div>
      </div>

      {request.note && (
        <div className="mt-3 pt-3 border-t border-border-light flex items-start gap-2">
          <MessageSquare size={12} className="text-ash mt-0.5 shrink-0" />
          <p className="text-[12px] text-graphite leading-relaxed">{request.note}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border-light">
        {request.status === 'new' && (
          <button
            onClick={() => onStatusChange(request.id, 'read')}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-cream text-graphite hover:bg-pearl cursor-pointer transition-colors"
          >
            Mark read
          </button>
        )}
        {request.status !== 'scheduled' && (
          <button
            onClick={() => onStatusChange(request.id, 'scheduled')}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-sold-green/15 text-sold-green hover:bg-sold-green/25 cursor-pointer transition-colors flex items-center gap-1"
          >
            <Check size={11} /> Mark scheduled
          </button>
        )}
        {request.status !== 'closed' && (
          <button
            onClick={() => onStatusChange(request.id, 'closed')}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-cream text-smoke hover:bg-pearl cursor-pointer transition-colors ml-auto"
          >
            Close
          </button>
        )}
      </div>
    </motion.div>
  )
}
