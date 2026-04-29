import {
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'

/* ════════════════════════════════════════════════════════════════
   BLOG / "STATE OF REEL ESTATE"
   Firestore-backed CMS data layer. Posts are authored in FireCMS
   (see /cms/firecms.config.tsx) and read here by the public site.
   ════════════════════════════════════════════════════════════════ */

export type PostStatus = 'draft' | 'published' | 'scheduled'

export type PostCategory =
  | 'state-of-reel-estate' // the flagship quarterly franchise
  | 'playbook'             // tactical how-tos for agents
  | 'spotlight'            // agent stories / case studies
  | 'data'                 // standalone data + research pieces
  | 'announcements'        // product launches & milestones

export interface BlogAuthor {
  id: string
  name: string
  avatar: string | null
  bio: string
  twitter?: string | null
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string // markdown source
  coverImage: string | null
  authorId: string | null
  authorName: string | null  // denormalized for list views
  authorAvatar: string | null
  category: PostCategory
  tags: string[]
  status: PostStatus
  featured: boolean
  readTime: number // minutes
  publishedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  seoTitle: string | null
  seoDescription: string | null
  ogImage: string | null
}

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  'state-of-reel-estate': 'State of Reel Estate',
  playbook: 'Playbook',
  spotlight: 'Spotlight',
  data: 'Data',
  announcements: 'Product',
}

export const CATEGORY_ORDER: PostCategory[] = [
  'state-of-reel-estate',
  'playbook',
  'spotlight',
  'data',
  'announcements',
]

/* ─────────────── Queries ─────────────── */

export async function listPublishedPosts(opts?: {
  category?: PostCategory
  limit?: number
}): Promise<BlogPost[]> {
  if (!db) return []
  const filters = [where('status', '==', 'published')]
  if (opts?.category) filters.push(where('category', '==', opts.category))
  const q = query(
    collection(db, 'posts'),
    ...filters,
    orderBy('publishedAt', 'desc'),
    fsLimit(opts?.limit ?? 30),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BlogPost, 'id'>) }))
}

export async function listFeaturedPosts(n = 3): Promise<BlogPost[]> {
  if (!db) return []
  const q = query(
    collection(db, 'posts'),
    where('status', '==', 'published'),
    where('featured', '==', true),
    orderBy('publishedAt', 'desc'),
    fsLimit(n),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BlogPost, 'id'>) }))
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!db) return null
  const q = query(
    collection(db, 'posts'),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    fsLimit(1),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...(d.data() as Omit<BlogPost, 'id'>) }
}

/* ─────────────── Formatting ─────────────── */

export function formatPostDate(ts: Timestamp | null): string {
  if (!ts) return ''
  const d = ts.toDate()
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
