import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Calendar, Clock, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { useScrollLock } from '@/hooks/useScrollLock'
import { formatDateShort, formatTime12h } from '@/lib/ics'
import type { ForSalePin, OpenHouse, OpenHouseSession } from '@/lib/types'

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: MediaQueryListEvent) => setD(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

interface OpenHouseEditorProps {
  isOpen: boolean
  onClose: () => void
  pin: ForSalePin | null
  onSave: (pinId: string, openHouse: OpenHouse | null) => void | Promise<void>
}

const todayISO = () => new Date().toISOString().split('T')[0]

function newSession(): OpenHouseSession {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: todayISO(),
    startTime: '14:00',
    endTime: '17:00',
  }
}

export function OpenHouseEditor({ isOpen, onClose, pin, onSave }: OpenHouseEditorProps) {
  const isDesktop = useIsDesktop()
  useScrollLock(isOpen && isDesktop)
  const [sessions, setSessions] = useState<OpenHouseSession[]>([])
  const [recurringWeeks, setRecurringWeeks] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!pin) return
    const existing = pin.openHouse?.sessions || []
    setSessions(existing.length > 0 ? existing : [newSession()])
    setRecurringWeeks(pin.openHouse?.recurringWeeks || 0)
  }, [pin])

  if (!pin) return null

  const updateSession = (id: string, patch: Partial<OpenHouseSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }
  const addSession = () => {
    setSessions((prev) => [...prev, newSession()])
  }

  const handleSave = async () => {
    if (!pin) return
    setSaving(true)
    const validSessions = sessions.filter((s) => s.date && s.startTime && s.endTime)
    const oh: OpenHouse | null =
      validSessions.length === 0
        ? null
        : { sessions: validSessions, recurringWeeks: recurringWeeks || 0 }
    await onSave(pin.id, oh)
    setSaving(false)
    onClose()
  }

  const handleClear = async () => {
    if (!pin) return
    setSaving(true)
    await onSave(pin.id, null)
    setSaving(false)
    onClose()
  }

  const editorContent = (
    <>
      <div className="space-y-4">
        <p className="text-[12px] text-ghost truncate">{pin.address}</p>
        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <SessionRow
              key={session.id}
              index={idx}
              session={session}
              canDelete={sessions.length > 1}
              onChange={(patch) => updateSession(session.id, patch)}
              onRemove={() => removeSession(session.id)}
            />
          ))}
        </div>

        <button
          onClick={addSession}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] border border-dashed border-border-dark text-ghost hover:text-mist hover:border-mist transition-colors text-[13px] font-semibold cursor-pointer"
        >
          <Plus size={14} /> Add another session
        </button>

        {/* Recurring */}
        <div className="bg-slate rounded-[14px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Repeat size={14} className="text-tangerine" />
            <p className="text-[13px] font-semibold text-white">Repeat weekly</p>
          </div>
          <p className="text-[11px] text-ghost mb-3">
            Repeats the first session same day & time, for the next N weeks.
          </p>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 4, 8].map((n) => (
              <button
                key={n}
                onClick={() => setRecurringWeeks(n)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                  recurringWeeks === n
                    ? 'bg-tangerine text-white'
                    : 'bg-charcoal text-ghost hover:text-white'
                }`}
              >
                {n === 0 ? 'No repeat' : `${n} wk${n > 1 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-5 flex items-center gap-2">
        {pin.openHouse && (
          <Button variant="glass" size="md" onClick={handleClear} disabled={saving}>
            Clear all
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="glass" size="md" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleSave} disabled={saving || sessions.length === 0}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  )

  if (!isDesktop) {
    return (
      <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Schedule Open House">
        <div className="px-5 pb-8">
          {editorContent}
        </div>
      </DarkBottomSheet>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[520px] max-h-[90vh] bg-obsidian rounded-[22px] shadow-2xl overflow-hidden flex flex-col border border-border-dark"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark shrink-0">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 text-tangerine">
                  <Calendar size={15} />
                  <h2 className="text-[16px] font-extrabold text-white tracking-tight">Schedule Open House</h2>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center cursor-pointer hover:bg-slate transition-colors shrink-0">
                <X size={15} className="text-ghost" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {editorContent}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface SessionRowProps {
  index: number
  session: OpenHouseSession
  canDelete: boolean
  onChange: (patch: Partial<OpenHouseSession>) => void
  onRemove: () => void
}

function SessionRow({ index, session, canDelete, onChange, onRemove }: SessionRowProps) {
  return (
    <div className="bg-slate rounded-[14px] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-tangerine">
          Session {index + 1}
        </p>
        {canDelete && (
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-full bg-charcoal flex items-center justify-center text-ghost hover:text-live-red cursor-pointer transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ghost">Date</span>
          <input
            type="date"
            value={session.date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="mt-1 w-full bg-charcoal text-white text-[13px] font-medium rounded-[10px] px-3 py-2.5 border border-border-dark focus:border-tangerine outline-none [color-scheme:dark]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ghost">Start</span>
          <input
            type="time"
            value={session.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className="mt-1 w-full bg-charcoal text-white text-[13px] font-medium rounded-[10px] px-3 py-2.5 border border-border-dark focus:border-tangerine outline-none [color-scheme:dark]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ghost">End</span>
          <input
            type="time"
            value={session.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className="mt-1 w-full bg-charcoal text-white text-[13px] font-medium rounded-[10px] px-3 py-2.5 border border-border-dark focus:border-tangerine outline-none [color-scheme:dark]"
          />
        </label>
      </div>

      {/* Preview */}
      {session.date && session.startTime && session.endTime && (
        <div className="flex items-center gap-2 text-[11px] text-mist pt-1 border-t border-border-dark">
          <Clock size={11} className="text-ghost" />
          {formatDateShort(session.date)} · {formatTime12h(session.startTime)} – {formatTime12h(session.endTime)}
        </div>
      )}
    </div>
  )
}
