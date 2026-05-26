/**
 * Small circular badge with a rainbow ring + CalendarDots icon —
 * iOS port of web `src/components/ui/OpenHouseBadge.tsx`. Rendered
 * on the top-right of for-sale pin cards when an open house is
 * scheduled, matching the map-pin rainbow ring treatment.
 *
 * The web uses CSS `conic-gradient` for the ring. RN doesn't support
 * conic gradients natively, so we draw six colored arcs with
 * react-native-svg approximating the same rotation.
 */
import { View, StyleSheet } from 'react-native'
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg'
import { CalendarDots } from 'phosphor-react-native'

const RING_COLORS = [
  '#FF6B3D', // tangerine (0°)
  '#FFD089', // peach (60°)
  '#34C759', // green (120°)
  '#3B82F6', // blue (180°)
  '#A855F7', // purple (240°)
  '#FF3B7A', // pink (300°)
]

/** Build an SVG arc path for a slice of the rainbow ring. Each
 *  segment is 60° wide; the ring sits between radius `r-stroke/2` and
 *  `r+stroke/2`. Starts at -90° (top) like the web version. */
function buildArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const startRad = (startDeg * Math.PI) / 180
  const endRad = (endDeg * Math.PI) / 180
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
}

interface Props {
  /** Outer diameter in px. Defaults to 26 (matches web). */
  size?: number
}

export function OpenHouseBadge({ size = 26 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const ringStroke = Math.max(2, size * 0.085)
  const ringR = cx - ringStroke / 2
  const innerR = ringR - ringStroke / 2

  return (
    <View
      style={{
        width: size,
        height: size,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 6 colored arcs that together form the rainbow ring. Start
            at -90° (top) so the first color sits at 12 o'clock — same
            as the web `from -90deg` conic-gradient. */}
        {RING_COLORS.map((color, i) => {
          const startDeg = -90 + i * 60
          const endDeg = startDeg + 60.5 // 0.5° overlap so segment seams disappear
          return (
            <Path
              key={i}
              d={buildArc(cx, cy, ringR, startDeg, endDeg)}
              stroke={color}
              strokeWidth={ringStroke}
              strokeLinecap="butt"
              fill="none"
            />
          )
        })}
        {/* White inner disc */}
        <SvgCircle cx={cx} cy={cy} r={innerR} fill="#FFFFFF" />
      </Svg>
      <View
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        pointerEvents="none"
      >
        <CalendarDots size={Math.round(size * 0.55)} color="#1A1A1A" weight="fill" />
      </View>
    </View>
  )
}
