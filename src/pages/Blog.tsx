import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import {
  listPublishedPosts,
  listFeaturedPosts,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatPostDate,
  type BlogPost,
  type PostCategory,
} from '@/lib/blog'

/* ════════════════════════════════════════════════════════════════
   BLOG INDEX — "State of Reel Estate"
   Hero franchise pitch → featured post hero → category filter →
   masonry grid of recent posts. Pulls from Firestore (`posts`
   collection) authored via FireCMS.
   ════════════════════════════════════════════════════════════════ */

export default function Blog() {
  const [category, setCategory] = useState<PostCategory | 'all'>('all')

  const featured = useQuery({
    queryKey: ['blog', 'featured'],
    queryFn: () => listFeaturedPosts(1),
    staleTime: 5 * 60 * 1000,
  })

  const posts = useQuery({
    queryKey: ['blog', 'list', category],
    queryFn: () => listPublishedPosts({ category: category === 'all' ? undefined : category, limit: 30 }),
    staleTime: 5 * 60 * 1000,
  })

  const heroPost = featured.data?.[0]

  return (
    <MarketingLayout>
      <SEOHead
        title="State of Reel Estate — the Reelst blog"
        description="Quarterly data reports, agent playbooks, and the inside view on real estate's creator economy."
        path="/blog"
      />

      <div className="bg-marketing">
        {/* ── Franchise hero ─────────────────────────────────────── */}
        <section className="pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="max-w-[920px] mx-auto px-6 md:px-10 text-center">
            <p
              className="text-tangerine mb-4"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              The Reelst Blog
            </p>
            <h1
              className="text-ink"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.5rem, 5.4vw, 4.6rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1,
              }}
            >
              The{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                State of Reel Estate.
              </span>
            </h1>
            <p
              className="text-graphite mt-6 max-w-[560px] mx-auto"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              A quarterly read on real estate's creator economy — the data, the
              playbooks, and the agents shaping what's next.
            </p>
          </div>
        </section>

        {/* ── Featured (hero) post ───────────────────────────────── */}
        {heroPost && (
          <section className="max-w-[1200px] mx-auto px-6 md:px-10 pb-12 md:pb-20">
            <FeaturedCard post={heroPost} />
          </section>
        )}

        {/* ── Category filter ────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pb-8 md:pb-12">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill
              active={category === 'all'}
              onClick={() => setCategory('all')}
              label="All"
            />
            {CATEGORY_ORDER.map((c) => (
              <CategoryPill
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                label={CATEGORY_LABELS[c]}
              />
            ))}
          </div>
        </section>

        {/* ── Recent grid ────────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pb-32 md:pb-40">
          {posts.isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts.data && posts.data.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {posts.data
                .filter((p) => p.id !== heroPost?.id)
                .map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </MarketingLayout>
  )
}

/* ─────────────── Pieces ─────────────── */

function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-[28px] overflow-hidden bg-white"
      style={{
        border: '1px solid rgba(255,133,82,0.22)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.22), 0 10px 32px -16px rgba(10,14,23,0.08)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div
          className="aspect-[16/10] md:aspect-auto md:min-h-[420px] bg-cream"
          style={{
            backgroundImage: post.coverImage ? `url(${post.coverImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-[0.16em]"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: '#D94A1F',
                background: 'rgba(255,133,82,0.12)',
              }}
            >
              {CATEGORY_LABELS[post.category]}
            </span>
            <span className="text-[12.5px] text-smoke">{formatPostDate(post.publishedAt)}</span>
          </div>
          <h2
            className="text-ink"
            style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              fontWeight: 500,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
          >
            {post.title}
          </h2>
          <p
            className="text-graphite mt-4"
            style={{ fontSize: '15.5px', fontWeight: 400, lineHeight: 1.6 }}
          >
            {post.excerpt}
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 text-tangerine group-hover:gap-2.5 transition-all" style={{ fontSize: '14px', fontWeight: 600 }}>
            Read the report <ArrowUpRight size={16} strokeWidth={2.4} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-[20px] overflow-hidden bg-white transition-transform duration-300 hover:-translate-y-1"
      style={{
        border: '1px solid rgba(255,133,82,0.18)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.85) inset, 0 18px 42px -22px rgba(217,74,31,0.16), 0 6px 18px -10px rgba(10,14,23,0.06)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <div
        className="aspect-[16/10] bg-cream"
        style={{
          backgroundImage: post.coverImage ? `url(${post.coverImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: '#D94A1F',
              background: 'rgba(255,133,82,0.10)',
            }}
          >
            {CATEGORY_LABELS[post.category]}
          </span>
          <span className="text-[11.5px] text-smoke">{post.readTime || 5} min read</span>
        </div>
        <h3
          className="text-ink"
          style={{
            fontSize: '1.18rem',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.25,
          }}
        >
          {post.title}
        </h3>
        <p
          className="text-graphite mt-2.5"
          style={{ fontSize: '13.5px', fontWeight: 400, lineHeight: 1.55 }}
        >
          {post.excerpt}
        </p>
        <div
          className="mt-4 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[12.5px] text-smoke"
          style={{ fontWeight: 400 }}
        >
          <span>{post.authorName || 'Reelst'}</span>
          <span>{formatPostDate(post.publishedAt)}</span>
        </div>
      </div>
    </Link>
  )
}

function PostCardSkeleton() {
  return (
    <div
      className="rounded-[20px] overflow-hidden bg-white/60"
      style={{ border: '1px solid rgba(255,133,82,0.10)' }}
    >
      <div className="aspect-[16/10] bg-cream/80 animate-pulse" />
      <div className="p-6 space-y-3">
        <div className="h-3 w-24 bg-cream animate-pulse rounded-full" />
        <div className="h-5 w-full bg-cream animate-pulse rounded-md" />
        <div className="h-5 w-3/4 bg-cream animate-pulse rounded-md" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="rounded-[24px] bg-white/55 px-8 py-16 text-center"
      style={{
        border: '1px solid rgba(255,133,82,0.18)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <p className="text-ink" style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-0.015em' }}>
        Nothing published yet.
      </p>
      <p className="text-smoke mt-2" style={{ fontSize: '14px' }}>
        The first State of Reel Estate report drops soon.
      </p>
    </div>
  )
}

function CategoryPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-4 h-9 rounded-full transition-colors cursor-pointer"
      style={{
        fontFamily: 'var(--font-humanist)',
        fontSize: '13px',
        fontWeight: 500,
        letterSpacing: '-0.005em',
        color: active ? '#fff' : 'var(--color-graphite)',
        background: active ? 'var(--brand-grad)' : 'rgba(10,14,23,0.04)',
        boxShadow: active ? '0 6px 18px -8px rgba(217,74,31,0.4)' : undefined,
      }}
    >
      {label}
    </button>
  )
}
