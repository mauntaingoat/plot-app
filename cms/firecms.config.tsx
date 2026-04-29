/* ════════════════════════════════════════════════════════════════
   FireCMS — admin schema for the Reelst blog
   ────────────────────────────────────────────────────────────────
   This file is consumed by a separate FireCMS deployment (cloud or
   self-hosted) — it is NOT imported by the public Reelst React app.
   See ./README.md for deploy instructions.
   ──────────────────────────────────────────────────────────────── */

import { buildCollection, buildProperty } from 'firecms'

// Mirror of /src/lib/blog.ts — kept inline so this config can be
// deployed standalone without sharing source with the main app.
type PostStatus = 'draft' | 'published' | 'scheduled'
type PostCategory =
  | 'state-of-reel-estate'
  | 'playbook'
  | 'spotlight'
  | 'data'
  | 'announcements'

interface BlogPost {
  slug: string
  title: string
  excerpt: string
  body: string
  coverImage: string | null
  authorId: string | null
  authorName: string | null
  authorAvatar: string | null
  category: PostCategory
  tags: string[]
  status: PostStatus
  featured: boolean
  readTime: number
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  seoTitle: string | null
  seoDescription: string | null
  ogImage: string | null
}

interface BlogAuthor {
  name: string
  avatar: string | null
  bio: string
  twitter: string | null
}

/* ─────────────── Posts collection ─────────────── */

export const postsCollection = buildCollection<BlogPost>({
  id: 'posts',
  name: 'Posts',
  singularName: 'Post',
  path: 'posts',
  icon: 'EditNote',
  group: 'Blog',
  description: 'Long-form posts shown on /blog and /blog/:slug',
  permissions: () => ({ read: true, edit: true, create: true, delete: true }),
  defaultSize: 's',
  properties: {
    title: buildProperty({
      dataType: 'string',
      name: 'Title',
      validation: { required: true },
    }),
    slug: buildProperty({
      dataType: 'string',
      name: 'Slug',
      description: 'URL — kebab-case, no spaces. Used in /blog/:slug',
      validation: {
        required: true,
        matches: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        matchesMessage: 'Lowercase letters, numbers, and hyphens only',
      },
    }),
    excerpt: buildProperty({
      dataType: 'string',
      name: 'Excerpt',
      multiline: true,
      description: 'One-paragraph teaser shown in cards and at the top of the post',
      validation: { required: true, max: 240 },
    }),
    body: buildProperty({
      dataType: 'string',
      name: 'Body',
      markdown: true,
      description: 'Full post content. Markdown with GitHub-flavored extensions.',
      validation: { required: true },
    }),
    coverImage: buildProperty({
      dataType: 'string',
      name: 'Cover image',
      storage: {
        storagePath: 'blog/covers',
        acceptedFiles: ['image/*'],
        metadata: { cacheControl: 'public, max-age=31536000' },
      },
    }),
    category: buildProperty({
      dataType: 'string',
      name: 'Category',
      validation: { required: true },
      enumValues: {
        'state-of-reel-estate': 'State of Reel Estate',
        playbook: 'Playbook',
        spotlight: 'Spotlight',
        data: 'Data',
        announcements: 'Product',
      },
    }),
    tags: buildProperty({
      dataType: 'array',
      name: 'Tags',
      of: { dataType: 'string' },
    }),
    status: buildProperty({
      dataType: 'string',
      name: 'Status',
      validation: { required: true },
      enumValues: {
        draft: 'Draft',
        published: 'Published',
        scheduled: 'Scheduled',
      },
      defaultValue: 'draft',
    }),
    featured: buildProperty({
      dataType: 'boolean',
      name: 'Featured',
      description: 'Pin to the hero of /blog',
      defaultValue: false,
    }),
    readTime: buildProperty({
      dataType: 'number',
      name: 'Read time (min)',
      defaultValue: 5,
    }),
    publishedAt: buildProperty({
      dataType: 'date',
      name: 'Published at',
      mode: 'date_time',
    }),
    authorId: buildProperty({
      dataType: 'reference',
      name: 'Author',
      path: 'authors',
    }),
    authorName: buildProperty({
      dataType: 'string',
      name: 'Author name (denormalized)',
      description: 'Copy of the author\'s name — saves a read on list pages',
    }),
    authorAvatar: buildProperty({
      dataType: 'string',
      name: 'Author avatar (denormalized)',
    }),
    seoTitle: buildProperty({
      dataType: 'string',
      name: 'SEO title',
      description: 'Falls back to Title if blank',
    }),
    seoDescription: buildProperty({
      dataType: 'string',
      name: 'SEO description',
      multiline: true,
      description: 'Falls back to Excerpt if blank',
      validation: { max: 200 },
    }),
    ogImage: buildProperty({
      dataType: 'string',
      name: 'OG image',
      description: 'Falls back to cover image if blank',
      storage: {
        storagePath: 'blog/og',
        acceptedFiles: ['image/*'],
      },
    }),
    createdAt: buildProperty({
      dataType: 'date',
      name: 'Created at',
      autoValue: 'on_create',
      readOnly: true,
    }),
    updatedAt: buildProperty({
      dataType: 'date',
      name: 'Updated at',
      autoValue: 'on_update',
      readOnly: true,
    }),
  },
})

/* ─────────────── Authors collection ─────────────── */

export const authorsCollection = buildCollection<BlogAuthor>({
  id: 'authors',
  name: 'Authors',
  singularName: 'Author',
  path: 'authors',
  icon: 'Person',
  group: 'Blog',
  permissions: () => ({ read: true, edit: true, create: true, delete: true }),
  properties: {
    name: buildProperty({ dataType: 'string', name: 'Name', validation: { required: true } }),
    avatar: buildProperty({
      dataType: 'string',
      name: 'Avatar',
      storage: { storagePath: 'blog/authors', acceptedFiles: ['image/*'] },
    }),
    bio: buildProperty({ dataType: 'string', name: 'Bio', multiline: true }),
    twitter: buildProperty({
      dataType: 'string',
      name: 'X / Twitter',
      description: 'Handle without the @',
    }),
  },
})

/* ─────────────── Export the full set ─────────────── */

export const blogCollections = [postsCollection, authorsCollection]
