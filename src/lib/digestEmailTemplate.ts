/**
 * Weekly digest email template — "The Sunday Reelst."
 *
 * Visual anchor: a custom continuous-line illustration of varied
 * American homes + floating tangerine pins, loose watercolor fills.
 * The illustration is the SAME every week — it's the brand mark,
 * not a per-issue render. Everything below is humanist body type,
 * tangerine accents, no serif/italic flourishes. One signature
 * brand-grad module for the blog teaser.
 *
 * IMPORTANT: This file is mirrored at functions/src/email/digestTemplate.ts.
 * The frontend copy powers /dev/email-preview; the functions copy is
 * what actually ships in sent emails. Keep them in sync — change one,
 * change the other.
 *
 * Three render cases:
 *   1. updates > 0                → hero + at-a-glance + per-agent cards
 *   2. updates empty, blog post   → hero + "quiet week" line + blog teaser
 *   3. updates empty, no blog     → hero + "quiet week" line + agent roster
 */

export type DigestUpdateKind =
  | 'new_listing'
  | 'new_sold'
  | 'new_spotlight'
  | 'new_open_house'
  | 'new_content'

export interface DigestUpdate {
  kind: DigestUpdateKind
  primary: string
  secondary: string
  thumbnail?: string | null
  href: string
}

export interface DigestAgent {
  username: string
  displayName: string
  photoURL: string | null
  updates: DigestUpdate[]
}

export interface DigestBlogPost {
  slug: string
  title: string
  excerpt: string
  coverImage: string | null
  category: string
  readTime: number
}

interface RenderInput {
  agents: DigestAgent[]
  blogPost: DigestBlogPost | null
  recipientName: string | null
  fromAddress: string
  baseUrl: string
  unsubUrl: string
  sendDate?: Date
}

interface RenderOutput {
  subject: string
  html: string
  text: string
}

const BRAND = {
  ink: '#0A0E1A',
  graphite: '#475569',
  smoke: '#94A3B8',
  hairline: 'rgba(10,14,23,0.08)',
  cream: '#F6F1E9',
  creamSoft: '#EDE7DA',
  ivory: '#FCFAF5',
  tangerine: '#D94A1F',
  tangerineLight: '#FF8552',
  ember: '#B83A12',
}

const BRAND_GRAD = `linear-gradient(135deg, ${BRAND.tangerineLight} 0%, ${BRAND.tangerine} 100%)`

// Humanist body font stack — same as the marketing site. No serif/italic.
const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif`

const KIND_LABEL: Record<DigestUpdateKind, string> = {
  new_listing: 'New listing',
  new_sold: 'Just sold',
  new_spotlight: 'Spotlight',
  new_open_house: 'Open house',
  new_content: 'New post',
}

export function renderDigestEmail({
  agents,
  blogPost,
  recipientName,
  fromAddress,
  baseUrl,
  unsubUrl,
  sendDate,
}: RenderInput): RenderOutput {
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const name = (recipientName || '').trim().split(' ')[0]
  const now = sendDate ?? new Date()
  const dateLabel = formatMastheadDate(now)

  const heroUrl = `${cleanBase}/email/digest-hero.jpg`
  const logoUrl = `${cleanBase}/reelst-logo.png`
  const privacyUrl = `${cleanBase}/privacy`
  const termsUrl = `${cleanBase}/terms`

  const agentsWithUpdates = agents.filter((a) => a.updates.length > 0)
  const agentsWithoutUpdates = agents.filter((a) => a.updates.length === 0)
  const counts = countUpdateKinds(agentsWithUpdates)
  const totalUpdates = counts.listings + counts.openHouses + counts.content + counts.sold + counts.spotlight

  const { subject, preheader, headlineEyebrow, headline } = buildIntroCopy({
    totalUpdates,
    agentsWithUpdates,
    totalAgents: agents.length,
    blogPost,
    name,
  })

  const atAGlance = totalUpdates > 0 ? renderAtAGlance(counts) : ''
  const agentSections = agentsWithUpdates.map((a) => renderAgentCard(a, cleanBase)).join('\n')
  const blogTeaser = blogPost ? renderBlogTeaser(blogPost, cleanBase) : ''
  const roster = totalUpdates === 0 && !blogPost && agentsWithoutUpdates.length > 0
    ? renderAgentRoster(agentsWithoutUpdates, cleanBase)
    : ''

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:${SANS};color:${BRAND.ink};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.cream};">${escapeHtml(preheader)}</div>

  <!-- ── Top bar: wordmark + date ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:24px 28px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${escapeAttr(logoUrl)}" width="28" height="28" alt="Reelst" style="display:inline-block;vertical-align:middle;width:28px;height:28px;border:0;outline:none;text-decoration:none;margin-right:8px;" />
                    <span style="display:inline-block;vertical-align:middle;font-family:${SANS};font-size:17px;font-weight:700;letter-spacing:-0.022em;color:${BRAND.ink};">Reelst</span>
                  </td>
                  <td align="right" style="vertical-align:middle;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.graphite};">
                    ${escapeHtml(dateLabel)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Hero illustration (the brand mark) ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 16px;">
              <img src="${escapeAttr(heroUrl)}" alt="" width="608" style="display:block;width:100%;max-width:608px;height:auto;border:0;outline:none;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Headline band ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.tangerine};">
                ${escapeHtml(headlineEyebrow)}
              </p>
              <h1 style="margin:10px 0 0;font-family:${SANS};font-size:32px;line-height:1.12;font-weight:800;letter-spacing:-0.028em;color:${BRAND.ink};max-width:540px;">
                ${escapeHtml(headline)}
              </h1>
            </td>
          </tr>
          ${atAGlance}
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Body band ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          ${agentSections}
          ${roster}
          ${blogTeaser}
          <tr><td style="height:32px;line-height:32px;font-size:1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Footer ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:24px 28px 16px;border-top:1px solid ${BRAND.hairline};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${escapeAttr(logoUrl)}" width="22" height="22" alt="Reelst" style="display:inline-block;vertical-align:middle;width:22px;height:22px;border:0;outline:none;text-decoration:none;margin-right:7px;" />
                    <span style="display:inline-block;vertical-align:middle;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:-0.018em;color:${BRAND.ink};">Reelst</span>
                  </td>
                  <td align="right" style="vertical-align:middle;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.04em;color:${BRAND.graphite};">
                    Where listings come alive
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 32px;text-align:left;">
              <p style="margin:0 0 8px;font-family:${SANS};font-size:11.5px;line-height:1.6;color:${BRAND.graphite};">
                <a href="${escapeAttr(privacyUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(termsUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Terms</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(unsubUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Manage subscriptions</a>
              </p>
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.55;color:${BRAND.smoke};">
                Reelst is a DBA of Avigage Systems Inc. Reach us at
                <a href="mailto:${escapeAttr(fromAddress)}" style="color:${BRAND.smoke};text-decoration:underline;">${escapeHtml(fromAddress)}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // Plain-text fallback
  const textLines: string[] = [
    `Reelst — ${dateLabel}`,
    '',
    `${headlineEyebrow}`,
    headline,
    '',
  ]
  if (agentsWithUpdates.length > 0) {
    for (const a of agentsWithUpdates) {
      textLines.push(`${a.displayName} (@${a.username}) — ${cleanBase}/${a.username}`)
      for (const u of a.updates) {
        textLines.push(`  · ${KIND_LABEL[u.kind]}: ${u.primary} — ${u.secondary}`)
      }
      textLines.push('')
    }
  }
  if (blogPost) {
    textLines.push(`From the Reelst desk: ${blogPost.title}`)
    textLines.push(blogPost.excerpt)
    textLines.push(`Read: ${cleanBase}/blog/${blogPost.slug}`)
    textLines.push('')
  }
  if (totalUpdates === 0 && !blogPost && agentsWithoutUpdates.length > 0) {
    textLines.push('Your subscriptions:')
    for (const a of agentsWithoutUpdates) {
      textLines.push(`  ${a.displayName} — ${cleanBase}/${a.username}`)
    }
    textLines.push('')
  }
  textLines.push('—')
  textLines.push('Reelst · Where listings come alive')
  textLines.push(`Manage subscriptions: ${unsubUrl}`)

  return { subject, html, text: textLines.join('\n') }
}

/* ─────────────── At-a-glance numerals ─────────────── */

interface KindCounts {
  listings: number
  sold: number
  spotlight: number
  openHouses: number
  content: number
}

function countUpdateKinds(agents: DigestAgent[]): KindCounts {
  const c: KindCounts = { listings: 0, sold: 0, spotlight: 0, openHouses: 0, content: 0 }
  for (const a of agents) {
    for (const u of a.updates) {
      if (u.kind === 'new_listing') c.listings++
      else if (u.kind === 'new_sold') c.sold++
      else if (u.kind === 'new_spotlight') c.spotlight++
      else if (u.kind === 'new_open_house') c.openHouses++
      else if (u.kind === 'new_content') c.content++
    }
  }
  return c
}

function renderAtAGlance(c: KindCounts): string {
  const pinTotal = c.listings + c.spotlight + c.sold
  const ordered: Array<{ n: number; label: string }> = [
    { n: pinTotal, label: pinTotal === 1 ? 'new pin' : 'new pins' },
    { n: c.openHouses, label: c.openHouses === 1 ? 'open house' : 'open houses' },
    { n: c.content, label: c.content === 1 ? 'new post' : 'new posts' },
  ].filter((x) => x.n > 0)

  if (ordered.length === 0) return ''

  const cells = ordered.map((x, i) => `
    <td align="${i === 0 ? 'left' : i === ordered.length - 1 ? 'right' : 'center'}" style="padding:0;vertical-align:top;">
      <p style="margin:0;font-family:${SANS};font-size:54px;line-height:0.95;font-weight:800;letter-spacing:-0.04em;color:${BRAND.tangerine};">
        ${x.n}
      </p>
      <p style="margin:6px 0 0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.graphite};">
        ${escapeHtml(x.label)}
      </p>
    </td>`).join('')

  return `
<tr>
  <td style="padding:24px 28px 8px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>${cells}</tr>
    </table>
  </td>
</tr>`
}

/* ─────────────── Per-agent card ─────────────── */

function renderAgentCard(agent: DigestAgent, cleanBase: string): string {
  const profileUrl = `${cleanBase}/${agent.username}`
  const avatar = agent.photoURL
    ? `<img src="${escapeAttr(agent.photoURL)}" width="40" height="40" alt="${escapeAttr(agent.displayName)}" style="display:block;width:40px;height:40px;border-radius:50%;border:0;outline:none;text-decoration:none;" />`
    : `<div style="width:40px;height:40px;border-radius:50%;background:${BRAND_GRAD};background-color:${BRAND.tangerine};color:#FFFFFF;font-family:${SANS};font-size:16px;font-weight:700;line-height:40px;text-align:center;">${escapeHtml(agent.displayName.charAt(0).toUpperCase())}</div>`

  const rows = agent.updates.map((u, i) => renderUpdateRow(u, i === agent.updates.length - 1)).join('\n')

  return `
<tr>
  <td style="padding:20px 0 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.ivory};border:1px solid ${BRAND.hairline};border-radius:20px;">
      <tr>
        <td style="padding:18px 22px 6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;width:40px;padding-right:12px;">${avatar}</td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-family:${SANS};font-size:16px;font-weight:700;letter-spacing:-0.012em;color:${BRAND.ink};line-height:1.2;">
                  ${escapeHtml(agent.displayName)}
                </p>
                <a href="${escapeAttr(profileUrl)}" style="font-family:${SANS};font-size:12px;font-weight:500;color:${BRAND.smoke};text-decoration:none;">
                  @${escapeHtml(agent.username)}
                </a>
              </td>
              <td align="right" style="vertical-align:middle;">
                <a href="${escapeAttr(profileUrl)}" style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.tangerine};text-decoration:none;">
                  View map →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 22px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

function renderUpdateRow(u: DigestUpdate, isLast: boolean): string {
  const thumb = u.thumbnail
    ? `<img src="${escapeAttr(u.thumbnail)}" width="60" height="60" alt="" style="display:block;width:60px;height:60px;border-radius:12px;object-fit:cover;border:0;outline:none;" />`
    : `<div style="width:60px;height:60px;border-radius:12px;background:${BRAND.creamSoft};"></div>`

  return `
<tr>
  <td style="padding:10px 0;${isLast ? '' : `border-bottom:1px solid ${BRAND.hairline};`}">
    <a href="${escapeAttr(u.href)}" style="display:block;text-decoration:none;color:inherit;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;width:60px;padding-right:14px;">${thumb}</td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-family:${SANS};font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.tangerine};">
              ${escapeHtml(KIND_LABEL[u.kind])}
            </p>
            <p style="margin:4px 0 1px;font-family:${SANS};font-size:15px;font-weight:700;letter-spacing:-0.008em;color:${BRAND.ink};line-height:1.3;">
              ${escapeHtml(u.primary)}
            </p>
            <p style="margin:0;font-family:${SANS};font-size:12.5px;color:${BRAND.graphite};line-height:1.4;">
              ${escapeHtml(u.secondary)}
            </p>
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>`
}

/* ─────────────── Blog teaser (the signature brand-grad module) ─────────────── */

function renderBlogTeaser(post: DigestBlogPost, cleanBase: string): string {
  const postUrl = `${cleanBase}/blog/${post.slug}`
  const cover = post.coverImage
    ? `<tr><td style="padding:0;"><img src="${escapeAttr(post.coverImage)}" width="640" alt="" style="display:block;width:100%;max-width:640px;height:auto;border-radius:20px 20px 0 0;border:0;outline:none;" /></td></tr>`
    : ''

  return `
<tr>
  <td style="padding:24px 0 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND_GRAD};background-color:${BRAND.tangerine};border-radius:20px;overflow:hidden;">
      ${cover}
      <tr>
        <td style="padding:28px 28px 30px;">
          <p style="margin:0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FFF6EC;">
            From the Reelst desk · ${post.readTime} min read
          </p>
          <h2 style="margin:10px 0 12px;font-family:${SANS};font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.022em;color:#FFFFFF;">
            ${escapeHtml(post.title)}
          </h2>
          <p style="margin:0 0 22px;font-family:${SANS};font-size:14px;line-height:1.55;color:#FFF6EC;">
            ${escapeHtml(post.excerpt)}
          </p>
          <a href="${escapeAttr(postUrl)}" style="display:inline-block;padding:12px 22px;background:#FFFFFF;color:${BRAND.tangerine};font-family:${SANS};font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;border-radius:999px;">
            Read the post →
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

/* ─────────────── Quiet-week agent roster ─────────────── */

function renderAgentRoster(agents: DigestAgent[], cleanBase: string): string {
  const rows = agents.map((a, i) => {
    const profileUrl = `${cleanBase}/${a.username}`
    const avatar = a.photoURL
      ? `<img src="${escapeAttr(a.photoURL)}" width="36" height="36" alt="${escapeAttr(a.displayName)}" style="display:block;width:36px;height:36px;border-radius:50%;border:0;outline:none;text-decoration:none;" />`
      : `<div style="width:36px;height:36px;border-radius:50%;background:${BRAND_GRAD};background-color:${BRAND.tangerine};color:#FFFFFF;font-family:${SANS};font-size:14px;font-weight:700;line-height:36px;text-align:center;">${escapeHtml(a.displayName.charAt(0).toUpperCase())}</div>`
    return `
<tr>
  <td style="padding:12px 0;${i === agents.length - 1 ? '' : `border-bottom:1px solid ${BRAND.hairline};`}">
    <a href="${escapeAttr(profileUrl)}" style="display:block;text-decoration:none;color:inherit;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="vertical-align:middle;width:36px;padding-right:14px;">${avatar}</td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-family:${SANS};font-size:14.5px;font-weight:700;color:${BRAND.ink};">${escapeHtml(a.displayName)}</p>
            <p style="margin:0;font-family:${SANS};font-size:11.5px;color:${BRAND.smoke};">@${escapeHtml(a.username)}</p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.tangerine};">View map →</span>
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>`
  }).join('\n')

  return `
<tr>
  <td style="padding:24px 0 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.ivory};border:1px solid ${BRAND.hairline};border-radius:20px;">
      <tr>
        <td style="padding:20px 24px 6px;">
          <p style="margin:0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.graphite};">
            The agents you follow
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

/* ─────────────── Subject / headline copy ─────────────── */

function buildIntroCopy(args: {
  totalUpdates: number
  agentsWithUpdates: DigestAgent[]
  totalAgents: number
  blogPost: DigestBlogPost | null
  name: string
}): { subject: string; preheader: string; headlineEyebrow: string; headline: string } {
  const { totalUpdates, agentsWithUpdates, totalAgents, blogPost } = args

  if (totalUpdates > 0) {
    const subject = composeUpdateSubject(agentsWithUpdates)
    const headline = totalUpdates === 1
      ? 'One new move on your map this week.'
      : `${totalUpdates} new moves on your map this week.`
    return {
      subject,
      preheader: `${totalUpdates} ${totalUpdates === 1 ? 'update' : 'updates'} from ${agentsWithUpdates.length} of your subscriptions.`,
      headlineEyebrow: 'This week',
      headline,
    }
  }

  if (blogPost) {
    return {
      subject: 'A quiet week — one thing worth reading.',
      preheader: 'No new pins this week, but a fresh read from the Reelst desk.',
      headlineEyebrow: 'This week',
      headline: 'Quiet on the map. Loud on the page.',
    }
  }

  return {
    subject: `All quiet on your subscribed ${totalAgents === 1 ? 'agent' : 'agents'}.`,
    preheader: 'No new updates this week — your roster is below.',
    headlineEyebrow: 'This week',
    headline: 'A quiet one. The roster you follow is below.',
  }
}

function composeUpdateSubject(agents: DigestAgent[]): string {
  const n = agents.length
  const totalUpdates = agents.reduce((acc, a) => acc + a.updates.length, 0)

  if (n >= 4) return `${totalUpdates} new moves on your map`

  if (n === 1) {
    const a = agents[0]
    if (a.updates.length === 1) {
      const verb = singleUpdateVerb(a.updates[0].kind, a.displayName.split(' ')[0])
      if (verb) return verb
      return `${a.displayName.split(' ')[0]} has something new on the map`
    }
    return `${a.displayName} has ${a.updates.length} new moves on the map`
  }

  const firsts = agents.map((a) => a.displayName.split(' ')[0])
  const joined = n === 2 ? `${firsts[0]} & ${firsts[1]}` : `${firsts[0]}, ${firsts[1]} & ${firsts[2]}`
  return `${joined} have new moves on the map`
}

function singleUpdateVerb(kind: DigestUpdateKind, firstName: string): string | null {
  switch (kind) {
    case 'new_listing':    return `${firstName} just listed something new`
    case 'new_sold':       return `${firstName} just closed a sale`
    case 'new_spotlight':  return `${firstName} dropped a new spotlight`
    case 'new_open_house': return `${firstName} has an open house coming up`
    case 'new_content':    return `${firstName} posted something new`
    default:               return null
  }
}

/* ─────────────── Date helper ─────────────── */

function formatMastheadDate(d: Date): string {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/* ─────────────── HTML escapers ─────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/&/g, '&amp;')
}
