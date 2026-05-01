import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Camera, User, MapPin, LinkSimple as Link2, FileText, Medal as Award, Stack as Layers, X } from '@phosphor-icons/react'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import type { UserDoc } from '@/lib/types'

interface SetupChecklistProps {
  isOpen: boolean
  onClose: () => void
  user: UserDoc
  pinCount: number
}

const ITEMS = [
  { key: 'username', label: 'Claim a username', icon: User, weight: 10, check: (u: UserDoc) => !!u.username },
  { key: 'photo', label: 'Upload a profile photo', icon: Camera, weight: 15, check: (u: UserDoc) => !!u.photoURL },
  { key: 'name', label: 'Set display name', icon: User, weight: 10, check: (u: UserDoc) => !!u.displayName && u.displayName.length > 0 },
  { key: 'bio', label: 'Write a bio', icon: FileText, weight: 10, check: (u: UserDoc) => !!u.bio && u.bio.length > 0 },
  { key: 'platform', label: 'Connect a platform', icon: Link2, weight: 15, check: (u: UserDoc) => u.platforms.length > 0 },
  { key: 'license', label: 'Verify your license', icon: Award, weight: 10, check: (u: UserDoc) => !!u.licenseNumber },
  { key: 'pin1', label: 'Create your first pin', icon: MapPin, weight: 20, check: (_: UserDoc, pc: number) => pc >= 1 },
  { key: 'pin3', label: 'Create 3 pins', icon: Layers, weight: 10, check: (_: UserDoc, pc: number) => pc >= 3 },
]

function ChecklistContent({ user, pinCount }: { user: UserDoc; pinCount: number }) {
  const completed = ITEMS.filter((item) => item.check(user, pinCount))
  const percent = completed.reduce((s, i) => s + i.weight, 0)

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-white">{percent}% complete</span>
          <span className="text-[12px] text-ghost">{completed.length}/{ITEMS.length} done</span>
        </div>
        <div className="h-2 bg-slate rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-tangerine to-ember"
          />
        </div>
      </div>
      {ITEMS.map((item, i) => {
        const done = item.check(user, pinCount)
        const Icon = item.icon
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex items-center gap-3 p-3 rounded-[14px] ${done ? 'bg-sold-green/10' : 'bg-slate'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-sold-green' : 'bg-charcoal'}`}>
              {done ? <Check size={14} className="text-white" /> : <Icon size={14} className="text-ghost" />}
            </div>
            <span className={`text-[14px] font-medium flex-1 ${done ? 'text-sold-green line-through' : 'text-white'}`}>
              {item.label}
            </span>
            <span className="text-[11px] text-ghost font-mono">+{item.weight}%</span>
          </motion.div>
        )
      })}
    </div>
  )
}

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: MediaQueryListEvent) => setD(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

export function SetupChecklist({ isOpen, onClose, user, pinCount }: SetupChecklistProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/50" onClick={(e) => { e.stopPropagation(); onClose() }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-48px)] max-w-[440px] max-h-[80vh] bg-obsidian rounded-[22px] shadow-2xl overflow-hidden flex flex-col border border-border-dark"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark shrink-0">
                <h2 className="text-[16px] font-extrabold text-white tracking-tight">Complete your profile</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center cursor-pointer hover:bg-slate transition-colors">
                  <X size={15} className="text-ghost" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <ChecklistContent user={user} pinCount={pinCount} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Complete your profile">
      <div className="px-5 pb-8">
        <ChecklistContent user={user} pinCount={pinCount} />
      </div>
    </DarkBottomSheet>
  )
}
