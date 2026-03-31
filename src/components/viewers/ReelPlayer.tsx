import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { Heart, MessageCircle, Bookmark, Share2, Music2, X } from 'lucide-react'
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
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setPlaying(!playing)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 300) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="fixed inset-0 z-[200] bg-black"
      >
        {/* Video */}
        <video
          ref={videoRef}
          src={reel.mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          playsInline
          autoPlay
          onClick={togglePlay}
        />

        {/* Play/Pause indicator */}
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

        {/* Close button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onClose}
          className="absolute top-[env(safe-area-inset-top,12px)] right-4 z-20 mt-3 w-9 h-9 rounded-full glass-dark flex items-center justify-center text-white"
        >
          <X size={18} />
        </motion.button>

        {/* Right sidebar - TikTok style */}
        <div className="absolute right-3 bottom-[20%] z-10 flex flex-col items-center gap-5">
          {/* Agent avatar */}
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

          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.75 }}
            onClick={() => setLiked(!liked)}
            className="flex flex-col items-center gap-0.5"
          >
            <Heart
              size={28}
              className={liked ? 'text-live-red fill-live-red' : 'text-white'}
            />
            <span className="text-[11px] text-white font-semibold">
              {(reel.saves + (liked ? 1 : 0)).toLocaleString()}
            </span>
          </motion.button>

          {/* Comment */}
          <motion.button
            whileTap={{ scale: 0.75 }}
            className="flex flex-col items-center gap-0.5"
          >
            <MessageCircle size={28} className="text-white" />
            <span className="text-[11px] text-white font-semibold">0</span>
          </motion.button>

          {/* Bookmark */}
          <motion.button
            whileTap={{ scale: 0.75 }}
            onClick={() => setSaved(!saved)}
            className="flex flex-col items-center gap-0.5"
          >
            <Bookmark
              size={26}
              className={saved ? 'text-open-amber fill-open-amber' : 'text-white'}
            />
            <span className="text-[11px] text-white font-semibold">
              {(reel.saves + (saved ? 1 : 0)).toLocaleString()}
            </span>
          </motion.button>

          {/* Share */}
          <motion.button
            whileTap={{ scale: 0.75 }}
            className="flex flex-col items-center gap-0.5"
          >
            <Share2 size={24} className="text-white" />
            <span className="text-[11px] text-white font-semibold">Share</span>
          </motion.button>

          {/* Spinning music disc */}
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
              {isFollowing && (
                <span className="text-[11px] text-white/50 border border-white/20 rounded-sm px-1.5 py-0.5">Following</span>
              )}
            </div>
            {reel.caption && (
              <p className="text-[13px] text-white/90 leading-relaxed line-clamp-3">
                {reel.caption}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-white/60">
              <Music2 size={12} />
              <span className="text-[11px]">Original audio</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
