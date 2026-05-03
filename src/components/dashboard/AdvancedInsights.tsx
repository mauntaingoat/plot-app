import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendUp as TrendingUp, Eye, CursorClick as MousePointerClick, BookmarkSimple as Bookmark, HandWaving as Hand, MapPin, Clock, FilmStrip as Film, Image, Radio, CalendarDots as CalendarClock } from '@phosphor-icons/react'
import { getAgentEvents, getSubscriberSnapshots, type AnalyticsEvent, type SubscriberSnapshot } from '@/lib/firestore'
import type { Pin } from '@/lib/types'

// Dismiss tooltip on scroll (mobile fix)
function useDismissOnScroll(setHoverIdx: (v: null) => void) {
  useEffect(() => {
    const handler = () => setHoverIdx(null)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('touchmove', handler, { passive: true })
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('touchmove', handler)
    }
  }, [setHoverIdx])
}

// ── Per-Pin Performance Breakdown ──
type PinMetric = 'taps' | 'saves' | 'waves'

const PIN_METRICS: { id: PinMetric; label: string; icon: typeof Eye }[] = [
  { id: 'taps', label: 'Taps', icon: MousePointerClick },
  { id: 'saves', label: 'Saves', icon: Bookmark },
  { id: 'waves', label: 'Waves', icon: Hand },
]

interface PinBreakdownProps {
  pins: Pin[]
}

export function PinBreakdown({ pins }: PinBreakdownProps) {
  const [metric, setMetric] = useState<PinMetric>('taps')
  const getValue = (p: Pin): number => (metric === 'waves' ? (p.waves || 0) : (p[metric] || 0))
  const sorted = useMemo(
    () => [...pins].sort((a, b) => getValue(b) - getValue(a)).slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pins, metric],
  )
  const max = sorted[0] ? getValue(sorted[0]) : 1
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  useDismissOnScroll(() => setHoverIdx(null))

  const activeMeta = PIN_METRICS.find((m) => m.id === metric)!

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-[14px] font-bold text-ink">Top Pins by {activeMeta.label}</h3>
        <div className="flex items-center bg-cream rounded-full p-0.5 shrink-0">
          {PIN_METRICS.map((m) => {
            const active = m.id === metric
            return (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${active ? 'bg-warm-white text-ink shadow-sm' : 'text-smoke hover:text-ink'}`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-2.5" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        {sorted.map((pin, i) => {
          const value = getValue(pin)
          const pct = max > 0 ? (value / max) * 100 : 0
          return (
            <div
              key={pin.id}
              className="flex items-center gap-3 cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <span className="text-[11px] font-bold text-tangerine/40 font-mono w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-semibold text-ink truncate">{pin.address.split(',')[0]}</p>
                  <span className="text-[12px] font-bold text-ink font-mono ml-2">{value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                    className="h-full bg-gradient-to-r from-tangerine to-ember rounded-full"
                  />
                </div>
              </div>
            </div>
          )
        })}
        {sorted.length === 0 && <p className="text-[12px] text-smoke text-center py-4">No pins yet.</p>}
      </div>
      {/* Cursor-following tooltip — shows all 3 per-pin metrics. */}
      {hoverIdx !== null && sorted[hoverIdx] && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold truncate max-w-[220px]">{sorted[hoverIdx].address}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] opacity-70">{sorted[hoverIdx].taps.toLocaleString()} taps</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{sorted[hoverIdx].saves.toLocaleString()} saves</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{(sorted[hoverIdx].waves || 0).toLocaleString()} waves</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Content Conversion Tracking ──
type ContentMetric = 'visits' | 'taps'

const CONTENT_METRICS: { id: ContentMetric; label: string }[] = [
  { id: 'visits', label: 'Visits' },
  { id: 'taps', label: 'Taps' },
]

interface ContentConversionProps {
  pins: Pin[]
}

export function ContentConversion({ pins }: ContentConversionProps) {
  const [metric, setMetric] = useState<ContentMetric>('visits')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  useDismissOnScroll(() => setHoverIdx(null))

  const stats = useMemo(() => {
    // Aggregate per-content metrics by type. `visits` are stored on
    // each content item as `c.views` (legacy field name — surfaced
    // here as "Visits" since each play is a visit to that content).
    // `taps` are pin-level (a tap opens the pin's listing modal
    // regardless of which content you tapped from), so a content
    // type's tap count is its parent pin's tap count attributed to
    // each content slot. For open-house pins we attribute pin-level
    // views/taps directly.
    // All four content categories are seeded with zeros so the
    // Content Performance row list is stable — every type stays
    // visible even when the agent has no items of that kind, so
    // the layout doesn't shift around as content is added/removed.
    const byType: Record<string, { count: number; visits: number; taps: number }> = {
      reel: { count: 0, visits: 0, taps: 0 },
      live: { count: 0, visits: 0, taps: 0 },
      photo: { count: 0, visits: 0, taps: 0 },
      open_house: { count: 0, visits: 0, taps: 0 },
    }

    for (const pin of pins) {
      if (pin.type === 'for_sale' && 'openHouse' in pin && pin.openHouse) {
        byType.open_house.count += 1
        byType.open_house.visits += pin.views
        byType.open_house.taps += pin.taps
      }
      const tapsPerSlot = pin.content.length > 0 ? Math.round(pin.taps / pin.content.length) : 0
      for (const c of pin.content) {
        if (c.type === 'video_note') continue // legacy type — skip
        const t = byType[c.type] || (byType[c.type] = { count: 0, visits: 0, taps: 0 })
        t.count += 1
        t.visits += c.views || 0
        t.taps += tapsPerSlot
      }
    }

    // Always return all four rows. Empty types render with "0 items"
    // and "0 visits / 0 taps", keeping the section layout consistent.
    return Object.entries(byType).map(([type, s]) => ({ type, ...s }))
  }, [pins])

  const TYPE_META: Record<string, { label: string; icon: typeof Film; color: string }> = {
    reel: { label: 'Reels', icon: Film, color: '#FF6B3D' },
    live: { label: 'Live Streams', icon: Radio, color: '#FF3B30' },
    photo: { label: 'Photos', icon: Image, color: '#34C759' },
    open_house: { label: 'Open Houses', icon: CalendarClock, color: '#FFAA00' },
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-[14px] font-bold text-ink">Content Performance</h3>
        <div className="flex items-center bg-cream rounded-full p-0.5 shrink-0">
          {CONTENT_METRICS.map((m) => {
            const active = m.id === metric
            return (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${active ? 'bg-warm-white text-ink shadow-sm' : 'text-smoke hover:text-ink'}`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-3" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        {stats.map((s, i) => {
          const meta = TYPE_META[s.type] || { label: s.type, icon: Film, color: '#6B7280' }
          const Icon = meta.icon
          const value = metric === 'visits' ? s.visits : s.taps
          return (
            <motion.div
              key={s.type}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="flex items-center gap-3 bg-cream rounded-[14px] p-3 cursor-pointer hover:bg-pearl transition-colors"
            >
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${meta.color}15` }}>
                <Icon size={16} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-ink">{meta.label}</p>
                  <span className="text-[11px] text-smoke font-mono">{s.count} item{s.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] font-semibold text-tangerine">{value.toLocaleString()} {metric}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      {hoverIdx !== null && stats[hoverIdx] && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold">{TYPE_META[stats[hoverIdx].type]?.label || stats[hoverIdx].type}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] opacity-70">{stats[hoverIdx].count} items</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{stats[hoverIdx].visits.toLocaleString()} visits</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{stats[hoverIdx].taps.toLocaleString()} taps</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Geographic Heatmap (placeholder bars showing top cities) ──
interface GeoHeatmapProps {
  pins: Pin[]
  agentId?: string
}

export function GeoHeatmap({ pins, agentId }: GeoHeatmapProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  useDismissOnScroll(() => setHoverIdx(null))

  useEffect(() => {
    if (agentId) getAgentEvents(agentId, 30).then(setEvents).catch(() => {})
  }, [agentId])

  const cities = useMemo(() => {
    const cityMap = new Map<string, number>()
    events.forEach((e) => {
      // Only count profile-visit events — taps/saves/etc. happen
      // anywhere on Reelst (not just on this agent's profile) and
      // would distort the geographic picture of "who's looking at me".
      if (e.type !== 'profile_visit') return
      if (e.city) cityMap.set(e.city, (cityMap.get(e.city) || 0) + 1)
    })
    const sorted = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const topCount = sorted[0]?.[1] || 1
    const total = sorted.reduce((s, [, c]) => s + c, 0) || 1
    return sorted.map(([city, visitors]) => ({
      city: `${city}`,
      visitors,
      pct: Math.round((visitors / topCount) * 100),
      percentage: Math.round((visitors / total) * 100),
    }))
  }, [events])

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Top Visitor Cities</h3>
        <MapPin size={14} className="text-smoke" />
      </div>
      <div className="space-y-2.5" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        {cities.map((c, i) => (
          <div
            key={c.city}
            className="flex items-center gap-3 cursor-pointer"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-semibold text-ink truncate">{c.city}</p>
                <span className="text-[12px] font-bold text-ink font-mono ml-2">{c.visitors.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="h-full bg-gradient-to-r from-listing-blue to-tangerine rounded-full"
                />
              </div>
            </div>
          </div>
        ))}
        {cities.length === 0 && <p className="text-[12px] text-smoke text-center py-4">No visitor data yet.</p>}
      </div>
      {hoverIdx !== null && cities[hoverIdx] && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold">{cities[hoverIdx].city}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{cities[hoverIdx].visitors.toLocaleString()} visitors · {cities[hoverIdx].percentage}% of audience</p>
        </div>
      )}
    </div>
  )
}

// ── Time-of-Day Engagement ──
// Bucketed by VISITOR local hour (`event.hour`). The hour is captured
// at log time from the visitor's wall-clock (`new Date().getHours()`),
// so the chart bars represent when buyers actually opened your link
// in their own time zone — not normalized to the agent's TZ.
interface TimeOfDayProps {
  agentId?: string
}

export function TimeOfDay({ agentId }: TimeOfDayProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  useDismissOnScroll(() => setHoverIdx(null))

  useEffect(() => {
    if (agentId) getAgentEvents(agentId, 30).then(setEvents).catch(() => {})
  }, [agentId])

  const hours = useMemo(() => {
    const counts = Array(24).fill(0)
    events.forEach((e) => {
      if (e.type !== 'profile_visit') return
      if (e.hour >= 0 && e.hour < 24) counts[e.hour]++
    })
    return counts
  }, [events])

  const max = Math.max(...hours, 1)
  const peakHour = hours.indexOf(Math.max(...hours))
  const CHART_HEIGHT = 120

  const formatHour = (h: number) => {
    if (h === 0) return '12 AM'
    if (h === 12) return '12 PM'
    return h > 12 ? `${h - 12} PM` : `${h} AM`
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink">When visitors are active</h3>
          <p className="text-[11px] text-smoke mt-0.5">{max > 1 ? <>Peak hour: <span className="font-bold text-tangerine">{formatHour(peakHour)}</span></> : 'No data yet'}</p>
        </div>
        <Clock size={14} className="text-smoke" />
      </div>
      <div
        className="relative flex items-end gap-[3px]"
        style={{ height: CHART_HEIGHT }}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        {hours.map((value, i) => {
          const barHeightPx = Math.max(4, (value / max) * CHART_HEIGHT)
          const isPeak = i === peakHour
          const isHovered = hoverIdx === i
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ height: '100%' }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barHeightPx }}
                transition={{ duration: 0.5, delay: i * 0.015, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full rounded-t-[3px]"
                style={{
                  background: isHovered || isPeak
                    ? 'linear-gradient(to top, #E8522A, #FF6B3D)'
                    : 'rgba(255, 107, 61, 0.3)',
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[9px] text-ash font-medium">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
      {hoverIdx !== null && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold">{formatHour(hoverIdx)}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{hours[hoverIdx]} active visitors</p>
        </div>
      )}
    </div>
  )
}

// ── Saves over time (cumulative line chart) ──
// `subscriber_snapshots` stores total active subs per agent per day,
// so each data point is already cumulative — the line shows the
// running total over the last 30 days.
interface SaveGrowthProps {
  currentSaves: number
  agentId?: string
}

export function SaveGrowth({ currentSaves, agentId }: SaveGrowthProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [snapshots, setSnapshots] = useState<SubscriberSnapshot[]>([])
  useDismissOnScroll(() => setHoverIdx(null))

  useEffect(() => {
    if (agentId) getSubscriberSnapshots(agentId, 30).then(setSnapshots).catch(() => {})
  }, [agentId])

  const data = useMemo(() => {
    // Always seed with the current live count so the rightmost point
    // reflects "today" even before the daily cron runs. If snapshots
    // exist, they fill in the prior 30 days; otherwise we extend a
    // flat baseline so the chart never collapses to the spike shape.
    if (snapshots.length === 0) {
      return Array(7).fill(currentSaves)
    }
    const points = snapshots.map((s) => s.count)
    const last = points[points.length - 1]
    if (last !== currentSaves) points.push(currentSaves)
    return points
  }, [snapshots, currentSaves])

  if (currentSaves === 0 && snapshots.length === 0) {
    return (
      <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
        <h3 className="text-[14px] font-bold text-ink mb-1">Saves over time</h3>
        <p className="text-[12px] text-smoke">No save data yet. Growth tracking begins once buyers start saving you.</p>
      </div>
    )
  }

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const growth = currentSaves - data[0]
  const growthPct = data[0] > 0 ? ((growth / data[0]) * 100).toFixed(1) : '—'

  const width = 100
  const height = 100
  // Y axis is anchored at 0 so a flat-zero or flat-baseline line sits
  // at the bottom of the chart instead of in the middle. The previous
  // "spike" rendering came from min-anchoring + a single-point dataset
  // bouncing the polyline up to the top.
  const yFor = (v: number) => height - ((v - min) / range) * height
  const points = data.map((v, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2
    return `${x},${yFor(v)}`
  }).join(' ')

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const idx = Math.round(xPct * (data.length - 1))
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)))
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  // Build a flat closed shape: line + horizontal closure to the
  // baseline. If only one data point exists we render a flat
  // horizontal line so the chart reads as "no movement yet" rather
  // than a single peak.
  const isFlat = data.length === 1
  const flatY = isFlat ? yFor(data[0]) : null
  const linePoints = isFlat ? `0,${flatY} ${width},${flatY}` : points
  const fillPoints = isFlat
    ? `0,${height} 0,${flatY} ${width},${flatY} ${width},${height}`
    : `0,${height} ${points} ${width},${height}`

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink">Saves over time</h3>
          <p className="text-[11px] text-smoke mt-0.5">
            <span className="font-bold text-sold-green">+{growth}</span> ({growthPct}%) past 30 days
          </p>
        </div>
        <TrendingUp size={14} className="text-sold-green" />
      </div>
      <div className="relative h-[120px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="grad-saves" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B3D" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FF6B3D" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline fill="url(#grad-saves)" points={fillPoints} />
          <polyline
            fill="none"
            stroke="#FF6B3D"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linePoints}
            vectorEffect="non-scaling-stroke"
          />
          {hoverIdx !== null && !isFlat && (
            <>
              <line
                x1={(hoverIdx / (data.length - 1)) * width}
                y1="0"
                x2={(hoverIdx / (data.length - 1)) * width}
                y2={height}
                stroke="#1A1A1A"
                strokeWidth="0.4"
                strokeDasharray="1,1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={(hoverIdx / (data.length - 1)) * width}
                cy={yFor(data[hoverIdx])}
                r="1.5"
                fill="#FF6B3D"
                stroke="white"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-ash">30 days ago</span>
        <span className="text-[10px] text-ash">Today</span>
      </div>
      {hoverIdx !== null && !isFlat && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold">{data[hoverIdx].toLocaleString()} saves</p>
          <p className="text-[10px] opacity-70 mt-0.5">{Math.round((1 - hoverIdx / (data.length - 1)) * 30)} day{Math.round((1 - hoverIdx / (data.length - 1)) * 30) !== 1 ? 's' : ''} ago</p>
        </div>
      )}
    </div>
  )
}

// (LockedFeature removed — superseded by inline blur-overlay paywall pattern.)
