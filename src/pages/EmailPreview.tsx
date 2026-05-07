import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { renderAuthEmail, type AuthEmailKind } from '@/lib/emailTemplate'

/**
 * Local renderer for the auth email templates. Lets us iterate on the
 * HTML without firing real Firebase actions.
 *
 * The page is read-only — it never sends mail and doesn't talk to
 * functions. It mirrors the exact same template the deployed Cloud
 * Function uses (see header comment in src/lib/emailTemplate.ts).
 *
 * Route: /dev/email-preview
 */

const SAMPLE_ACTION_URL = 'https://plot-fe990.web.app/auth/action?mode=verifyEmail&oobCode=SAMPLE_OOB_CODE_REPLACE_ME&apiKey=SAMPLE_KEY&continueUrl=https%3A%2F%2Fplot-fe990.web.app%2Fdashboard&lang=en'

export default function EmailPreview() {
  const [kind, setKind] = useState<AuthEmailKind>('verify')
  const [name, setName] = useState('Mau')
  const [from, setFrom] = useState('mau@avigage.com')
  const [showText, setShowText] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  const rendered = useMemo(
    () => renderAuthEmail({
      kind,
      actionUrl: SAMPLE_ACTION_URL.replace('verifyEmail', kind === 'verify' ? 'verifyEmail' : 'resetPassword'),
      recipientName: name.trim() || null,
      fromAddress: from.trim() || 'mau@avigage.com',
      // Use the page's own origin so logo + character images resolve
      // on localhost (dev server) and on plot-fe990.web.app (deployed).
      baseUrl: typeof window !== 'undefined' ? window.location.origin : 'https://plot-fe990.web.app',
    }),
    [kind, name, from],
  )

  return (
    <div className="min-h-screen bg-cream" style={{ fontFamily: 'var(--font-humanist)' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-warm-white border-b border-border-light px-5 py-3 flex flex-wrap items-center gap-3">
        <Link to="/" className="flex items-center gap-2 mr-2">
          <img src="/reelst-logo.png" alt="" className="w-6 h-6" />
          <span className="text-[15px] font-semibold text-ink tracking-tight">Reelst</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-tangerine bg-tangerine/10 px-2 py-0.5 rounded-full ml-1">Email preview</span>
        </Link>

        <div className="flex items-center gap-1 bg-cream rounded-full p-1">
          {(['verify', 'reset'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                kind === k ? 'bg-ink text-warm-white' : 'text-graphite hover:bg-pearl'
              }`}
            >
              {k === 'verify' ? 'Verify email' : 'Password reset'}
            </button>
          ))}
        </div>

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
            title="email preview"
            srcDoc={rendered.html}
            className="w-full bg-white"
            style={{ height: 1000, border: 'none' }}
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
