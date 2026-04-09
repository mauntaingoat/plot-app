import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Eye, MousePointerClick, Bookmark, Lock, Sparkles, MapPin, Clock, Film, Image, Mic } from 'lucide-react'
import type { Pin, ContentItem } from '@/lib/types'

// ── Per-Pin Performance Breakdown ──
interface PinBreakdownProps {
  pins: Pin[]
  metric?: 'views' | 'taps' | 'saves'
}

export function PinBreakdown({ pins, metric = 'views' }: PinBreakdownProps) {
  const sorted = useMemo(() => [...pins].sort((a, b) => b[metric] - a[metric]).slice(0, 10), [pins, metric])
  const max = sorted[0]?.[metric] || 1

  const Icon = metric === 'views' ? Eye : metric === 'taps' ? MousePointerClick : Bookmark

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Top Pins by {metric.charAt(0).toUpperCase() + metric.slice(1)}</h3>
        <Icon size={14} className="text-smoke" />
      </div>
      <div className="space-y-2.5">
        {sorted.map((pin, i) => {
          const value = pin[metric]
          const pct = (value / max) * 100
          return (
            <div key={pin.id} className="flex items-center gap-3">
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
    </div>
  )
}

// ── Content Conversion Tracking ──
interface ContentConversionProps {
  pins: Pin[]
}

export function ContentConversion({ pins }: ContentConversionProps) {
  const stats = useMemo(() => {
    const byType: Record<string, { count: number; views: number; saves: number }> = {
      reel: { count: 0, views: 0, saves: 0 },
      story: { count: 0, views: 0, saves: 0 },
      video_note: { count: 0, views: 0, saves: 0 },
      photo: { count: 0, views: 0, saves: 0 },
    }
    for (const pin of pins) {
      for (const c of pin.content) {
        const t = byType[c.type] || (byType[c.type] = { count: 0, views: 0, saves: 0 })
        t.count += 1
        t.views += c.views
        t.saves += c.saves
      }
    }
    return Object.entries(byType).map(([type, s]) => ({
      type,
      ...s,
      conversionRate: s.views > 0 ? (s.saves / s.views) * 100 : 0,
    })).filter((s) => s.count > 0)
  }, [pins])

  const TYPE_META: Record<string, { label: string; icon: typeof Film; color: string }> = {
    reel: { label: 'Reels', icon: Film, color: '#FF6B3D' },
    story: { label: 'Stories', icon: Image, color: '#A855F7' },
    video_note: { label: 'Video Notes', icon: Mic, color: '#3B82F6' },
    photo: { label: 'Photos', icon: Image, color: '#34C759' },
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Content Performance</h3>
        <span className="text-[11px] text-smoke">By type</span>
      </div>
      <div className="space-y-3">
        {stats.map((s, i) => {
          const meta = TYPE_META[s.type] || { label: s.type, icon: Film, color: '#6B7280' }
          const Icon = meta.icon
          return (
            <motion.div
              key={s.type}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 bg-cream rounded-[14px] p-3"
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
                  <span className="text-[11px] text-smoke">{s.views.toLocaleString()} views</span>
                  <span className="text-[11px] text-smoke">·</span>
                  <span className="text-[11px] font-semibold text-tangerine">{s.conversionRate.toFixed(1)}% save rate</span>
                </div>
              </div>
            </motion.div>
          )
        })}
        {stats.length === 0 && <p className="text-[12px] text-smoke text-center py-4">No content yet.</p>}
      </div>
    </div>
  )
}

// ── Geographic Heatmap (placeholder bars showing top cities) ──
interface GeoHeatmapProps {
  pins: Pin[]
}

export function GeoHeatmap({ pins }: GeoHeatmapProps) {
  // Mock data — would come from view tracking with viewer location
  const cities = useMemo(() => {
    if (pins.length === 0) return []
    return [
      { city: 'Miami, FL', viewers: 1240, pct: 100 },
      { city: 'Fort Lauderdale, FL', viewers: 680, pct: 55 },
      { city: 'New York, NY', viewers: 420, pct: 34 },
      { city: 'Los Angeles, CA', viewers: 280, pct: 23 },
      { city: 'Chicago, IL', viewers: 190, pct: 15 },
      { city: 'Boston, MA', viewers: 145, pct: 12 },
    ]
  }, [pins])

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-ink">Top Viewer Cities</h3>
        <MapPin size={14} className="text-smoke" />
      </div>
      <div className="space-y-2.5">
        {cities.map((c, i) => (
          <div key={c.city} className="flex items-center gap-3">
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
    </div>
  )
}

// ── Time-of-Day Engagement ──
interface TimeOfDayProps {
  pins: Pin[]
}

export function TimeOfDay({ pins }: TimeOfDayProps) {
  // Mock data — 24 hour engagement curve. Real impl would aggregate from event log.
  const hours = useMemo(() => {
    if (pins.length === 0) return Array(24).fill(0)
    // Bell curve peaking at 7-9pm
    return Array.from({ length: 24 }, (_, h) => {
      const peak = 20
      const dist = Math.abs(h - peak)
      const baseline = 30
      const value = baseline + Math.max(0, 100 - dist * dist * 1.5)
      return Math.round(value + (Math.random() - 0.5) * 20)
    })
  }, [pins])

  const max = Math.max(...hours, 1)
  const peakHour = hours.indexOf(Math.max(...hours))

  const formatHour = (h: number) => {
    if (h === 0) return '12a'
    if (h === 12) return '12p'
    return h > 12 ? `${h - 12}p` : `${h}a`
  }

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-ink">When viewers are active</h3>
          <p className="text-[11px] text-smoke mt-0.5">Peak hour: <span className="font-bold text-tangerine">{formatHour(peakHour)}</span></p>
        </div>
        <Clock size={14} className="text-smoke" />
      </div>
      <div className="flex items-end gap-[2px] h-[100px]">
        {hours.map((value, i) => {
          const h = (value / max) * 100
          const isPeak = i === peakHour
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: i * 0.015, ease: [0.25, 0.1, 0.25, 1] }}
                className={`w-full rounded-t-[3px] min-h-[2px] ${isPeak ? 'bg-gradient-to-t from-tangerine to-ember' : 'bg-tangerine/25'}`}
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
    </div>
  )
}

// ── Follower Growth Chart ──
interface FollowerGrowthProps {
  currentFollowers: number
}

export function FollowerGrowth({ currentFollowers }: FollowerGrowthProps) {
  // Mock data — 30 day growth
  const data = useMemo(() => {
    const days = 30
    const start = Math.max(0, currentFollowers - Math.round(currentFollowers * 0.4))
    return Array.from({ length: days }, (_, i) => {
      const progress = i / (days - 1)
      const value = Math.round(start + (currentFollowers - start) * progress + (Math.random() - 0.5) * 20)
      return Math.max(0, value)
    })
  }, [currentFollowers])

  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const growth = currentFollowers - data[0]
  const growthPct = data[0] > 0 ? ((growth / data[0]) * 100).toFixed(1) : '—'

  // SVG path
  const width = 100
  const height = 100
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-warm-white rounded-[18px] border border-border-light p-5">
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
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
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
        </svg>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-ash">30 days ago</span>
        <span className="text-[10px] text-ash">Today</span>
      </div>
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
