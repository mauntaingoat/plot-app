import { motion } from 'framer-motion'
import { Play, Radio, Eye } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { PIN_CONFIG, type Pin, type UserDoc, type StoryPin, type ReelPin } from '@/lib/types'

interface ContentFeedProps {
  pins: Pin[]
  agent: UserDoc
  onPinClick: (pin: Pin) => void
}

export function ContentFeed({ pins, agent, onPinClick }: ContentFeedProps) {
  // Show only stories, reels, and live pins
  const contentPins = pins.filter((p) => p.type === 'story' || p.type === 'reel' || p.type === 'live')

  if (contentPins.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[16px] font-semibold text-ink mb-1">No content yet</p>
          <p className="text-[14px] text-smoke">This agent hasn't posted stories or reels.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain bg-ivory">
      <div className="px-4 py-4 space-y-4">
        {/* Stories row */}
        {pins.some((p) => p.type === 'story') && (
          <div>
            <h3 className="text-[14px] font-bold text-ink mb-3 px-1">Stories</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {pins.filter((p): p is StoryPin => p.type === 'story').map((pin) => (
                <motion.button
                  key={pin.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onPinClick(pin)}
                  className="shrink-0 w-[100px] cursor-pointer"
                >
                  <div className="w-[100px] h-[140px] rounded-[16px] overflow-hidden relative">
                    <img src={pin.mediaUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] text-white font-medium line-clamp-2">{pin.caption}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center mt-1.5">
                    <div className="story-ring">
                      <div className="story-ring-inner">
                        <Avatar src={agent.photoURL} name={agent.displayName} size={24} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Reels + Live grid */}
        <div>
          <h3 className="text-[14px] font-bold text-ink mb-3 px-1">Reels & Live</h3>
          <div className="grid grid-cols-2 gap-3">
            {pins.filter((p) => p.type === 'reel' || p.type === 'live').map((pin) => (
              <motion.button
                key={pin.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => onPinClick(pin)}
                className="relative aspect-[9/14] rounded-[18px] overflow-hidden bg-charcoal cursor-pointer"
              >
                {'thumbnailUrl' in pin && pin.thumbnailUrl && (
                  <img src={pin.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Badge */}
                <div className="absolute top-2 left-2">
                  {pin.type === 'live' ? (
                    <Badge variant="live" pulse>
                      <Radio size={10} /> LIVE
                    </Badge>
                  ) : (
                    <Badge variant="reel">
                      <Play size={10} /> Reel
                    </Badge>
                  )}
                </div>

                {/* Views */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <Eye size={12} className="text-white/70" />
                  <span className="text-[11px] text-white/70 font-semibold">{pin.views.toLocaleString()}</span>
                </div>

                {/* Duration */}
                {'duration' in pin && (
                  <div className="absolute bottom-2 right-2">
                    <span className="text-[10px] text-white/70 font-mono font-semibold">
                      {Math.floor(pin.duration / 60)}:{String(pin.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}

                {/* Viewer count for live */}
                {'viewerCount' in pin && (
                  <div className="absolute top-2 right-2">
                    <span className="glass-dark rounded-md px-1.5 py-0.5 text-[10px] text-white font-bold">{pin.viewerCount}</span>
                  </div>
                )}

                {/* Caption */}
                {'caption' in pin && pin.caption && (
                  <div className="absolute bottom-8 left-2 right-2">
                    <p className="text-[11px] text-white font-medium line-clamp-2">{pin.caption}</p>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
