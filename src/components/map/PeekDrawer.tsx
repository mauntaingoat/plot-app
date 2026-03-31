import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion'
import { useCallback, type ReactNode } from 'react'
import { useMapStore } from '@/stores/mapStore'

// Snap points as vh offsets from bottom
const SNAP_COLLAPSED = 90  // px visible
const SNAP_HALF = 50       // % of viewport
const SNAP_FULL = 8        // % from top

interface PeekDrawerProps {
  children: ReactNode
  collapsedContent?: ReactNode
}

export function PeekDrawer({ children, collapsedContent }: PeekDrawerProps) {
  const { drawerSnap, setDrawerSnap } = useMapStore()

  const snapToY = (snap: 'collapsed' | 'half' | 'full') => {
    switch (snap) {
      case 'collapsed': return window.innerHeight - SNAP_COLLAPSED
      case 'half': return window.innerHeight * (SNAP_HALF / 100)
      case 'full': return window.innerHeight * (SNAP_FULL / 100)
    }
  }

  const y = useMotionValue(snapToY(drawerSnap))
  const borderRadius = useTransform(y, [snapToY('full'), snapToY('collapsed')], [24, 24])

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = y.get()
    const velocity = info.velocity.y

    // Fast swipe
    if (Math.abs(velocity) > 500) {
      if (velocity < 0) {
        // Swiping up
        const target = drawerSnap === 'collapsed' ? 'half' : 'full'
        setDrawerSnap(target)
        animate(y, snapToY(target), { type: 'spring', damping: 28, stiffness: 300 })
      } else {
        // Swiping down
        const target = drawerSnap === 'full' ? 'half' : 'collapsed'
        setDrawerSnap(target)
        animate(y, snapToY(target), { type: 'spring', damping: 28, stiffness: 300 })
      }
      return
    }

    // Snap to nearest
    const snapPoints = [
      { snap: 'collapsed' as const, y: snapToY('collapsed') },
      { snap: 'half' as const, y: snapToY('half') },
      { snap: 'full' as const, y: snapToY('full') },
    ]

    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr.y - currentY) < Math.abs(prev.y - currentY) ? curr : prev
    )

    setDrawerSnap(closest.snap)
    animate(y, closest.y, { type: 'spring', damping: 28, stiffness: 300 })
  }, [y, drawerSnap, setDrawerSnap])

  // Snap on state change from external sources
  const targetY = snapToY(drawerSnap)

  return (
    <motion.div
      style={{ y, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }}
      animate={{ y: targetY }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: snapToY('full'), bottom: snapToY('collapsed') }}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      className="
        fixed left-0 right-0 z-[50]
        bg-obsidian border-t border-border-dark
        shadow-xl
      "
      initial={{ y: snapToY('collapsed') }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none">
        <div className="w-9 h-[5px] rounded-full bg-charcoal" />
      </div>

      {/* Collapsed preview */}
      {drawerSnap === 'collapsed' && collapsedContent && (
        <div className="px-4 pb-3">
          {collapsedContent}
        </div>
      )}

      {/* Full content */}
      <div
        className="overflow-y-auto overscroll-contain"
        style={{ height: `calc(100vh - ${SNAP_FULL}vh - 40px)` }}
      >
        {children}
      </div>
    </motion.div>
  )
}
