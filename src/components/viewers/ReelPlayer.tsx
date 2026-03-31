import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion'
import { MessageCircle, Bookmark, Share2, Music2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { ReelPin, UserDoc } from '@/lib/types'

interface ReelPlayerProps {
  reel: ReelPin
  agent: UserDoc
  onClose: () => void
  onFollow?: () => void
  isFollowing?: boolean
}

export function ReelPlayer({ reel, agent, onClose, onFollow, isFollowing }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [saved, setSaved] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [visible, setVisible] = useState(true)
  const closingRef = useRef(false)
  const y = useMotionValue(0)

  useEffect(() => {
    if (videoRef.current) videoRef.current.play().catch(() => {})
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) videoRef.current.pause()
    else videoRef.current.play()
    setPlaying(!playing)
  }

  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    animate(y, window.innerHeight, {
      type: 'tween',
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1],
      onComplete: () => {
        setVisible(false)
        onClose()
      },
    })
  }, [onClose, y])

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 300) {
      dismiss()
    } else {
      animate(y, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' })
    }
  }

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      style={{ y }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.3 }}
      onDragEnd={handleDragEnd}
      className="fixed inset-0 z-[200] bg-black"
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.mediaUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop playsInline autoPlay
        onClick={togglePlay}
      />

      {/* Play/Pause */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-l-[18px] border-l-white border-y-[12px] border-y-transparent ml-1.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={dismiss}
        className="absolute top-[env(safe-area-inset-top,12px)] right-4 z-20 mt-3 w-9 h-9 rounded-full glass-dark flex items-center justify-center text-white"
      >
        <X size={18} />
      </motion.button>

      {/* Right sidebar */}
      <div className="absolute right-3 bottom-[20%] z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <Avatar src={agent.photoURL} name={agent.displayName} size={44} ring="story" />
          {!isFollowing && (
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={onFollow}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-tangerine flex items-center justify-center"
            >
              <span className="text-white text-[14px] font-bold leading-none">+</span>
            </motion.button>
          )}
        </div>

        <motion.button whileTap={{ scale: 0.75 }} onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-0.5">
          <Bookmark size={28} className={saved ? 'text-tangerine fill-tangerine' : 'text-white'} />
          <span className="text-[11px] text-white font-semibold">{(reel.saves + (saved ? 1 : 0)).toLocaleString()}</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.75 }} className="flex flex-col items-center gap-0.5">
          <MessageCircle size={28} className="text-white" />
          <span className="text-[11px] text-white font-semibold">0</span>
        </motion.button>

        <motion.button whileTap={{ scale: 0.75 }} className="flex flex-col items-center gap-0.5">
          <Share2 size={24} className="text-white" />
          <span className="text-[11px] text-white font-semibold">Share</span>
        </motion.button>

        <motion.div
          animate={{ rotate: playing ? 360 : 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full bg-charcoal border-2 border-ghost flex items-center justify-center"
        >
          <Music2 size={14} className="text-white" />
        </motion.div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-10 pb-[env(safe-area-inset-bottom,24px)]">
        <div className="bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-24 px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[15px] font-bold text-white">{agent.displayName}</p>
            {isFollowing && <span className="text-[11px] text-white/50 border border-white/20 rounded-sm px-1.5 py-0.5">Following</span>}
          </div>
          {reel.caption && <p className="text-[13px] text-white/90 leading-relaxed line-clamp-3">{reel.caption}</p>}
          <div className="flex items-center gap-1.5 mt-2 text-white/60">
            <Music2 size={12} />
            <span className="text-[11px]">Original audio</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
