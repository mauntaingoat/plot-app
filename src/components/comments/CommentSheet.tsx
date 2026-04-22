import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { getComments, addComment, deleteComment, type CommentDoc } from '@/lib/firestore'
import { useAuthStore } from '@/stores/authStore'

interface CommentSheetProps {
  isOpen: boolean
  onClose: () => void
  pinId: string
  contentId: string
  pinAgentId: string
  onCountChange?: (count: number) => void
}

export function CommentSheet({ isOpen, onClose, pinId, contentId, pinAgentId, onCountChange }: CommentSheetProps) {
  const { userDoc } = useAuthStore()
  const [comments, setComments] = useState<CommentDoc[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen || !pinId || !contentId) return
    setLoading(true)
    getComments(pinId, contentId).then((docs) => {
      setComments(docs)
      onCountChange?.(docs.length)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [isOpen, pinId, contentId])

  const handlePost = async () => {
    if (!text.trim() || !userDoc || posting) return
    setPosting(true)
    try {
      const id = await addComment({
        pinId,
        contentId,
        pinAgentId,
        authorUid: userDoc.uid,
        authorName: userDoc.displayName || 'Anonymous',
        authorPhotoURL: userDoc.photoURL || null,
        text: text.trim(),
      })
      const newComment: CommentDoc = {
        id,
        pinId,
        contentId,
        pinAgentId,
        authorUid: userDoc.uid,
        authorName: userDoc.displayName || 'Anonymous',
        authorPhotoURL: userDoc.photoURL || null,
        text: text.trim(),
        createdAt: { toMillis: () => Date.now() } as any,
      }
      setComments((prev) => [newComment, ...prev])
      onCountChange?.(comments.length + 1)
      setText('')
    } catch (err) {
      console.error('Post comment failed:', err)
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    onCountChange?.(Math.max(0, comments.length - 1))
    await deleteComment(commentId).catch(() => {})
  }

  const canDelete = (comment: CommentDoc) => {
    if (!userDoc) return false
    return comment.authorUid === userDoc.uid || comment.pinAgentId === userDoc.uid
  }

  const timeAgo = (ts: any) => {
    if (!ts) return ''
    const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : ts
    const diff = Date.now() - ms
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return `${Math.floor(days / 7)}w`
  }

  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title={`Comments (${comments.length})`}>
      <div className="flex flex-col" style={{ maxHeight: '60vh' }}>
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-tangerine/30 border-t-tangerine rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[13px] text-ghost text-center py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex gap-3">
                <Avatar src={comment.authorPhotoURL} name={comment.authorName} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white">{comment.authorName}</span>
                    <span className="text-[11px] text-ghost">{timeAgo(comment.createdAt)}</span>
                    {comment.authorUid === pinAgentId && (
                      <span className="text-[9px] font-bold text-tangerine bg-tangerine/15 px-1.5 py-0.5 rounded-full">Author</span>
                    )}
                  </div>
                  <p className="text-[13px] text-mist mt-0.5 leading-relaxed">{comment.text}</p>
                </div>
                {canDelete(comment) && (
                  <button onClick={() => handleDelete(comment.id)}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-ghost hover:text-live-red hover:bg-live-red/10 cursor-pointer transition-colors self-start mt-1">
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>

        {userDoc && (
          <div className="px-5 pb-6 pt-3 border-t border-white/6">
            <div className="flex items-center gap-2">
              <Avatar src={userDoc.photoURL} name={userDoc.displayName} size={28} />
              <div className="flex-1 flex items-center bg-slate rounded-full px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Add a comment..."
                  value={text}
                  maxLength={500}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder:text-ghost outline-none"
                />
                <button onClick={handlePost} disabled={!text.trim() || posting}
                  className={`ml-2 shrink-0 ${text.trim() ? 'text-tangerine cursor-pointer' : 'text-ghost'}`}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DarkBottomSheet>
  )
}
