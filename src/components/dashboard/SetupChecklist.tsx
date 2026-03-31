import { motion } from 'framer-motion'
import { Check, Camera, User, MapPin, Link2, FileText, Award, Layers } from 'lucide-react'
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

export function SetupChecklist({ isOpen, onClose, user, pinCount }: SetupChecklistProps) {
  const completed = ITEMS.filter((item) => item.check(user, pinCount))
  const percent = completed.reduce((s, i) => s + i.weight, 0)

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Complete your profile">
      <div className="px-5 pb-8 space-y-2">
        {/* Progress bar */}
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
    </DarkBottomSheet>
  )
}
