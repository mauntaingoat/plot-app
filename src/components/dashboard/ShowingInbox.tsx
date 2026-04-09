import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, Calendar, MessageSquare, Inbox, Check, Clock } from 'lucide-react'
import { listShowingRequests, updateShowingRequestStatus } from '@/lib/firestore'
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

export function ShowingInbox({ agentId }: ShowingInboxProps) {
  const [requests, setRequests] = useState<ShowingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'scheduled'>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listShowingRequests(agentId)
      .then((data) => {
        if (!cancelled) setRequests(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [agentId])

  const updateStatus = async (id: string, status: ShowingRequestStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    await updateShowingRequestStatus(id, status).catch(() => {})
  }

  const visible = requests.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'new') return r.status === 'new'
    if (filter === 'scheduled') return r.status === 'scheduled'
    return true
  })

  const newCount = requests.filter((r) => r.status === 'new').length

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {([
          { id: 'all', label: 'All', count: requests.length },
          { id: 'new', label: 'New', count: newCount },
          { id: 'scheduled', label: 'Scheduled', count: requests.filter((r) => r.status === 'scheduled').length },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
              filter === f.id
                ? 'bg-ink text-warm-white'
                : 'bg-cream text-graphite hover:bg-pearl'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1.5 text-[10px] ${filter === f.id ? 'opacity-70' : 'opacity-60'}`}>
                {f.count}
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
              <div className="h-3 w-2/3 bg-pearl rounded mb-2" />
              <div className="h-3 w-1/2 bg-pearl rounded" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-cream rounded-[20px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-pearl mx-auto mb-3 flex items-center justify-center">
            <Inbox size={24} className="text-smoke" />
          </div>
          <h3 className="text-[16px] font-bold text-ink mb-1">No showing requests yet</h3>
          <p className="text-[13px] text-smoke">
            When visitors request a tour, they'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((req) => (
            <RequestCard key={req.id} request={req} onStatusChange={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
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

      {/* Actions */}
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
