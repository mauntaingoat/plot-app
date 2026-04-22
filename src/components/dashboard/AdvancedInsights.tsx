import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Eye, MousePointerClick, Bookmark, Lock, Sparkles, MapPin, Clock, Film, Image, Radio, CalendarClock } from 'lucide-react'
import { getAgentEvents, getFollowerSnapshots, type AnalyticsEvent, type FollowerSnapshot } from '@/lib/firestore'
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
interface PinBreakdownProps {
  pins: Pin[]
  metric?: 'views' | 'taps' | 'saves'
}

export function PinBreakdown({ pins, metric = 'views' }: PinBreakdownProps) {
  const sorted = useMemo(() => [...pins].sort((a, b) => b[metric] - a[metric]).slice(0, 10), [pins, metric])
  const max = sorted[0]?.[metric] || 1
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  useDismissOnScroll(() => setHoverIdx(null))

  const Icon = metric === 'views' ? Eye : metric === 'taps' ? MousePointerClick : Bookmark

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Top Pins by {metric.charAt(0).toUpperCase() + metric.slice(1)}</h3>
        <Icon size={14} className="text-smoke" />
      </div>
      <div className="space-y-2.5" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        {sorted.map((pin, i) => {
          const value = pin[metric]
          const pct = (value / max) * 100
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
      {/* Cursor-following tooltip */}
      {hoverIdx !== null && sorted[hoverIdx] && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold truncate max-w-[220px]">{sorted[hoverIdx].address}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] opacity-70">{sorted[hoverIdx].views.toLocaleString()} views</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{sorted[hoverIdx].taps.toLocaleString()} taps</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{sorted[hoverIdx].saves.toLocaleString()} saves</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Content Conversion Tracking ──
interface ContentConversionProps {
  pins: Pin[]
}

export function ContentConversion({ pins }: ContentConversionProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  useDismissOnScroll(() => setHoverIdx(null))

  const stats = useMemo(() => {
    const byType: Record<string, { count: number; views: number; saves: number }> = {
      reel: { count: 0, views: 0, saves: 0 },
      live: { count: 0, views: 0, saves: 0 },
      photo: { count: 0, views: 0, saves: 0 },
    }
    let openHouseCount = 0
    let openHouseViews = 0
    let openHouseSaves = 0

    for (const pin of pins) {
      // Count open houses as a category (from for_sale pins with openHouse set)
      if (pin.type === 'for_sale' && 'openHouse' in pin && pin.openHouse) {
        openHouseCount += 1
        openHouseViews += pin.views
        openHouseSaves += pin.saves
      }
      for (const c of pin.content) {
        if (c.type === 'video_note') continue // skip — removed
        const t = byType[c.type] || (byType[c.type] = { count: 0, views: 0, uniqueViews: 0, saves: 0 })
        t.count += 1
        t.views += c.views || 0
        t.uniqueViews += c.uniqueViews || 0
        t.saves += c.saves || 0
      }
    }

    if (openHouseCount > 0) {
      byType.open_house = { count: openHouseCount, views: openHouseViews, saves: openHouseSaves }
    }

    return Object.entries(byType).map(([type, s]) => ({
      type,
      ...s,
      conversionRate: s.uniqueViews > 0 ? (s.saves / s.uniqueViews) * 100 : 0,
    })).filter((s) => s.count > 0)
  }, [pins])

  const TYPE_META: Record<string, { label: string; icon: typeof Film; color: string }> = {
    reel: { label: 'Reels', icon: Film, color: '#FF6B3D' },
    live: { label: 'Live Streams', icon: Radio, color: '#FF3B30' },
    photo: { label: 'Photos', icon: Image, color: '#34C759' },
    open_house: { label: 'Open Houses', icon: CalendarClock, color: '#FFAA00' },
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Content Performance</h3>
        <span className="text-[11px] text-smoke">By type</span>
      </div>
      <div className="space-y-3" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
        {stats.map((s, i) => {
          const meta = TYPE_META[s.type] || { label: s.type, icon: Film, color: '#6B7280' }
          const Icon = meta.icon
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
                  <span className="text-[11px] text-smoke">{(s.views || 0).toLocaleString()} views ({(s.uniqueViews || 0).toLocaleString()} unique)</span>
                  <span className="text-[11px] text-smoke">·</span>
                  <span className="text-[11px] font-semibold text-tangerine">{(s.conversionRate || 0).toFixed(1)}% save rate</span>
                </div>
              </div>
            </motion.div>
          )
        })}
        {stats.length === 0 && <p className="text-[12px] text-smoke text-center py-4">No content yet.</p>}
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
            <span className="text-[10px] opacity-70">{stats[hoverIdx].views.toLocaleString()} views</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="text-[10px] opacity-70">{stats[hoverIdx].saves.toLocaleString()} saves</span>
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
      if (e.city) cityMap.set(e.city, (cityMap.get(e.city) || 0) + 1)
    })
    const sorted = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const topCount = sorted[0]?.[1] || 1
    const total = sorted.reduce((s, [, c]) => s + c, 0) || 1
    return sorted.map(([city, viewers]) => ({
      city: `${city}`,
      viewers,
      pct: Math.round((viewers / topCount) * 100),
      percentage: Math.round((viewers / total) * 100),
    }))
  }, [events])

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Top Viewer Cities</h3>
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
                <span className="text-[12px] font-bold text-ink font-mono ml-2">{c.viewers.toLocaleString()}</span>
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
        {cities.length === 0 && <p className="text-[12px] text-smoke text-center py-4">No view data yet.</p>}
      </div>
      {hoverIdx !== null && cities[hoverIdx] && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold">{cities[hoverIdx].city}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{cities[hoverIdx].viewers.toLocaleString()} viewers · {cities[hoverIdx].percentage}% of audience</p>
        </div>
      )}
    </div>
  )
}

// ── Time-of-Day Engagement ──
interface TimeOfDayProps {
  pins: Pin[]
  agentId?: string
}

export function TimeOfDay({ pins, agentId }: TimeOfDayProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  useDismissOnScroll(() => setHoverIdx(null))

  useEffect(() => {
    if (agentId) getAgentEvents(agentId, 30).then(setEvents).catch(() => {})
  }, [agentId])

  const hours = useMemo(() => {
    const counts = Array(24).fill(0)
    events.forEach((e) => { if (e.hour >= 0 && e.hour < 24) counts[e.hour]++ })
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
          <h3 className="text-[14px] font-bold text-ink">When viewers are active</h3>
          <p className="text-[11px] text-smoke mt-0.5">Peak hour: <span className="font-bold text-tangerine">{formatHour(peakHour)}</span></p>
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
          <p className="text-[10px] opacity-70 mt-0.5">{hours[hoverIdx]} active viewers</p>
        </div>
      )}
    </div>
  )
}

// ── Follower Growth Chart ──
interface FollowerGrowthProps {
  currentFollowers: number
  agentId?: string
}

export function FollowerGrowth({ currentFollowers, agentId }: FollowerGrowthProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [snapshots, setSnapshots] = useState<FollowerSnapshot[]>([])
  useDismissOnScroll(() => setHoverIdx(null))

  useEffect(() => {
    if (agentId) getFollowerSnapshots(agentId, 30).then(setSnapshots).catch(() => {})
  }, [agentId])

  const data = useMemo(() => {
    if (snapshots.length > 0) return snapshots.map((s) => s.count)
    if (currentFollowers === 0) return []
    return [currentFollowers]
  }, [snapshots, currentFollowers])

  if (data.length === 0) {
    return (
      <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
        <h3 className="text-[14px] font-bold text-ink mb-1">Follower Growth</h3>
        <p className="text-[12px] text-smoke">No follower data yet. Growth tracking begins once you gain followers.</p>
      </div>
    )
  }

  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const growth = currentFollowers - data[0]
  const growthPct = data[0] > 0 ? ((growth / data[0]) * 100).toFixed(1) : '—'

  const width = 100
  const height = 100
  const points = data.map((v, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  // Helper for chart hover — figure out which day index the cursor is over
  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const idx = Math.round(xPct * (data.length - 1))
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)))
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink">Follower Growth</h3>
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
            <linearGradient id="grad-followers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B3D" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FF6B3D" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            fill="url(#grad-followers)"
            points={`0,${height} ${points} ${width},${height}`}
          />
          <polyline
            fill="none"
            stroke="#FF6B3D"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            vectorEffect="non-scaling-stroke"
          />
          {hoverIdx !== null && (
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
                cy={height - ((data[hoverIdx] - min) / range) * height}
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
      {hoverIdx !== null && (
        <div
          className="fixed pointer-events-none z-[100] px-3 py-2 bg-ink text-warm-white rounded-[10px] shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="text-[11px] font-bold">{data[hoverIdx].toLocaleString()} followers</p>
          <p className="text-[10px] opacity-70 mt-0.5">{30 - hoverIdx} day{30 - hoverIdx !== 1 ? 's' : ''} ago</p>
        </div>
      )}
    </div>
  )
}

// ── Locked overlay for Free tier ──
interface LockedFeatureProps {
  title: string
  description: string
  onUpgrade: () => void
}

export function LockedFeature({ title, description, onUpgrade }: LockedFeatureProps) {
  return (
    <div className="bg-cream rounded-[18px] border border-border-light p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-tangerine/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="w-12 h-12 rounded-[14px] bg-tangerine/10 flex items-center justify-center mx-auto mb-3">
          <Lock size={20} className="text-tangerine" />
        </div>
        <h3 className="text-[15px] font-bold text-ink mb-1">{title}</h3>
        <p className="text-[12px] text-smoke mb-4 max-w-[240px] mx-auto">{description}</p>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-tangerine to-ember text-white text-[12px] font-bold cursor-pointer hover:shadow-glow-tangerine transition-shadow"
        >
          <Sparkles size={12} /> Upgrade to Pro
        </button>
      </div>
    </div>
  )
}
