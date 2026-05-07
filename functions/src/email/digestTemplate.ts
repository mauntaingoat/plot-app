/**
 * Weekly digest email template — sent to people who saved/subscribed
 * to one or more agents. Fires Sunday 9am via the sendWeeklyDigest
 * Cloud Function (Phase 2). Mirrors the brand language of the auth
 * emails (white header → grid section → white footer) but the body
 * is per-agent update cards instead of a single CTA.
 *
 * IMPORTANT: This file is mirrored at src/lib/digestEmailTemplate.ts.
 * The frontend copy powers /dev/email-preview; this copy is what
 * actually ships in sent emails. Keep them in sync — change one,
 * change the other.
 *
 * Three render cases:
 *   1. `agentsWithUpdates.length > 0`        → per-agent update cards
 *   2. updates empty, `blogPost` present     → "no updates this week" + blog teaser
 *   3. updates empty, blogPost null          → "no updates this week" + linkable list of saved agents
 */

export type DigestUpdateKind =
  | 'new_listing'        // for_sale pin
  | 'new_sold'           // sold pin
  | 'new_spotlight'      // spotlight pin
  | 'new_open_house'     // open house added to existing for_sale pin
  | 'new_content'        // reel/photo/carousel added to existing pin

export interface DigestUpdate {
  kind: DigestUpdateKind
  /** Pin address or spotlight name. */
  primary: string
  /** "$1.2M" / "Sold $980K" / "Sat Aug 17 · 2-5pm" / "New reel" */
  secondary: string
  /** Pin/content hero image URL. */
  thumbnail?: string | null
  /** Where the link in the card points — typically /<username> or /<username>?pin=<id>. */
  href: string
}

export interface DigestAgent {
  username: string
  displayName: string
  photoURL: string | null
  /** Already filtered + ordered list of updates this digest cycle.
   *  Empty array means "no updates from this agent" — the renderer
   *  decides whether to show or hide the agent block. */
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
  /** All agents the recipient is subscribed to, in alpha or recency order.
   *  The renderer separates them into "with updates" vs "no updates" itself. */
  agents: DigestAgent[]
  /** Latest blog post published since recipient's last digest. Null if
   *  no new post (or repeated post). Used as fallback content when no
   *  agent updates exist. */
  blogPost: DigestBlogPost | null
  /** Recipient's display name if we have one, else null → "there". */
  recipientName: string | null
  /** Email address — shown in footer, used for reply-to. */
  fromAddress: string
  /** Origin for hosted images + agent profile links + unsub URL. */
  baseUrl: string
  /** Per-recipient unsubscribe URL (carries token). Required. */
  unsubUrl: string
}

interface RenderOutput {
  subject: string
  html: string
  text: string
}

const BRAND = {
  tangerine: '#D94A1F',
  tangerineLight: '#FF8552',
  ink: '#0A0E1A',
  graphite: '#475569',
  smoke: '#94A3B8',
  pearl: '#E2E8F0',
  cream: '#F8F5F0',
  warmWhite: '#FAF7F2',
  ivory: '#FFFCF7',
  gridBase: '#FFF3EA',
}

const KIND_BADGE: Record<DigestUpdateKind, { label: string; color: string; bg: string }> = {
  new_listing:    { label: 'NEW LISTING',  color: '#1E40AF', bg: '#DBEAFE' },
  new_sold:       { label: 'JUST SOLD',    color: '#15803D', bg: '#DCFCE7' },
  new_spotlight:  { label: 'SPOTLIGHT',    color: '#9333EA', bg: '#F3E8FF' },
  new_open_house: { label: 'OPEN HOUSE',   color: '#B45309', bg: '#FEF3C7' },
  new_content:    { label: 'NEW POST',     color: BRAND.tangerine, bg: '#FFE7DA' },
}

const GRID_CSS = `
.reelst-grid-bg {
  background-color: ${BRAND.gridBase};
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'><path d='M 40 0 L 0 0 0 40' stroke='%23FF7A4D' stroke-opacity='0.08' stroke-width='1'/></svg>"),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='none'><path d='M 200 0 L 0 0 0 200' stroke='%23FF7A4D' stroke-opacity='0.12' stroke-width='1.25'/></svg>"),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' fill='none'><rect x='120' y='80' width='44' height='28' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><rect x='380' y='220' width='28' height='36' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><rect x='200' y='420' width='56' height='24' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><rect x='460' y='480' width='32' height='32' rx='3' fill='%23FF7A4D' fill-opacity='0.05'/><circle cx='320' cy='160' r='3' fill='%23FF7A4D' fill-opacity='0.18'/><circle cx='520' cy='360' r='3' fill='%23FF7A4D' fill-opacity='0.18'/><circle cx='80' cy='520' r='3' fill='%23FF7A4D' fill-opacity='0.18'/></svg>");
  background-size: 40px 40px, 200px 200px, 600px 600px;
  background-position: 0 0, 0 0, 0 0;
  background-repeat: repeat, repeat, repeat;
}
`.trim()

export function renderDigestEmail({ agents, blogPost, recipientName, fromAddress, baseUrl, unsubUrl }: RenderInput): RenderOutput {
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const name = (recipientName || '').trim().split(' ')[0]
  const greeting = name ? `Hey ${name},` : 'Hey there,'

  const logoUrl = `${cleanBase}/reelst-logo.png`
  const privacyUrl = `${cleanBase}/privacy`
  const termsUrl = `${cleanBase}/terms`

  const agentsWithUpdates = agents.filter((a) => a.updates.length > 0)
  const agentsWithoutUpdates = agents.filter((a) => a.updates.length === 0)
  const totalUpdates = agentsWithUpdates.reduce((n, a) => n + a.updates.length, 0)

  // Subject + intro line vary by case to avoid the "boring digest" feel.
  const { subject, preheader, introLead, introBody } = buildIntroCopy({
    totalUpdates,
    agentsWithUpdates,
    totalAgents: agents.length,
    blogPost,
    name,
  })

  const bodyContent = renderBody({
    cleanBase,
    agentsWithUpdates,
    agentsWithoutUpdates,
    blogPost,
    hasUpdates: agentsWithUpdates.length > 0,
  })

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    ${GRID_CSS}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FFFFFF;">${escapeHtml(preheader)}</div>

  <!-- ── Band 1: white header with logo lockup ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:36px 16px 28px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <img src="${escapeAttr(logoUrl)}" width="48" height="48" alt="Reelst" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:30px;font-weight:700;letter-spacing:-0.028em;color:${BRAND.ink};">Reelst</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ── Band 2: grid section with greeting, intro, per-agent updates ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="reelst-grid-bg" style="background-color:${BRAND.gridBase};">
    <tr>
      <td align="center" style="padding:8px 16px 36px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

          <!-- Intro card (white, the constant top piece) -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background:#FFFFFF;border-radius:20px;border:1px solid rgba(255,133,82,0.18);box-shadow:0 20px 60px -24px rgba(217,74,31,0.18),0 6px 20px -10px rgba(10,14,23,0.06);">
                <tr>
                  <td style="padding:32px 32px 28px;text-align:center;">
                    <span style="display:inline-block;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.tangerine};">${escapeHtml(introLead)}</span>
                    <h1 style="margin:6px 0 8px;font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.018em;color:${BRAND.ink};text-align:center;">
                      ${escapeHtml(greeting)}
                    </h1>
                    <p style="margin:0;font-size:14.5px;line-height:1.6;color:${BRAND.graphite};text-align:center;">
                      ${escapeHtml(introBody)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${bodyContent}

        </table>
      </td>
    </tr>
  </table>

  <!-- ── Band 3: white footer ── -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;">
    <tr>
      <td align="center" style="padding:28px 32px 32px;">
        <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;">
          <tr>
            <td align="center">
              <p style="margin:0 0 18px;font-size:12px;line-height:1.5;color:${BRAND.smoke};">
                <a href="${escapeAttr(privacyUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(termsUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Terms of Use</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(unsubUrl)}" style="color:${BRAND.graphite};text-decoration:underline;">Manage subscriptions</a>
              </p>
              <p style="margin:0;font-size:11.5px;line-height:1.55;color:${BRAND.smoke};">
                Reelst is a DBA of <strong style="color:${BRAND.graphite};font-weight:600;">Avigage Systems Inc.</strong>
              </p>
              <p style="margin:6px 0 0;font-size:11.5px;color:${BRAND.smoke};">
                Reach us anytime at
                <a href="mailto:${escapeAttr(fromAddress)}" style="color:${BRAND.smoke};text-decoration:underline;">${escapeHtml(fromAddress)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // Plain-text fallback: a much simpler shape — agents + updates as
  // a flat list, blog teaser at the end, unsub link.
  const textLines: string[] = [greeting, '', introBody, '']
  if (agentsWithUpdates.length > 0) {
    for (const a of agentsWithUpdates) {
      textLines.push(`— ${a.displayName} (@${a.username}) ${cleanBase}/${a.username}`)
      for (const u of a.updates) {
        textLines.push(`   • [${KIND_BADGE[u.kind].label}] ${u.primary} — ${u.secondary}`)
      }
      textLines.push('')
    }
  }
  if (blogPost) {
    textLines.push(`From the Reelst blog: ${blogPost.title}`)
    textLines.push(blogPost.excerpt)
    textLines.push(`Read more: ${cleanBase}/blog/${blogPost.slug}`)
    textLines.push('')
  }
  if (agentsWithoutUpdates.length > 0 && agentsWithUpdates.length === 0) {
    textLines.push('Your saved agents:')
    for (const a of agentsWithoutUpdates) {
      textLines.push(`  ${a.displayName} — ${cleanBase}/${a.username}`)
    }
    textLines.push('')
  }
  textLines.push('—')
  textLines.push('Reelst — where listings come alive')
  textLines.push('A DBA of Avigage Systems Inc.')
  textLines.push(`Manage subscriptions: ${unsubUrl}`)
  textLines.push(`Reply to: ${fromAddress}`)

  return { subject, html, text: textLines.join('\n') }
}

/* ─────────────── Subject / preheader / intro copy ─────────────── */

function buildIntroCopy(args: {
  totalUpdates: number
  agentsWithUpdates: DigestAgent[]
  totalAgents: number
  blogPost: DigestBlogPost | null
  name: string
}): { subject: string; preheader: string; introLead: string; introBody: string } {
  const { totalUpdates, agentsWithUpdates, totalAgents, blogPost } = args
  const agentsWithUpdatesCount = agentsWithUpdates.length

  // Subject line follows the "C — hybrid" pattern: name names when
  // ≤3 agents have updates, fall back to count when more, fall back
  // to brand voice on quiet weeks.
  if (totalUpdates > 0) {
    const subject = composeUpdateSubject(agentsWithUpdates)
    const body = agentsWithUpdatesCount === totalAgents
      ? `Here's what's new across all ${totalAgents} ${totalAgents === 1 ? 'agent' : 'agents'} you follow.`
      : `${agentsWithUpdatesCount} of your ${totalAgents} saved ${totalAgents === 1 ? 'agent' : 'agents'} posted something new this week.`
    return {
      subject,
      preheader: 'Listings, sales, and open houses from agents you follow.',
      introLead: 'Your weekly digest',
      introBody: body,
    }
  }

  if (blogPost) {
    return {
      subject: 'Quiet week — but we wrote something for you',
      preheader: 'No new listings this week, but the latest from the Reelst blog.',
      introLead: 'Your weekly digest',
      introBody: "No new listings, sales, or open houses from your saved agents this week — but here's a fresh read from us.",
    }
  }

  return {
    subject: 'All quiet on your maps this week',
    preheader: 'No new updates this week — your agents are below.',
    introLead: 'Your weekly digest',
    introBody: "Nothing new from your saved agents this week. We'll keep an eye on them — and so can you, anytime.",
  }
}

/**
 * "C — hybrid" subject pattern:
 *   - 1 agent / 1 update      → "Maya just listed something new" (kind-aware)
 *   - 1 agent / multi update  → "Maya Lopez has 3 new things on her map"
 *   - 2 agents                → "Maya & David have updates"
 *   - 3 agents                → "Maya, David & Sarah have updates"
 *   - 4+ agents               → "Updates from 5 of your saved agents"
 */
function composeUpdateSubject(agents: DigestAgent[]): string {
  const n = agents.length
  if (n >= 4) {
    return `Updates from ${n} of your saved agents`
  }

  if (n === 1) {
    const a = agents[0]
    if (a.updates.length === 1) {
      const verb = singleUpdateVerb(a.updates[0].kind, a.displayName.split(' ')[0])
      if (verb) return verb
      return `${a.displayName.split(' ')[0]} has something new on their map`
    }
    return `${a.displayName} has ${a.updates.length} new things on their map`
  }

  // 2 or 3 agents — list first names with proper grammar
  const firsts = agents.map((a) => a.displayName.split(' ')[0])
  const joined = n === 2 ? `${firsts[0]} & ${firsts[1]}` : `${firsts[0]}, ${firsts[1]} & ${firsts[2]}`
  return `${joined} have updates`
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

/* ─────────────── Body composition ─────────────── */

function renderBody(args: {
  cleanBase: string
  agentsWithUpdates: DigestAgent[]
  agentsWithoutUpdates: DigestAgent[]
  blogPost: DigestBlogPost | null
  hasUpdates: boolean
}): string {
  const { cleanBase, agentsWithUpdates, agentsWithoutUpdates, blogPost, hasUpdates } = args
  const sections: string[] = []

  // Per-agent update cards (white cards on grid bg)
  for (const a of agentsWithUpdates) {
    sections.push(renderAgentCard(a, cleanBase))
  }

  // Blog teaser — show when (a) no updates at all, or (b) bonus content
  // alongside updates. For now, only shown when no updates, to keep the
  // digest focused. Comment out the `&& !hasUpdates` to always show.
  if (blogPost && !hasUpdates) {
    sections.push(renderBlogCard(blogPost, cleanBase))
  }

  // No updates, no blog → simple "your agents" linkable list
  if (!hasUpdates && !blogPost && agentsWithoutUpdates.length > 0) {
    sections.push(renderAgentRoster(agentsWithoutUpdates, cleanBase))
  }

  return sections.join('\n')
}

function renderAgentCard(agent: DigestAgent, cleanBase: string): string {
  const profileUrl = `${cleanBase}/${agent.username}`
  const avatarBlock = agent.photoURL
    ? `<img src="${escapeAttr(agent.photoURL)}" width="44" height="44" alt="${escapeAttr(agent.displayName)}" style="display:block;width:44px;height:44px;border-radius:50%;border:0;outline:none;text-decoration:none;" />`
    : `<div style="width:44px;height:44px;border-radius:50%;background:${BRAND.tangerineLight};color:#FFFFFF;font-size:18px;font-weight:700;line-height:44px;text-align:center;font-family:-apple-system,sans-serif;">${escapeHtml(agent.displayName.charAt(0).toUpperCase())}</div>`

  const updateRows = agent.updates.map((u) => renderUpdateRow(u)).join('\n')

  return `
<tr>
  <td align="center" style="padding:14px 0 0;">
    <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background:#FFFFFF;border-radius:20px;border:1px solid rgba(255,133,82,0.14);box-shadow:0 8px 28px -16px rgba(10,14,23,0.10);">
      <tr>
        <td style="padding:18px 22px 4px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;width:44px;padding-right:12px;">${avatarBlock}</td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:15px;font-weight:700;letter-spacing:-0.012em;color:${BRAND.ink};">${escapeHtml(agent.displayName)}</p>
                <a href="${escapeAttr(profileUrl)}" style="font-size:12px;color:${BRAND.smoke};text-decoration:none;">@${escapeHtml(agent.username)}</a>
              </td>
              <td align="right" style="vertical-align:middle;">
                <a href="${escapeAttr(profileUrl)}" style="font-size:11.5px;font-weight:600;color:${BRAND.tangerine};text-decoration:none;letter-spacing:-0.005em;">View map &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 14px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${updateRows}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

function renderUpdateRow(u: DigestUpdate): string {
  const badge = KIND_BADGE[u.kind]
  const thumb = u.thumbnail
    ? `<img src="${escapeAttr(u.thumbnail)}" width="60" height="60" alt="" style="display:block;width:60px;height:60px;border-radius:10px;object-fit:cover;border:0;outline:none;" />`
    : `<div style="width:60px;height:60px;border-radius:10px;background:${BRAND.cream};"></div>`

  return `
<tr>
  <td style="padding:8px;">
    <a href="${escapeAttr(u.href)}" style="display:block;text-decoration:none;color:inherit;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAF7F2;border-radius:14px;">
        <tr>
          <td style="vertical-align:middle;width:60px;padding:8px;">${thumb}</td>
          <td style="vertical-align:middle;padding:8px 12px 8px 0;">
            <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${badge.bg};color:${badge.color};font-size:10px;font-weight:700;letter-spacing:0.06em;">${escapeHtml(badge.label)}</span>
            <p style="margin:6px 0 2px;font-size:13.5px;font-weight:600;color:${BRAND.ink};line-height:1.3;">${escapeHtml(u.primary)}</p>
            <p style="margin:0;font-size:12.5px;color:${BRAND.graphite};line-height:1.35;">${escapeHtml(u.secondary)}</p>
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>`
}

function renderBlogCard(post: DigestBlogPost, cleanBase: string): string {
  const postUrl = `${cleanBase}/blog/${post.slug}`
  const cover = post.coverImage
    ? `<img src="${escapeAttr(post.coverImage)}" width="540" alt="" style="display:block;width:100%;max-width:540px;height:auto;border-radius:14px 14px 0 0;border:0;outline:none;" />`
    : ''

  return `
<tr>
  <td align="center" style="padding:14px 0 0;">
    <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background:#FFFFFF;border-radius:20px;border:1px solid rgba(255,133,82,0.14);overflow:hidden;box-shadow:0 8px 28px -16px rgba(10,14,23,0.10);">
        ${cover ? `<tr><td>${cover}</td></tr>` : ''}
        <tr>
          <td style="padding:22px 24px 24px;">
            <span style="display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.tangerine};">From the blog · ${escapeHtml(post.category)} · ${post.readTime} min read</span>
            <h2 style="margin:6px 0 8px;font-size:20px;line-height:1.25;font-weight:700;letter-spacing:-0.018em;color:${BRAND.ink};">
              ${escapeHtml(post.title)}
            </h2>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${BRAND.graphite};">${escapeHtml(post.excerpt)}</p>
            <a href="${escapeAttr(postUrl)}" style="display:inline-block;padding:10px 22px;background:${BRAND.tangerine};background-image:linear-gradient(135deg,${BRAND.tangerineLight} 0%,${BRAND.tangerine} 100%);color:#FFFFFF;font-size:13px;font-weight:600;letter-spacing:-0.005em;text-decoration:none;border-radius:999px;">Read the post &rarr;</a>
          </td>
        </tr>
    </table>
  </td>
</tr>`
}

function renderAgentRoster(agents: DigestAgent[], cleanBase: string): string {
  const rows = agents.map((a) => {
    const profileUrl = `${cleanBase}/${a.username}`
    const avatar = a.photoURL
      ? `<img src="${escapeAttr(a.photoURL)}" width="32" height="32" alt="${escapeAttr(a.displayName)}" style="display:block;width:32px;height:32px;border-radius:50%;border:0;outline:none;text-decoration:none;" />`
      : `<div style="width:32px;height:32px;border-radius:50%;background:${BRAND.tangerineLight};color:#FFFFFF;font-size:13px;font-weight:700;line-height:32px;text-align:center;">${escapeHtml(a.displayName.charAt(0).toUpperCase())}</div>`
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BRAND.pearl};">
          <a href="${escapeAttr(profileUrl)}" style="display:block;text-decoration:none;color:inherit;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:middle;width:32px;padding-right:12px;">${avatar}</td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.ink};">${escapeHtml(a.displayName)}</p>
                  <p style="margin:0;font-size:12px;color:${BRAND.smoke};">@${escapeHtml(a.username)}</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="font-size:11.5px;font-weight:600;color:${BRAND.tangerine};">View map &rarr;</span>
                </td>
              </tr>
            </table>
          </a>
        </td>
      </tr>`
  }).join('\n')

  return `
<tr>
  <td align="center" style="padding:14px 0 0;">
    <table role="presentation" width="540" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;background:#FFFFFF;border-radius:20px;border:1px solid rgba(255,133,82,0.14);box-shadow:0 8px 28px -16px rgba(10,14,23,0.10);">
      <tr>
        <td style="padding:20px 24px 8px;">
          <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.ink};">Your saved agents</h3>
          <p style="margin:0 0 10px;font-size:12px;color:${BRAND.smoke};">Tap an agent to see their map.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
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
