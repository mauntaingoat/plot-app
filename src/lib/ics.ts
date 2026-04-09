/**
 * .ics calendar file generator (RFC 5545 minimal subset)
 *
 * Used by:
 * - Open house "Add to Calendar" button on the listing modal
 * - Showing request confirmation download for visitors
 *
 * Compatible with Apple Calendar, Google Calendar, Outlook, and any
 * standards-compliant CalDAV client.
 */

interface ICSEventInput {
  uid: string
  title: string
  description?: string
  location?: string
  // Local datetime in YYYY-MM-DD + HH:MM (24h) format. We treat as floating time.
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  url?: string
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function nowStamp(): string {
  const d = new Date()
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

// "2026-04-12" + "14:00" → "20260412T140000"
function toLocalStamp(date: string, time: string): string {
  const cleanDate = date.replace(/-/g, '')
  const [h = '00', m = '00'] = time.split(':')
  return `${cleanDate}T${pad(Number(h))}${pad(Number(m))}00`
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildICS(events: ICSEventInput[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Reelst//Open House//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}@reel.st`,
      `DTSTAMP:${nowStamp()}`,
      `DTSTART:${toLocalStamp(ev.startDate, ev.startTime)}`,
      `DTEND:${toLocalStamp(ev.endDate, ev.endTime)}`,
      `SUMMARY:${escapeText(ev.title)}`,
    )
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`)
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`)
    if (ev.url) lines.push(`URL:${ev.url}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── Display helpers ──

// "14:00" → "2:00 PM"
export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  if (Number.isNaN(h)) return time24
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`
}

// "2026-04-12" → "Sat, Apr 12"
export function formatDateShort(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
