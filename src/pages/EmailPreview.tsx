import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReelstLogo } from '@/components/ui/ReelstLogo'
import { renderAuthEmail, type AuthEmailKind } from '@/lib/emailTemplate'
import {
  renderDigestEmail,
  type DigestAgent,
  type DigestBlogPost,
} from '@/lib/digestEmailTemplate'

/**
 * Local renderer for the Reelst transactional emails. Two surfaces:
 *   - Auth (verify / reset) — what `sendAuthEmail` ships
 *   - Digest (weekly subscriber digest) — what `sendWeeklyDigest` will ship
 *
 * Mock data is hard-coded. Toggle scenarios via the "Scenario" pill row.
 *
 * Route: /dev/email-preview
 */

type Surface = 'auth' | 'digest'
type DigestScenario = 'all-updates' | 'some-updates' | 'no-updates-with-blog' | 'no-updates-no-blog' | 'one-agent-one-update'

const SAMPLE_ACTION_URL = 'https://plot-fe990.web.app/auth/action?mode=verifyEmail&oobCode=SAMPLE_OOB_CODE_REPLACE_ME&apiKey=SAMPLE_KEY&continueUrl=https%3A%2F%2Fplot-fe990.web.app%2Fdashboard&lang=en'
const SAMPLE_UNSUB_URL = 'https://plot-fe990.web.app/u/sample-unsub-token-replace-me'

/* ─────────────── Mock digest data ─────────────── */

const MOCK_AGENTS: DigestAgent[] = [
  {
    username: 'mayalopez',
    displayName: 'Maya Lopez',
    photoURL: null,
    updates: [
      {
        kind: 'new_listing',
        primary: '142 Mango Grove Dr',
        secondary: '$1.45M · 4 bd · 3 ba · Coral Gables',
        thumbnail: null,
        href: 'https://plot-fe990.web.app/mayalopez',
      },
      {
        kind: 'new_open_house',
        primary: '88 Oak Hill Ln',
        secondary: 'Sat May 11 · 1–4pm',
        thumbnail: null,
        href: 'https://plot-fe990.web.app/mayalopez',
      },
    ],
  },
  {
    username: 'davidchen',
    displayName: 'David Chen',
    photoURL: null,
    updates: [
      {
        kind: 'new_sold',
        primary: '2204 Sunset Ridge',
        secondary: 'Sold $980K',
        thumbnail: null,
        href: 'https://plot-fe990.web.app/davidchen',
      },
    ],
  },
  {
    username: 'sarahkim',
    displayName: 'Sarah Kim',
    photoURL: null,
    updates: [
      {
        kind: 'new_content',
        primary: '301 Bayview Ter',
        secondary: 'New reel',
        thumbnail: null,
        href: 'https://plot-fe990.web.app/sarahkim',
      },
      {
        kind: 'new_content',
        primary: '142 Mango Grove Dr',
        secondary: '4 new photos',
        thumbnail: null,
        href: 'https://plot-fe990.web.app/sarahkim',
      },
      {
        kind: 'new_spotlight',
        primary: 'Wynwood',
        secondary: 'New spotlight pin',
        thumbnail: null,
        href: 'https://plot-fe990.web.app/sarahkim',
      },
    ],
  },
  {
    username: 'jamiepark',
    displayName: 'Jamie Park',
    photoURL: null,
    updates: [],
  },
]

const MOCK_BLOG_POST: DigestBlogPost = {
  slug: 'state-of-reel-estate-q2-2026',
  title: 'State of Reel Estate · Q2 2026',
  excerpt: 'Why agents who own their map outperform agents who rent attention. The data, the playbook, and three case studies from Miami, Austin, and Brooklyn.',
  coverImage: null,
  category: 'state-of-reel-estate',
  readTime: 9,
}

function buildDigestInput(scenario: DigestScenario): { agents: DigestAgent[]; blogPost: DigestBlogPost | null } {
  switch (scenario) {
    case 'all-updates':
      return { agents: MOCK_AGENTS.filter((a) => a.updates.length > 0), blogPost: null }
    case 'some-updates':
      return { agents: MOCK_AGENTS, blogPost: null }
    case 'no-updates-with-blog':
      return { agents: MOCK_AGENTS.map((a) => ({ ...a, updates: [] })), blogPost: MOCK_BLOG_POST }
    case 'no-updates-no-blog':
      return { agents: MOCK_AGENTS.map((a) => ({ ...a, updates: [] })), blogPost: null }
    case 'one-agent-one-update':
      return {
        agents: [MOCK_AGENTS[0]].map((a) => ({ ...a, updates: a.updates.slice(0, 1) })),
        blogPost: null,
      }
  }
}

/* ─────────────── Component ─────────────── */

export default function EmailPreview() {
  const [surface, setSurface] = useState<Surface>('auth')
  const [authKind, setAuthKind] = useState<AuthEmailKind>('verify')
  const [digestScenario, setDigestScenario] = useState<DigestScenario>('some-updates')
  const [name, setName] = useState('Mau')
  const [from, setFrom] = useState('mau@avigage.com')
  const [showText, setShowText] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [iframeHeight, setIframeHeight] = useState(800)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://plot-fe990.web.app'

  const rendered = useMemo(() => {
    if (surface === 'auth') {
      return renderAuthEmail({
        kind: authKind,
        actionUrl: SAMPLE_ACTION_URL.replace('verifyEmail', authKind === 'verify' ? 'verifyEmail' : 'resetPassword'),
        recipientName: name.trim() || null,
        fromAddress: from.trim() || 'mau@avigage.com',
        baseUrl,
      })
    }
    const { agents, blogPost } = buildDigestInput(digestScenario)
    return renderDigestEmail({
      agents,
      blogPost,
      recipientName: name.trim() || null,
      fromAddress: from.trim() || 'mau@avigage.com',
      baseUrl,
      unsubUrl: SAMPLE_UNSUB_URL,
    })
  }, [surface, authKind, digestScenario, name, from, baseUrl])

  // Auto-size iframe to its content so each surface fits without trailing whitespace.
  // The iframe re-renders via srcDoc whenever `rendered.html` changes; we re-measure on load
  // and again on the next frame to catch web-font reflow inside the email document.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let raf = 0
    const measure = () => {
      const doc = iframe.contentDocument
      if (!doc?.body) return
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
      if (h > 0) setIframeHeight(h)
    }
    const onLoad = () => {
      measure()
      raf = requestAnimationFrame(measure)
    }
    iframe.addEventListener('load', onLoad)
    return () => {
      iframe.removeEventListener('load', onLoad)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [rendered.html, device])

  return (
    <div className="min-h-screen bg-cream" style={{ fontFamily: 'var(--font-humanist)' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-warm-white border-b border-border-light px-5 py-3 flex flex-wrap items-center gap-3">
        <Link to="/" className="inline-flex items-center gap-2 mr-2">
          <ReelstLogo size="xs" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-tangerine bg-tangerine/10 px-2 py-0.5 rounded-full ml-1">Email preview</span>
        </Link>

        {/* Surface toggle */}
        <div className="flex items-center gap-1 bg-cream rounded-full p-1">
          {(['auth', 'digest'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSurface(s)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                surface === s ? 'bg-ink text-warm-white' : 'text-graphite hover:bg-pearl'
              }`}
            >
              {s === 'auth' ? 'Auth' : 'Digest'}
            </button>
          ))}
        </div>

        {/* Sub-toggle: depends on surface */}
        {surface === 'auth' ? (
          <div className="flex items-center gap-1 bg-cream rounded-full p-1">
            {(['verify', 'reset'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setAuthKind(k)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                  authKind === k ? 'bg-ink text-warm-white' : 'text-graphite hover:bg-pearl'
                }`}
              >
                {k === 'verify' ? 'Verify email' : 'Password reset'}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-cream rounded-full p-1 flex-wrap">
            {([
              ['all-updates', 'All updates'],
              ['some-updates', 'Some updates'],
              ['one-agent-one-update', '1 agent · 1 update'],
              ['no-updates-with-blog', 'No updates + blog'],
              ['no-updates-no-blog', 'No updates'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setDigestScenario(id)}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold cursor-pointer transition-colors ${
                  digestScenario === id ? 'bg-ink text-warm-white' : 'text-graphite hover:bg-pearl'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Device toggle */}
        <div className="flex items-center gap-1 bg-cream rounded-full p-1">
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold cursor-pointer transition-colors ${
                device === d ? 'bg-ink text-warm-white' : 'text-graphite hover:bg-pearl'
              }`}
            >
              {d === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowText((v) => !v)}
          className="text-[12px] font-semibold text-tangerine hover:underline cursor-pointer ml-auto"
        >
          {showText ? 'Hide plain-text' : 'Show plain-text'}
        </button>
      </header>

      {/* Inputs */}
      <section className="px-5 py-4 flex flex-wrap gap-3 border-b border-border-light bg-warm-white">
        <Field label="Recipient name (greeting)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="(no name)"
            className="bg-cream rounded-[10px] px-3 py-2 text-[13px] text-ink outline-none focus:bg-pearl"
          />
        </Field>
        <Field label="From address (footer + reply-to)">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="mau@avigage.com"
            className="bg-cream rounded-[10px] px-3 py-2 text-[13px] text-ink outline-none focus:bg-pearl"
          />
        </Field>
        <Field label="Subject (live)">
          <code className="bg-cream rounded-[10px] px-3 py-2 text-[12px] text-ink font-mono">
            {rendered.subject}
          </code>
        </Field>
      </section>

      {/* Inbox-style chrome around the iframe */}
      <main className="px-5 py-6 flex justify-center">
        <div
          className="bg-warm-white rounded-[18px] border border-border-light shadow-sm overflow-hidden flex flex-col"
          style={{ width: device === 'mobile' ? 380 : 720 }}
        >
          <div className="px-5 py-3 border-b border-border-light bg-cream/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-smoke">From</p>
            <p className="text-[13px] text-ink"><span className="font-semibold">Reelst</span> <span className="text-smoke">&lt;{from}&gt;</span></p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-smoke mt-2">Subject</p>
            <p className="text-[13px] text-ink font-medium">{rendered.subject}</p>
          </div>
          <iframe
            ref={iframeRef}
            title="email preview"
            srcDoc={rendered.html}
            className="w-full bg-white"
            style={{ height: iframeHeight, border: 'none' }}
          />
        </div>
      </main>

      {/* Plain-text fallback */}
      {showText && (
        <section className="px-5 pb-10">
          <div className="max-w-[720px] mx-auto bg-ink/95 text-warm-white rounded-[14px] p-5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
            {rendered.text}
          </div>
        </section>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-smoke">{label}</span>
      {children}
    </label>
  )
}
