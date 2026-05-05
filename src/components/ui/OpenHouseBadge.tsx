import { CalendarDots } from '@phosphor-icons/react'

/**
 * Static rainbow conic gradient — mirrors the open-house map pin's
 * outer ring (createOpenHousePin in MapCanvas.tsx). Keeping this in
 * one place means a future palette tweak on the map ring updates the
 * card / sheet badges automatically.
 */
export const OPEN_HOUSE_RAINBOW =
  'conic-gradient(from -90deg, #FF6B3D 0%, #FFD089 16%, #34C759 33%, #3B82F6 50%, #A855F7 66%, #FF3B7A 83%, #FF6B3D 100%)'

interface OpenHouseBadgeProps {
  variant?: 'icon' | 'pill'
  size?: number
  /** Inner color behind the icon. Defaults to white so the badge reads
   *  on photos and dark cards alike. Pass 'dark' on truly white surfaces
   *  to mimic the map-pin treatment. */
  inner?: 'light' | 'dark'
  className?: string
}

export function OpenHouseBadge({ variant = 'icon', size = 26, inner = 'light', className = '' }: OpenHouseBadgeProps) {
  const innerBg = inner === 'dark' ? '#0A0E17' : '#FFFFFF'
  const iconColor = inner === 'dark' ? '#FFFFFF' : '#1A1A1A'

  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center rounded-full ${className}`}
        style={{
          padding: '1.5px',
          background: OPEN_HOUSE_RAINBOW,
        }}
      >
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: innerBg }}
        >
          <CalendarDots size={11} weight="fill" style={{ color: iconColor }} />
          <span className="text-[10.5px] font-bold tracking-wide" style={{ color: iconColor }}>
            Open House
          </span>
        </span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        padding: 1.5,
        background: OPEN_HOUSE_RAINBOW,
        boxShadow: '0 2px 6px -1px rgba(0,0,0,0.18)',
      }}
      aria-label="Open house"
    >
      <span
        className="w-full h-full rounded-full inline-flex items-center justify-center"
        style={{ background: innerBg }}
      >
        <CalendarDots size={size * 0.55} weight="fill" style={{ color: iconColor }} />
      </span>
    </span>
  )
}
