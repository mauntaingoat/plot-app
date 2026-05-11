import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BookBookmark } from '@phosphor-icons/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import {
  GLOSSARY_BY_SLUG,
  GLOSSARY_CATEGORIES,
  resolveRelated,
  type GlossaryTerm,
} from '@/lib/glossary'

/* ════════════════════════════════════════════════════════════════
   GLOSSARY TERM DETAIL, `/glossary/:slug`
   ────────────────────────────────────────────────────────────────
   Per-term page rendering the markdown body with cross-links to
   related terms and a category breadcrumb back to the index.
   Each term is independently SEO-indexable (own URL, own meta).
   ──────────────────────────────────────────────────────────────── */

export default function GlossaryTerm() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const term = slug ? GLOSSARY_BY_SLUG[slug] : null

  // Reset scroll on slug change so navigating term → related-term
  // lands at the top, not mid-scroll from the previous page.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [slug])

  if (!term) {
    return (
      <MarketingLayout>
        <SEOHead title="Term not found, Reelst Glossary" path={`/glossary/${slug ?? ''}`} />
        <div className="bg-marketing min-h-[80vh] pt-32 pb-24">
          <div className="max-w-[680px] mx-auto px-6 md:px-10 text-center">
            <h1
              className="text-ink mb-4"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 500,
                letterSpacing: '-0.025em',
              }}
            >
              Term not found
            </h1>
            <p className="text-graphite mb-8" style={{ fontSize: '16px' }}>
              We couldn't find a glossary entry for "{slug}". It may have been renamed
              or it might just not exist yet.
            </p>
            <button
              onClick={() => navigate('/glossary')}
              className="brand-btn h-11 px-5 rounded-full text-[14px] cursor-pointer inline-flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-humanist)', fontWeight: 600 }}
            >
              <ArrowLeft weight="bold" size={14} /> Back to glossary
            </button>
          </div>
        </div>
      </MarketingLayout>
    )
  }

  const related = resolveRelated(term)
  const categoryLabel =
    GLOSSARY_CATEGORIES.find((c) => c.id === term.category)?.label ?? 'Real estate'

  return (
    <MarketingLayout>
      <SEOHead
        title={term.seoTitle ?? `${term.title}, Reelst Glossary`}
        description={term.seoDescription ?? term.tagline}
        path={`/glossary/${term.slug}`}
      />

      <div className="bg-marketing">
        {/* ── Breadcrumb ──────────────────────────────────────────── */}
        <section className="pt-28 md:pt-32 pb-4">
          <div className="max-w-[760px] mx-auto px-6 md:px-10">
            <Link
              to="/glossary"
              className="inline-flex items-center gap-1.5 text-smoke hover:text-tangerine transition-colors"
              style={{ fontFamily: 'var(--font-humanist)', fontSize: '13px', fontWeight: 500 }}
            >
              <ArrowLeft weight="bold" size={13} /> Glossary
            </Link>
          </div>
        </section>

        {/* ── Term hero ───────────────────────────────────────────── */}
        <section className="pb-8 md:pb-10">
          <div className="max-w-[760px] mx-auto px-6 md:px-10">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-[0.16em]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: '#D94A1F',
                  background: 'rgba(255,133,82,0.12)',
                }}
              >
                {categoryLabel}
              </span>
            </div>
            <h1
              className="text-ink mb-4"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
              }}
            >
              {term.title}
            </h1>
            <p
              className="text-graphite"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(1.05rem, 1.4vw, 1.32rem)',
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              {term.tagline}
            </p>
          </div>
        </section>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <section className="pb-16 md:pb-24">
          <div className="max-w-[760px] mx-auto px-6 md:px-10">
            <article
              className="glossary-prose"
              style={{ fontFamily: 'var(--font-humanist)' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Internal links inside the markdown stay SPA-routed.
                  a: ({ href, children, ...rest }) => {
                    const isInternal = href?.startsWith('/')
                    if (isInternal && href) {
                      return (
                        <Link to={href} className="text-tangerine hover:underline">
                          {children}
                        </Link>
                      )
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tangerine hover:underline"
                        {...rest}
                      >
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {term.body}
              </ReactMarkdown>
            </article>
          </div>
        </section>

        {/* ── Related terms ───────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="pb-32 md:pb-40">
            <div className="max-w-[760px] mx-auto px-6 md:px-10">
              <div className="flex items-center gap-2 mb-5">
                <BookBookmark weight="fill" size={14} className="text-tangerine" />
                <p
                  className="text-tangerine"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  See also
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {related.map((r) => (
                  <RelatedCard key={r.slug} term={r} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </MarketingLayout>
  )
}

function RelatedCard({ term }: { term: GlossaryTerm }) {
  return (
    <Link
      to={`/glossary/${term.slug}`}
      className="group block p-5 rounded-[16px] bg-white transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        border: '1px solid rgba(255,133,82,0.18)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 8px 22px -16px rgba(217,74,31,0.14)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3
          className="text-ink"
          style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.012em' }}
        >
          {term.title}
        </h3>
        <ArrowUpRight
          weight="bold"
          size={14}
          className="shrink-0 text-ash transition-all duration-200 group-hover:text-tangerine group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
      <p
        className="text-graphite"
        style={{ fontSize: '12.5px', fontWeight: 400, lineHeight: 1.5 }}
      >
        {term.tagline}
      </p>
    </Link>
  )
}
