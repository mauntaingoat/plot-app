import { Buildings as Building2, MapPin, Sparkle as Sparkles, ArrowUpRight } from '@phosphor-icons/react'
import { PLATFORM_LIST, PLATFORM_LOGOS, platformUrl } from '@/components/icons/PlatformLogos'
import type { Pin, UserDoc } from '@/lib/types'
import { formatPrice } from '@/lib/firestore'

/* ════════════════════════════════════════════════════════════════
   ABOUT TAB
   ────────────────────────────────────────────────────────────────
   Intentionally narrow content — no sold count, no avg DOM, no
   years-in-real-estate. Stats that can backfire on a perfectly
   competent agent are left out so every About tab reads as confident
   regardless of tenure or market cycle. Forward-looking only.
   ──────────────────────────────────────────────────────────────── */

interface AboutTabProps {
  agent: UserDoc
  pins: Pin[]
}

export function AboutTab({ agent, pins }: AboutTabProps) {
  const activePins = pins.filter((p) => p.enabled && p.type !== 'spotlight' && (p as any).status !== 'archived')
  const forSalePins = activePins.filter((p) => p.type === 'for_sale')
  const activeCount = forSalePins.length

  // Average active listing price (for-sale only). Skip if no
  // listings — we'll render the empty-state fallback instead of
  // showing $0 or NaN.
  const avgPrice = forSalePins.length > 0
    ? Math.round(
        forSalePins.reduce((sum, p) => sum + ((p as any).price || 0), 0) / forSalePins.length,
      )
    : null

  const realPlatforms = (agent.platforms || []).filter((p) =>
    PLATFORM_LIST.some((cfg) => cfg.id === p.id) && p.username,
  )

  return (
    <div
      className="px-5 md:px-7 pt-4 pb-32"
      style={{ fontFamily: 'var(--font-humanist)' }}
    >
      {/* ── Bio ────────────────────────────────────────────────── */}
      {agent.bio?.trim() && (
        <section className="mb-8">
          <p
            className="text-ink whitespace-pre-line"
            style={{
              fontSize: '15.5px',
              fontWeight: 400,
              lineHeight: 1.6,
              letterSpacing: '-0.005em',
            }}
          >
            {agent.bio}
          </p>
        </section>
      )}

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="mb-8">
        {activeCount > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Active listings" value={String(activeCount)} />
            {avgPrice != null && (
              <StatCard
                label="Avg listing price"
                value={formatPrice(avgPrice)}
              />
            )}
          </div>
        ) : (
          <EmptyStatsFallback />
        )}
      </section>

      {/* ── Brokerage ──────────────────────────────────────────── */}
      {agent.brokerage?.trim() && (
        <section className="mb-8">
          <SectionLabel>Brokerage</SectionLabel>
          <div
            className="flex items-center gap-3 p-4 rounded-[16px] bg-warm-white border border-border-light"
            style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset' }}
          >
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(10,14,23,0.05)' }}
            >
              <Building2 size={18} className="text-graphite" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-ink truncate"
                style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.005em' }}
              >
                {agent.brokerage}
              </p>
              {agent.licenseState && agent.licenseNumber && (
                <p
                  className="text-smoke truncate mt-0.5"
                  style={{ fontSize: '12px', fontWeight: 400 }}
                >
                  {agent.licenseState} · License #{agent.licenseNumber}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Links (socials + website) ──────────────────────────── */}
      {realPlatforms.length > 0 && (
        <section className="mb-8">
          <SectionLabel>Find me elsewhere</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {realPlatforms.map((platform) => {
              const meta = PLATFORM_LIST.find((p) => p.id === platform.id)
              const Logo = PLATFORM_LOGOS[platform.id]
              const url = platformUrl(platform)
              return (
                <a
                  key={platform.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3.5 rounded-[14px] bg-warm-white border border-border-light hover:border-tangerine/30 transition-colors"
                  style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset' }}
                >
                  <span
                    className="w-9 h-9 rounded-[10px] bg-cream flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                  >
                    {Logo ? <Logo size={18} /> : <MapPin size={16} className="text-smoke" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-ink truncate"
                      style={{ fontSize: '13.5px', fontWeight: 600, letterSpacing: '-0.005em' }}
                    >
                      {meta?.name || platform.id}
                    </span>
                    <span
                      className="block text-smoke truncate"
                      style={{ fontSize: '12px', fontWeight: 400 }}
                    >
                      {platform.username}
                    </span>
                  </span>
                  <ArrowUpRight
                    size={15}
                    className="text-ash group-hover:text-tangerine group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </a>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[16px] bg-warm-white border border-border-light p-4"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset' }}
    >
      <p
        className="text-smoke uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.16em',
        }}
      >
        {label}
      </p>
      <p
        className="text-ink mt-1.5"
        style={{
          fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
          fontWeight: 600,
          letterSpacing: '-0.025em',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  )
}

function EmptyStatsFallback() {
  return (
    <div
      className="rounded-[18px] p-5 flex items-center gap-3.5"
      style={{
        background: 'linear-gradient(135deg, rgba(255,133,82,0.08) 0%, rgba(217,74,31,0.06) 100%)',
        border: '1px solid rgba(255,133,82,0.18)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--brand-grad)' }}
      >
        <Sparkles size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-ink"
          style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.005em' }}
        >
          New listings on the way
        </p>
        <p
          className="text-graphite mt-0.5"
          style={{ fontSize: '12.5px', fontWeight: 400 }}
        >
          Save to be notified the moment they go live.
        </p>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-smoke uppercase mb-3"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10.5px',
        fontWeight: 600,
        letterSpacing: '0.18em',
      }}
    >
      {children}
    </p>
  )
}
