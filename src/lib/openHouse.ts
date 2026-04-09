import type { OpenHouse, OpenHouseSession, ForSalePin } from '@/lib/types'
import { buildICS, downloadICS, formatDateShort, formatTime12h } from '@/lib/ics'

/**
 * Expands a OpenHouse with `recurringWeeks` into a flat list of concrete sessions.
 * Each weekly recurrence repeats the FIRST session on the same day-of-week + time.
 */
export function expandSessions(oh: OpenHouse | null | undefined): OpenHouseSession[] {
  if (!oh || !oh.sessions || oh.sessions.length === 0) return []
  const base = [...oh.sessions]
  const recur = oh.recurringWeeks || 0
  if (recur > 0 && oh.sessions[0]) {
    const first = oh.sessions[0]
    for (let i = 1; i <= recur; i++) {
      const d = new Date(`${first.date}T00:00:00`)
      d.setDate(d.getDate() + i * 7)
      const iso = d.toISOString().split('T')[0]
      base.push({
        id: `${first.id}_r${i}`,
        date: iso,
        startTime: first.startTime,
        endTime: first.endTime,
      })
    }
  }
  // sort chronologically
  return base.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
}

/** Returns the next future session, or null if all are in the past. */
export function nextSession(oh: OpenHouse | null | undefined): OpenHouseSession | null {
  const all = expandSessions(oh)
  const now = Date.now()
  const future = all.filter((s) => new Date(`${s.date}T${s.endTime}:00`).getTime() >= now)
  return future[0] || null
}

export function hasUpcomingOpenHouse(pin: { openHouse?: OpenHouse | null }): boolean {
  return nextSession(pin.openHouse) !== null
}

export function formatSession(s: OpenHouseSession): string {
  return `${formatDateShort(s.date)} · ${formatTime12h(s.startTime)} – ${formatTime12h(s.endTime)}`
}

/**
 * Build and download an .ics file for a pin's open house sessions.
 */
export function downloadOpenHouseICS(pin: ForSalePin, agentName: string) {
  const sessions = expandSessions(pin.openHouse)
  if (sessions.length === 0) return

  const events = sessions.map((s) => ({
    uid: `${pin.id}_${s.id}`,
    title: `Open House — ${pin.address}`,
    description: `Hosted by ${agentName} · ${pin.beds} bd · ${pin.baths} ba · ${pin.sqft.toLocaleString()} sqft`,
    location: pin.address,
    startDate: s.date,
    startTime: s.startTime,
    endDate: s.date,
    endTime: s.endTime,
    url: `https://reel.st`,
  }))

  const ics = buildICS(events)
  const safeAddr = pin.address.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)
  downloadICS(`open-house-${safeAddr}.ics`, ics)
}
