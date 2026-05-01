import { Calendar, Download } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { expandSessions, formatSession, downloadOpenHouseICS } from '@/lib/openHouse'
import type { ForSalePin, UserDoc } from '@/lib/types'

interface OpenHouseBlockProps {
  pin: ForSalePin
  agent: UserDoc
}

/**
 * Renders the upcoming open house sessions for a for-sale pin,
 * with an "Add to Calendar" button that downloads an .ics file.
 */
export function OpenHouseBlock({ pin, agent }: OpenHouseBlockProps) {
  const sessions = expandSessions(pin.openHouse)
  if (sessions.length === 0) return null

  // Show up to 3 upcoming sessions
  const now = Date.now()
  const upcoming = sessions
    .filter((s) => new Date(`${s.date}T${s.endTime}:00`).getTime() >= now)
    .slice(0, 3)
  if (upcoming.length === 0) return null

  const handleDownload = () => downloadOpenHouseICS(pin, agent.displayName)

  return (
    <div className="bg-open-amber/10 border border-open-amber/20 rounded-[14px] px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-open-amber/20 flex items-center justify-center shrink-0 mt-0.5">
          <Calendar size={13} className="text-open-amber" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-open-amber leading-tight">
            {upcoming.length > 1 ? 'Open Houses' : 'Open House'}
          </p>
          <div className="mt-1.5 space-y-1">
            {upcoming.map((s) => (
              <p key={s.id} className="text-[12px] text-mist leading-snug">
                {formatSession(s)}
              </p>
            ))}
          </div>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleDownload}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-[10px] bg-open-amber text-obsidian text-[12px] font-bold cursor-pointer hover:brightness-110 transition-all"
      >
        <Download size={12} /> Add to Calendar
      </motion.button>
    </div>
  )
}
