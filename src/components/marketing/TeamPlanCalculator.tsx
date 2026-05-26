/**
 * TeamPlanCalculator — volume-pricing card on /pricing.
 *
 * Live calculator for brokerages / teams / orgs buying seats in
 * bulk. Discount tiers are formulaic (not negotiated case-by-case)
 * so the marketing surface can show concrete numbers; sales-led
 * follow-up only kicks in at the enterprise tier (250+ seats) or
 * when the buyer wants annual billing / invoice payments / MSA.
 *
 * No backend wiring yet — CTA opens a prefilled mailto. When
 * Stripe ships, the Stripe price object should mirror these tiers
 * exactly (volume mode, not graduated, so the displayed total
 * matches what Stripe bills).
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Minus, Plus } from '@phosphor-icons/react'

const INDIVIDUAL_PRICE = 29.99
const ENTERPRISE_MIN = 250
const MIN_SEATS = 10
const MAX_SEATS = ENTERPRISE_MIN

interface Tier {
  min: number
  max: number
  perSeat: number
  /** % off the individual rate. Computed once for display copy. */
  discountPct: number
}

// Curve targets ~73% off at the deepest published tier. Discount %
// is round-numbered against $29.99 individual: $22=27%, $18=40%,
// $14=53%, $11=63%, $8=73%.
const TIERS: Tier[] = [
  { min: 10,  max: 24,  perSeat: 22, discountPct: 27 },
  { min: 25,  max: 49,  perSeat: 18, discountPct: 40 },
  { min: 50,  max: 99,  perSeat: 14, discountPct: 53 },
  { min: 100, max: 249, perSeat: 11, discountPct: 63 },
]

function perSeatFor(seats: number): number | null {
  if (seats >= ENTERPRISE_MIN) return null
  for (const t of TIERS) if (seats >= t.min && seats <= t.max) return t.perSeat
  return INDIVIDUAL_PRICE
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

export function TeamPlanCalculator() {
  const [seats, setSeats] = useState(25)
  const enterprise = seats >= ENTERPRISE_MIN
  const perSeat = perSeatFor(seats)
  const monthly = perSeat ? perSeat * seats : null
  const indivMonthly = INDIVIDUAL_PRICE * seats
  // Round monthly savings to whole dollars — individual rate is
  // $29.99 so raw savings are full of trailing .98/.97 noise that
  // distracts more than it conveys precision.
  const savings = monthly !== null ? Math.round(indivMonthly - monthly) : null
  const annualSavings = savings !== null ? savings * 12 : null

  const setBounded = (n: number) => setSeats(Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(n))))

  const mailtoBody = enterprise
    ? `Hi Reelst team — interested in custom pricing for ${seats}+ agents.`
    : `Hi Reelst team — interested in team pricing for ${seats} agents at $${perSeat}/seat/mo ($${fmt(monthly!)}/mo total).`
  const mailto = `mailto:hello@reelst.co?subject=${encodeURIComponent(`Team plan for ${enterprise ? `${seats}+` : seats} agents`)}&body=${encodeURIComponent(mailtoBody)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="rounded-[24px] bg-white p-7 md:p-10 relative overflow-hidden"
      style={{
        border: '1px solid rgba(255,133,82,0.22)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.85) inset, 0 30px 80px -30px rgba(217,74,31,0.20), 0 10px 32px -16px rgba(10,14,23,0.08)',
      }}
    >
      {/* Eyebrow + heading */}
      <div className="mb-6 md:mb-8 max-w-[600px]">
        <p
          className="text-tangerine mb-3"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Brokerages & teams
        </p>
        <h3
          className="text-ink mb-3"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: 'clamp(1.7rem, 3.2vw, 2.4rem)',
            fontWeight: 500,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
          }}
        >
          Bring the whole{' '}
          <span className="brand-grad-text" style={{ fontWeight: 600 }}>
            roster.
          </span>
        </h3>
        <p
          className="text-graphite"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: '0.97rem',
            fontWeight: 400,
            lineHeight: 1.55,
          }}
        >
          Volume pricing for brokerages, teams, and large agent organizations. The more seats, the steeper the per-agent rate.
        </p>
      </div>

      {/* Calculator: left = control, right = summary */}
      <div className="grid md:grid-cols-[1.05fr,1fr] gap-5 md:gap-7 mb-7 md:mb-8">
        {/* Control: number + slider */}
        <div
          className="rounded-2xl p-5 md:p-6"
          style={{
            background: 'rgba(246, 241, 233, 0.6)',
            border: '1px solid rgba(10, 14, 23, 0.06)',
          }}
        >
          <p
            className="text-smoke mb-4"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            How many agents?
          </p>

          {/* Big stepper */}
          <div className="flex items-center gap-3 md:gap-4 mb-5">
            <button
              type="button"
              onClick={() => setBounded(seats - 1)}
              disabled={seats <= MIN_SEATS}
              aria-label="Decrease agent count"
              className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center text-ink cursor-pointer border border-black/[0.08] hover:bg-tangerine/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus weight="bold" size={14} />
            </button>
            <div className="flex-1">
              <input
                type="number"
                min={MIN_SEATS}
                max={MAX_SEATS}
                value={seats}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v)) setBounded(v)
                }}
                className="w-full bg-transparent border-0 outline-none text-center text-ink"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: 'clamp(2rem, 4.5vw, 2.8rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.035em',
                  lineHeight: 1,
                  MozAppearance: 'textfield',
                }}
              />
              <p
                className="text-center text-smoke mt-1"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: '12px',
                  fontWeight: 400,
                }}
              >
                {enterprise ? `${ENTERPRISE_MIN}+ agents` : 'agents'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBounded(seats + 1)}
              disabled={seats >= MAX_SEATS}
              aria-label="Increase agent count"
              className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center text-ink cursor-pointer border border-black/[0.08] hover:bg-tangerine/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus weight="bold" size={14} />
            </button>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={MIN_SEATS}
            max={MAX_SEATS}
            value={seats}
            onChange={(e) => setBounded(Number(e.target.value))}
            aria-label="Number of agents"
            className="team-calc-slider w-full"
            style={{
              // CSS custom property feeds the gradient fill so the
              // track shows "filled" left of the thumb, matching
              // common iOS-style sliders.
              ['--fill' as any]: `${((seats - MIN_SEATS) / (MAX_SEATS - MIN_SEATS)) * 100}%`,
            }}
          />

          <div className="flex justify-between mt-2">
            <span
              className="text-ash"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.12em',
              }}
            >
              {MIN_SEATS}
            </span>
            <span
              className="text-ash"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.12em',
              }}
            >
              {ENTERPRISE_MIN}+
            </span>
          </div>
        </div>

        {/* Summary: total + per-seat + savings */}
        <div
          className="rounded-2xl p-5 md:p-6 text-ivory flex flex-col"
          style={{
            background:
              'linear-gradient(135deg, #14181F 0%, #0A0E17 100%)',
          }}
        >
          {enterprise ? (
            <div className="flex-1 flex flex-col justify-center">
              <p
                className="text-white/55 mb-2"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Enterprise
              </p>
              <p
                className="text-ivory mb-3"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: '1.8rem',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                }}
              >
                Custom pricing for 250+ agents
              </p>
              <p
                className="text-white/65"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: '0.92rem',
                  fontWeight: 400,
                  lineHeight: 1.55,
                }}
              >
                Annual billing, dedicated onboarding, invoice payments, SSO on request.
              </p>
            </div>
          ) : (
            <>
              <p
                className="text-white/55 mb-1"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Your team
              </p>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span
                  className="text-ivory"
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: 'clamp(2.4rem, 5.5vw, 3.4rem)',
                    fontWeight: 500,
                    letterSpacing: '-0.035em',
                    lineHeight: 1,
                  }}
                >
                  ${fmt(monthly!)}
                </span>
                <span
                  className="text-white/55"
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: '13.5px',
                    fontWeight: 400,
                  }}
                >
                  / mo
                </span>
              </div>

              <div
                className="h-px w-full mb-4"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              />

              <div className="flex items-baseline justify-between mb-3">
                <span
                  className="text-white/55"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  Per agent
                </span>
                <span
                  className="text-ivory"
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: '1.05rem',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                  }}
                >
                  ${perSeat} / mo
                </span>
              </div>

              {savings !== null && savings > 0 && (
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-white/55"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    You save
                  </span>
                  <span
                    className="brand-grad-text"
                    style={{
                      fontFamily: 'var(--font-humanist)',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    ${fmt(savings)} / mo
                  </span>
                </div>
              )}

              {annualSavings !== null && annualSavings > 0 && (
                <p
                  className="text-white/45 mt-2"
                  style={{
                    fontFamily: 'var(--font-humanist)',
                    fontSize: '11.5px',
                    fontWeight: 400,
                    letterSpacing: '-0.005em',
                  }}
                >
                  ${fmt(annualSavings)} / year vs ${INDIVIDUAL_PRICE}/agent individual rate.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <a
          href={mailto}
          className="brand-btn-flat px-7 py-3.5 text-[14.5px] font-semibold inline-flex items-center gap-2 cursor-pointer"
          style={{ fontFamily: 'var(--font-humanist)' }}
        >
          {enterprise
            ? 'Contact sales'
            : `Get pricing for ${seats} agents`}
          <ArrowRight size={15} weight="bold" />
        </a>
        <p
          className="text-smoke text-center max-w-[360px]"
          style={{
            fontFamily: 'var(--font-humanist)',
            fontSize: '11.5px',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          We'll set up your org, invite your agents, and bill the brokerage directly. Usually live within a day.
        </p>
      </div>

      {/* Tier reference table */}
      <div
        className="mt-8 pt-6"
        style={{ borderTop: '1px solid rgba(10,14,23,0.06)' }}
      >
        <p
          className="text-smoke mb-4"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Pricing tiers
        </p>
        <ul className="space-y-2">
          {TIERS.map((t) => {
            const inThisTier = !enterprise && seats >= t.min && seats <= t.max
            return (
              <li
                key={t.min}
                className="flex items-baseline justify-between gap-3 py-1"
                style={{
                  fontFamily: 'var(--font-humanist)',
                  fontSize: '13.5px',
                  fontWeight: 400,
                  color: inThisTier ? '#0A0E17' : '#5C6470',
                  opacity: enterprise ? 0.55 : 1,
                }}
              >
                <span style={{ fontWeight: inThisTier ? 600 : 400 }}>
                  {t.min}–{t.max} agents
                </span>
                <span className="flex items-center gap-3">
                  {inThisTier && (
                    <span
                      className="brand-grad-text"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Your tier
                    </span>
                  )}
                  <span style={{ fontWeight: inThisTier ? 600 : 500 }}>
                    ${t.perSeat} / agent · {t.discountPct}% off
                  </span>
                </span>
              </li>
            )
          })}
          <li
            className="flex items-baseline justify-between gap-3 py-1"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: '13.5px',
              fontWeight: 400,
              color: enterprise ? '#0A0E17' : '#5C6470',
            }}
          >
            <span style={{ fontWeight: enterprise ? 600 : 400 }}>
              {ENTERPRISE_MIN}+ agents
            </span>
            <span className="flex items-center gap-3">
              {enterprise && (
                <span
                  className="brand-grad-text"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  Your tier
                </span>
              )}
              <span style={{ fontWeight: enterprise ? 600 : 500 }}>
                Custom — contact sales
              </span>
            </span>
          </li>
        </ul>
      </div>

      {/* Range input styling — pinned to the same tangerine accent the
          rest of the page uses, with the filled portion left of the
          thumb so the control reads as a meter, not a generic slider. */}
      <style>{`
        .team-calc-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            #D94A1F 0%,
            #FF8552 var(--fill, 0%),
            rgba(10,14,23,0.08) var(--fill, 0%),
            rgba(10,14,23,0.08) 100%
          );
          outline: none;
          cursor: pointer;
        }
        .team-calc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #D94A1F;
          box-shadow: 0 2px 8px rgba(217,74,31,0.35);
          cursor: grab;
          transition: transform 0.12s ease;
        }
        .team-calc-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.08);
        }
        .team-calc-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 2.5px solid #D94A1F;
          box-shadow: 0 2px 8px rgba(217,74,31,0.35);
          cursor: grab;
        }
        /* Kill the spinner buttons on the numeric input so the big
           number reads as display text, not a form widget. */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </motion.div>
  )
}
