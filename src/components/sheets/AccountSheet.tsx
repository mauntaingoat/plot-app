import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Camera, ChevronRight, Crown, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { useAuthStore } from '@/stores/authStore'
import { getUserTier, TIERS } from '@/lib/tiers'
import type { UserDoc } from '@/lib/types'

interface AccountSheetProps {
  isOpen: boolean
  onClose: () => void
  onSignOut: () => void
  onNavigatePricing: () => void
  isDesktop?: boolean
}

export function AccountSheet({ isOpen, onClose, onSignOut, onNavigatePricing, isDesktop }: AccountSheetProps) {
  const { userDoc, setUserDoc } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(userDoc?.displayName || '')
  const [bio, setBio] = useState(userDoc?.bio || '')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!userDoc) return null
  const tier = getUserTier(userDoc)
  const tierInfo = TIERS[tier]

  const handleSave = async () => {
    setSaving(true)
    try {
      const { updateUserDoc } = await import('@/lib/firestore')
      await updateUserDoc(userDoc.uid, { displayName: name.trim(), bio: bio.trim() })
      setUserDoc({ ...userDoc, displayName: name.trim(), bio: bio.trim() })
      setEditMode(false)
    } catch {} finally { setSaving(false) }
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { uploadFile, avatarPath } = await import('@/lib/storage')
      const url = await uploadFile({ path: avatarPath(userDoc.uid), file })
      const { updateUserDoc } = await import('@/lib/firestore')
      await updateUserDoc(userDoc.uid, { photoURL: url })
      setUserDoc({ ...userDoc, photoURL: url })
    } catch {}
  }

  const content = (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

      {/* Profile header */}
      <div className="flex items-center gap-3">
        <button onClick={() => fileRef.current?.click()} className="relative cursor-pointer group shrink-0">
          <Avatar src={userDoc.photoURL} name={userDoc.displayName} size={48} />
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={16} className="text-white" />
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white truncate">{userDoc.displayName}</p>
          <div className="flex items-center gap-2">
            <p className="text-[12px] text-ghost truncate">@{userDoc.username}</p>
            {!editMode && (
              <button onClick={() => { setName(userDoc.displayName || ''); setBio(userDoc.bio || ''); setEditMode(true) }}
                className="text-[11px] font-semibold text-tangerine cursor-pointer hover:underline">Edit</button>
            )}
          </div>
        </div>
      </div>

      {editMode ? (
        <div className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name"
            className="w-full px-4 py-2.5 rounded-xl bg-slate border border-border-dark text-[14px] text-white outline-none" />
          <textarea value={bio} onChange={(e) => { if (e.target.value.length <= 250) setBio(e.target.value) }}
            rows={2} placeholder="Bio"
            className="w-full px-4 py-2.5 rounded-xl bg-slate border border-border-dark text-[14px] text-white outline-none resize-none" />
          <div className="flex gap-2">
            <Button variant="glass" size="sm" fullWidth onClick={() => setEditMode(false)}>Cancel</Button>
            <Button variant="primary" size="sm" fullWidth loading={saving} onClick={handleSave}>Save</Button>
          </div>
        </div>
      ) : (
        userDoc.bio && <p className="text-[13px] text-mist leading-relaxed">{userDoc.bio}</p>
      )}

      {/* Subscription */}
      <button onClick={onNavigatePricing}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate cursor-pointer hover:bg-charcoal transition-colors">
        <Crown size={16} className="text-tangerine shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-[13px] font-semibold text-white">{tierInfo.name} plan</p>
          <p className="text-[11px] text-ghost">{tier === 'free' ? 'Upgrade for more' : `$${tierInfo.price}/mo`}</p>
        </div>
        <ChevronRight size={14} className="text-ghost" />
      </button>

      {/* Sign out */}
      <button onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-ghost text-[13px] font-medium cursor-pointer hover:text-live-red hover:bg-live-red/5 transition-colors">
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  )

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-obsidian rounded-2xl shadow-2xl border border-border-dark w-[360px] p-5">
              <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-charcoal flex items-center justify-center cursor-pointer text-ghost hover:text-white z-10">
                <X size={14} />
              </button>
              <div className="pt-2">{content}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Your Account">
      <div className="px-5 pb-8">{content}</div>
    </DarkBottomSheet>
  )
}
