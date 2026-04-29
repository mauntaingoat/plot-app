import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowUpRight, Twitter, Link as LinkIcon } from 'lucide-react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import {
  getPostBySlug,
  listPublishedPosts,
  CATEGORY_LABELS,
  formatPostDate,
  type BlogPost,
} from '@/lib/blog'

/* ════════════════════════════════════════════════════════════════
   BLOG POST DETAIL — long-form reader
   Markdown body via react-markdown + remark-gfm. Pulls 3 related
   posts (same category) for the bottom rail. SEO meta from the
   post's seoTitle / seoDescription / ogImage fields.
   ════════════════════════════════════════════════════════════════ */

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog', 'post', slug],
    queryFn: () => (slug ? getPostBySlug(slug) : Promise.resolve(null)),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })

  const related = useQuery({
    queryKey: ['blog', 'related', post?.category, post?.id],
    queryFn: () =>
      post
        ? listPublishedPosts({ category: post.category, limit: 4 }).then((all) =>
            all.filter((p) => p.id !== post.id).slice(0, 3),
          )
        : Promise.resolve([]),
    enabled: !!post,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="bg-marketing min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-tangerine/30 border-t-tangerine rounded-full animate-spin" />
        </div>
      </MarketingLayout>
    )
  }

  if (!post) {
    return (
      <MarketingLayout>
        <div className="bg-marketing min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-24" style={{ fontFamily: 'var(--font-humanist)' }}>
          <h1 className="text-ink" style={{ fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
            Post not found
          </h1>
          <p className="text-smoke mt-3 mb-8">It might be unpublished or the URL is off.</p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-tangerine"
            style={{ fontWeight: 600 }}
          >
            <ArrowLeft size={15} /> Back to the blog
          </Link>
        </div>
      </MarketingLayout>
    )
  }

  return (
    <MarketingLayout>
      <SEOHead
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.excerpt}
        ogImage={post.ogImage || post.coverImage || undefined}
        path={`/blog/${post.slug}`}
      />

      <article className="bg-marketing">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="pt-24 md:pt-32 pb-10">
          <div className="max-w-[760px] mx-auto px-6 md:px-10">
            <button
              onClick={() => navigate('/blog')}
              className="inline-flex items-center gap-1.5 text-smoke hover:text-tangerine transition-colors mb-8 cursor-pointer"
              style={{ fontFamily: 'var(--font-humanist)', fontSize: '13px', fontWeight: 500 }}
            >
              <ArrowLeft size={14} /> Blog
            </button>

            <div className="flex items-center gap-3 mb-6">
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
              <span className="text-[12.5px] text-smoke" style={{ fontFamily: 'var(--font-humanist)' }}>
                {formatPostDate(post.publishedAt)} · {post.readTime || 5} min read
              </span>
            </div>

            <h1
              className="text-ink"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.2rem, 4.6vw, 3.8rem)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
              }}
            >
              {post.title}
            </h1>

            <p
              className="text-graphite mt-6"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: '1.15rem',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              {post.excerpt}
            </p>

            <div className="flex items-center gap-3 mt-8 pb-2" style={{ fontFamily: 'var(--font-humanist)' }}>
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-tangerine" style={{ fontWeight: 600, fontSize: '13px' }}>
                  {(post.authorName || 'R').slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-ink" style={{ fontSize: '13.5px', fontWeight: 600, letterSpacing: '-0.005em' }}>
                  {post.authorName || 'The Reelst Team'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Cover image ────────────────────────────────────────── */}
        {post.coverImage && (
          <div className="max-w-[1080px] mx-auto px-6 md:px-10 mb-12">
            <div
              className="aspect-[16/9] rounded-[24px] overflow-hidden bg-cream"
              style={{
                backgroundImage: `url(${post.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid rgba(255,133,82,0.18)',
                boxShadow: '0 30px 80px -30px rgba(217,74,31,0.18), 0 10px 32px -16px rgba(10,14,23,0.08)',
              }}
            />
          </div>
        )}

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="max-w-[720px] mx-auto px-6 md:px-10 pb-16 md:pb-20">
          <div className="blog-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>
        </div>

        {/* ── Share rail ─────────────────────────────────────────── */}
        <div className="max-w-[720px] mx-auto px-6 md:px-10 pb-12">
          <div
            className="flex items-center justify-between gap-4 py-5 border-t border-b border-black/[0.06]"
            style={{ fontFamily: 'var(--font-humanist)' }}
          >
            <span className="text-smoke text-[13px]">
              {post.tags?.slice(0, 4).map((t) => `#${t}`).join('  ')}
            </span>
            <div className="flex items-center gap-2">
              <ShareButton
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`}
                label="Share on X"
              >
                <Twitter size={14} />
              </ShareButton>
              <ShareButton
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                }}
                label="Copy link"
              >
                <LinkIcon size={14} />
              </ShareButton>
            </div>
          </div>
        </div>

        {/* ── Related posts ──────────────────────────────────────── */}
        {related.data && related.data.length > 0 && (
          <section className="max-w-[1200px] mx-auto px-6 md:px-10 pb-32 md:pb-40">
            <div className="mb-8 flex items-baseline justify-between">
              <h3
                className="text-ink"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(1.4rem, 2.4vw, 2rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}
              >
                Keep reading
              </h3>
              <Link
                to="/blog"
                className="inline-flex items-center gap-1 text-tangerine"
                style={{ fontFamily: 'var(--font-humanist)', fontSize: '13.5px', fontWeight: 600 }}
              >
                All posts <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {related.data.map((p) => (
                <RelatedCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    </MarketingLayout>
  )
}

function ShareButton({
  href,
  onClick,
  label,
  children,
}: {
  href?: string
  onClick?: () => void
  label: string
  children: React.ReactNode
}) {
  const cn =
    'w-9 h-9 rounded-full bg-white border border-black/[0.06] flex items-center justify-center text-graphite hover:text-tangerine hover:border-tangerine/30 transition-colors cursor-pointer'
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={cn}>
        {children}
      </a>
    )
  }
  return (
    <button onClick={onClick} aria-label={label} className={cn}>
      {children}
    </button>
  )
}

function RelatedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block rounded-[20px] overflow-hidden bg-white transition-transform duration-300 hover:-translate-y-1"
      style={{
        border: '1px solid rgba(255,133,82,0.18)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 12px 32px -18px rgba(217,74,31,0.16)',
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
      <div className="p-5">
        <p
          className="text-tangerine mb-2"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {CATEGORY_LABELS[post.category]}
        </p>
        <p
          className="text-ink"
          style={{ fontSize: '15.5px', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.3 }}
        >
          {post.title}
        </p>
      </div>
    </Link>
  )
}
