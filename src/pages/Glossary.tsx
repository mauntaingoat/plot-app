import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MagnifyingGlass } from '@phosphor-icons/react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  groupTermsByLetter,
  type GlossaryCategory,
  type GlossaryTerm,
} from '@/lib/glossary'

/* ════════════════════════════════════════════════════════════════
   GLOSSARY INDEX, `/glossary`
   ────────────────────────────────────────────────────────────────
   A–Z hub for real-estate + content terms agents care about.
   Optimized for SEO: each term has its own page, internal cross-
   links flow back into the blog and product surfaces. Hub-page
   pattern modeled after beehiiv's newsletter glossary.
   ──────────────────────────────────────────────────────────────── */

export default function Glossary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<GlossaryCategory | 'all'>('all')

  // Filter + group. We always re-group from scratch so the A–Z nav
  // only shows letters that have results given the current filter.
  const grouped = useMemo(() => {
    let pool = GLOSSARY_TERMS
    if (category !== 'all') pool = pool.filter((t) => t.category === category)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      pool = pool.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q),
      )
    }
    const groups = new Map<string, GlossaryTerm[]>()
    for (const t of pool) {
      const letter = t.title[0].toUpperCase()
      const arr = groups.get(letter) || []
      arr.push(t)
      groups.set(letter, arr)
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.title.localeCompare(b.title))
    return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
  }, [query, category])

  const allLetters = useMemo(() => {
    return [...groupTermsByLetter().keys()]
  }, [])

  const totalResults = useMemo(() => {
    let n = 0
    for (const arr of grouped.values()) n += arr.length
    return n
  }, [grouped])

  return (
    <MarketingLayout>
      <SEOHead
        title="Glossary, Reelst"
        description="Real estate and content marketing terms agents need to know, from MLS and CMA to link in bio and save bait."
        path="/glossary"
      />

      <div className="bg-marketing">
        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="pt-28 md:pt-36 pb-10 md:pb-14">
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
              The Reelst Glossary
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
              The vocabulary of{' '}
              <span className="brand-grad-text" style={{ fontWeight: 600 }}>
                modern real estate.
              </span>
            </h1>
            <p
              className="text-graphite mt-6 max-w-[600px] mx-auto"
              style={{
                fontFamily: 'var(--font-humanist)',
                fontSize: 'clamp(1rem, 1.22vw, 1.18rem)',
                fontWeight: 400,
                lineHeight: 1.55,
              }}
            >
              The terms agents and buyers run into every day, from MLS and escrow to
              link in bio, save bait, and everything in between. Plain definitions,
              honest examples.
            </p>
          </div>
        </section>

        {/* ── Search + category filter ────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-6 md:px-10 pb-6">
          <div
            className="flex items-center gap-3 px-4 h-14 rounded-full bg-white"
            style={{
              border: '1px solid rgba(255,133,82,0.18)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 6px 18px -10px rgba(217,74,31,0.16)',
              fontFamily: 'var(--font-humanist)',
            }}
          >
            <MagnifyingGlass size={18} className="text-smoke shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the glossary…"
              className="flex-1 h-full bg-transparent outline-none text-ink"
              style={{ fontSize: '15px', fontWeight: 400 }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-smoke hover:text-ink text-[12px] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <CategoryPill active={category === 'all'} onClick={() => setCategory('all')} label="All" />
            {GLOSSARY_CATEGORIES.map((c) => (
              <CategoryPill
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                label={c.label}
              />
            ))}
          </div>
        </section>

        {/* ── A–Z anchor nav ──────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-6 md:px-10 pb-10">
          <div className="flex flex-wrap gap-1.5">
            {allLetters.map((L) => {
              const has = grouped.has(L)
              return has ? (
                <a
                  key={L}
                  href={`#letter-${L}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-tangerine/10 cursor-pointer transition-colors"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 600 }}
                >
                  {L}
                </a>
              ) : (
                <span
                  key={L}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ash"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', fontWeight: 500 }}
                  aria-disabled
                >
                  {L}
                </span>
              )
            })}
          </div>
          <p
            className="mt-4 text-smoke"
            style={{ fontFamily: 'var(--font-humanist)', fontSize: '12.5px' }}
          >
            {totalResults} term{totalResults === 1 ? '' : 's'}
          </p>
        </section>

        {/* ── Term groups ─────────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-6 md:px-10 pb-32 md:pb-40">
          {totalResults === 0 ? (
            <EmptyState />
          ) : (
            [...grouped.entries()].map(([letter, terms]) => (
              <div key={letter} id={`letter-${letter}`} className="mb-12 md:mb-16 scroll-mt-32">
                <h2
                  className="brand-grad-text mb-6"
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: 'clamp(2.4rem, 4.2vw, 3.6rem)',
                    fontWeight: 600,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {letter}
                </h2>
                <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                  {terms.map((t) => (
                    <TermCard key={t.slug} term={t} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </MarketingLayout>
  )
}

/* ─────────────── Pieces ─────────────── */

function TermCard({ term }: { term: GlossaryTerm }) {
  return (
    <Link
      to={`/glossary/${term.slug}`}
      className="group block p-6 rounded-[18px] bg-white transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        border: '1px solid rgba(255,133,82,0.18)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.85) inset, 0 12px 28px -18px rgba(217,74,31,0.14), 0 4px 12px -8px rgba(10,14,23,0.04)',
        fontFamily: 'var(--font-humanist)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3
          className="text-ink"
          style={{
            fontSize: '1.12rem',
            fontWeight: 600,
            letterSpacing: '-0.018em',
            lineHeight: 1.25,
          }}
        >
          {term.title}
        </h3>
        <ArrowUpRight
          weight="bold"
          size={15}
          className="shrink-0 text-ash transition-all duration-200 group-hover:text-tangerine group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
      <p
        className="text-graphite"
        style={{ fontSize: '13.5px', fontWeight: 400, lineHeight: 1.55 }}
      >
        {term.tagline}
      </p>
    </Link>
  )
}

function CategoryPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
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
        No matches.
      </p>
      <p className="text-smoke mt-2" style={{ fontSize: '14px' }}>
        Try a different search or pick a different category.
      </p>
    </div>
  )
}
