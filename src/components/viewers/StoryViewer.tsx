import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Bookmark, Share2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { StoryPin, UserDoc } from '@/lib/types'

interface StoryViewerProps {
  stories: StoryPin[]
  agent: UserDoc
  initialIndex?: number
  onClose: () => void
}

const STORY_DURATION = 5000 // 5 seconds per story

export function StoryViewer({ stories, agent, initialIndex = 0, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const story = stories[currentIndex]

  // Progress timer
  useEffect(() => {
    if (paused) return

    const startTime = Date.now() - (progress * STORY_DURATION)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = elapsed / STORY_DURATION

      if (pct >= 1) {
        // Advance to next story
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((i) => i + 1)
          setProgress(0)
        } else {
          onClose()
        }
      } else {
        setProgress(pct)
      }
    }, 30)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, paused, stories.length, onClose])

  // Reset progress on index change
  useEffect(() => {
    setProgress(0)
  }, [currentIndex])

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    } else {
      setProgress(0)
    }
  }, [currentIndex])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose()
    }
  }

  if (!story) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        className="fixed inset-0 z-[200] bg-black flex flex-col"
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-3 pt-[env(safe-area-inset-top,12px)]">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-[calc(env(safe-area-inset-top,12px)+16px)]">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <Avatar src={agent.photoURL} name={agent.displayName} size={32} ring="story" />
              <div>
                <p className="text-[13px] font-semibold text-white">{agent.displayName}</p>
                <p className="text-[11px] text-white/50">
                  {story.address}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80"
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>

        {/* Media */}
        <div className="flex-1 relative">
          {story.mediaType === 'video' ? (
            <video
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              loop
            />
          ) : (
            <img
              src={story.mediaUrl}
              alt={story.caption}
              className="w-full h-full object-cover"
            />
          )}

          {/* Tap zones */}
          <div
            className="absolute left-0 top-0 w-1/3 h-full z-10"
            onClick={goPrev}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
          />
          <div
            className="absolute right-0 top-0 w-2/3 h-full z-10"
            onClick={goNext}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
          />
        </div>

        {/* Caption + actions */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-[env(safe-area-inset-bottom,24px)]">
          <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 px-4 pb-4">
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0">
                {story.caption && (
                  <p className="text-[14px] text-white leading-relaxed">
                    {story.caption}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-4 ml-4">
                <motion.button whileTap={{ scale: 0.8 }} className="text-white">
                  <Bookmark size={26} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.8 }} className="text-white">
                  <Share2 size={22} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
