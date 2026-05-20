/**
 * Cloud Function: Dynamic Open Graph meta injection for crawlers
 *
 * Detects social media crawlers (Facebook, Twitter, iMessage, Slack, etc.)
 * and serves a custom HTML response with agent-specific OG meta tags.
 * Real users get the SPA as normal.
 *
 * Deploy: firebase deploy --only functions:og
 *
 * Setup at the hosting level (firebase.json):
 *   {
 *     "hosting": {
 *       "rewrites": [
 *         { "source": "/:username", "function": "og" },
 *         { "source": "**", "destination": "/index.html" }
 *       ]
 *     }
 *   }
 */

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'WhatsApp',
  'TelegramBot',
  'Discordbot',
  'iMessageLinkPreview',
  'Mastodon',
  'Pinterest',
  'redditbot',
  'Googlebot',
  'bingbot',
  'Applebot',
  'DuckDuckBot',
  'Embedly',
]

// Single-segment paths that are NOT usernames. The /:username rewrite
// catches all single-segment hits, so the og function has to guard
// against trying to look these up as agents.
const RESERVED_PATHS = new Set([
  'about', 'pricing', 'blog', 'glossary', 'terms', 'privacy',
  'sign-up', 'sign-in', 'welcome', 'verify', 'dashboard',
  'saved', 'dev', 'u', 'auth', 'sitemap.xml', 'robots.txt',
  'favicon.ico', 'icons', 'email', 'marketing', 'index.html',
])

// Where to fetch the SPA shell from. Always the Firebase Hosting
// origin — stable, CDN-backed, and serves /index.html as a static file
// regardless of which custom domain (reel.st, plot-fe990.web.app, etc.)
// the request actually came in on. Keep this on the .web.app domain
// even though reel.st is canonical — Firebase serves /index.html
// directly from this host without DNS/cert hops.
const SHELL_ORIGIN = 'https://plot-fe990.web.app'

// Canonical site URL used in og:url and other meta when we can't
// derive the request's host from headers (function hit via run.app,
// crawler hits without x-forwarded-host, etc.). Was the .web.app
// host until reel.st went live.
const CANONICAL_ORIGIN = 'https://reel.st'

// Default OG image when an agent has no photo. Points to the branded
// 1024×1024 app icon that ships in public/icons. Width/height are
// emitted in the meta tags so crawlers can reserve layout space.
const DEFAULT_OG_IMAGE_PATH = '/icons/icon-1024-branded.png'
const DEFAULT_OG_IMAGE_WIDTH = 1024
const DEFAULT_OG_IMAGE_HEIGHT = 1024

// Build the public-facing origin from the request.
//
// Firebase Hosting rewrites `/:username` to this Cloud Function. When
// it does, `req.get('host')` returns the FUNCTION's host
// (og-XXXXX-uc.a.run.app), not the user-facing Hosting host. Using
// that for og:image / og:url breaks every social preview — the image
// URL returns HTML, the canonical URL is wrong, etc.
//
// Hosting does forward the original host via `x-forwarded-host`,
// though, so prefer that. Fall back to the function host (handles the
// direct-function-URL case, e.g. when the function is hit via its own
// run.app URL during testing) and finally to HOSTING_ORIGIN.
//
// When reel.st DNS goes live, no change needed: x-forwarded-host will
// be `reel.st` and OG tags will follow automatically.
function publicOrigin(req: { get(name: string): string | undefined }): string {
  const forwardedHost = req.get('x-forwarded-host')
  const host = forwardedHost || req.get('host')
  const proto = req.get('x-forwarded-proto') || 'https'
  if (host && !host.includes('run.app')) return `${proto}://${host}`
  return CANONICAL_ORIGIN
}

// Fetch the SPA shell fresh on every request. Vite stamps content-
// hashed asset refs into index.html, and those hashes change on every
// deploy — caching the HTML in module memory caused warm function
// instances to serve dead asset URLs after a hosting deploy, breaking
// every reserved-path and unknown-username SPA load until cold start.
// Hosting serves /index.html as a static file (the `**` rewrite never
// fires for the exact path /index.html because the static file wins),
// so this is a fast, CDN-backed fetch — no recursive function call.
async function getIndexHtml(): Promise<string> {
  const resp = await fetch(`${SHELL_ORIGIN}/index.html`, {
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!resp.ok) throw new Error(`index.html fetch ${resp.status}`)
  return await resp.text()
}

// Loose response type — v2 doesn't re-export Response and we only
// need a few methods (set/status/send). Matches the Express Response
// that v1 onRequest hands us.
type HttpResponse = {
  set(name: string, value: string): unknown
  status(code: number): HttpResponse
  send(body: string): unknown
}
async function serveSpaShell(res: HttpResponse): Promise<void> {
  try {
    const html = await getIndexHtml()
    res.set('Cache-Control', 'no-cache')
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (err) {
    console.error('[og] failed to fetch SPA shell', err)
    res.status(502).send('Reelst is briefly unavailable. Please refresh.')
  }
}

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return CRAWLER_USER_AGENTS.some((crawler) => ua.includes(crawler.toLowerCase()))
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Format a number as USD with no decimals. Matches the client-side
// formatPrice() shape so previews read the same as the listing card.
function formatUSD(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  return '$' + Math.round(n).toLocaleString('en-US')
}

// Build a one-line listing summary used for og:description.
// Examples:
//   "$1,250,000 · 3 bd · 2 ba · 1,800 sqft · Miami Beach"
//   "Sold for $890,000 · 2 bd · 2 ba · Wynwood"
//   "Wynwood neighborhood spotlight"
function listingSummary(pin: any, agent: any): string {
  const parts: string[] = []
  if (pin.type === 'for_sale') {
    if (pin.price) parts.push(formatUSD(pin.price))
  } else if (pin.type === 'sold') {
    if (pin.soldPrice) parts.push(`Sold for ${formatUSD(pin.soldPrice)}`)
  }
  if (pin.beds) parts.push(`${pin.beds} bd`)
  if (pin.baths) parts.push(`${pin.baths} ba`)
  if (pin.sqft) parts.push(`${pin.sqft.toLocaleString('en-US')} sqft`)
  if (parts.length === 0 && pin.type === 'spotlight') {
    return `${pin.name || pin.address || 'Neighborhood'} spotlight by ${agent.displayName || 'agent'}.`
  }
  return parts.join(' · ') || `${agent.displayName || 'Agent'} listing on Reelst`
}

// Build pin-specific OG HTML. Used when a crawler hits
// `/{username}?pin=<id>` (deep link from the share modal). When
// `contentItem` is passed it overrides the OG image with the
// content's thumbnail/mediaUrl so a shared reel previews itself.
function buildPinHTML(
  pin: any,
  contentItem: any | null,
  agent: any,
  url: string,
): string {
  const address = pin.address ? pin.address.split(',')[0] : ''
  const title = address
    ? `${address} · ${agent.displayName || 'Reelst'}`
    : `${agent.displayName} on Reelst`
  const desc = listingSummary(pin, agent)
  const image =
    contentItem?.thumbnailUrl ||
    contentItem?.mediaUrl ||
    (contentItem?.mediaUrls && contentItem.mediaUrls[0]) ||
    pin.heroPhotoUrl ||
    (pin.photos && pin.photos[0]) ||
    agent.photoURL ||
    ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:site_name" content="Reelst" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(desc)}</p>
  <p>Visit <a href="${escapeHtml(url)}">${escapeHtml(url)}</a> to view this listing on Reelst.</p>
</body>
</html>`
}

function buildAgentHTML(agent: any, url: string, origin: string): string {
  const title = `${agent.displayName} on Reelst`
  const desc = agent.bio || `${agent.displayName} — interactive map of listings, reels, and spotlights.`
  const usingDefaultImage = !agent.photoURL
  const image = agent.photoURL || `${origin}${DEFAULT_OG_IMAGE_PATH}`
  const imageDimsMeta = usingDefaultImage
    ? `
  <meta property="og:image:width" content="${DEFAULT_OG_IMAGE_WIDTH}" />
  <meta property="og:image:height" content="${DEFAULT_OG_IMAGE_HEIGHT}" />`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />${imageDimsMeta}
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:site_name" content="Reelst" />
  <meta property="profile:username" content="${escapeHtml(agent.username || '')}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- Structured data -->
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: agent.displayName,
    url,
    image,
    description: desc,
    jobTitle: 'Real Estate Agent',
    worksFor: agent.brokerage ? { '@type': 'Organization', name: agent.brokerage } : undefined,
  })}
  </script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(desc)}</p>
  <p>Visit <a href="${escapeHtml(url)}">${escapeHtml(url)}</a> to view ${escapeHtml(agent.displayName)}'s interactive map of listings.</p>
</body>
</html>`
}

export const og = functions.https.onRequest(async (req, res) => {
  const userAgent = req.get('user-agent')
  // req.path is `/:username`; strip the leading slash + querystring.
  const rawPath = (req.path || '').replace(/^\/+/, '').split('?')[0]
  const segment = rawPath.toLowerCase()

  // Reserved single-segment paths (marketing pages, dashboard, etc.)
  // are NOT agent profiles. Serve the SPA inline so the path is
  // preserved and React Router handles the route.
  if (!segment || RESERVED_PATHS.has(segment)) {
    await serveSpaShell(res)
    return
  }

  // Real users — serve the SPA shell inline. Critical to NOT redirect
  // to /index.html here, because that would cause the browser to
  // navigate to /index.html, which (a) loses the username path and
  // (b) would be re-treated as a username by the /:username rewrite.
  if (!isCrawler(userAgent)) {
    await serveSpaShell(res)
    return
  }

  // Crawler — look up agent and build custom HTML
  try {
    const db = admin.firestore()
    const usernameDoc = await db.collection('usernames').doc(segment).get()
    if (!usernameDoc.exists) {
      // Unknown username — let the SPA handle it (renders the NotFound
      // page with its own OG tags).
      await serveSpaShell(res)
      return
    }
    const { uid } = usernameDoc.data() || {}
    const userDoc = await db.collection('users').doc(uid).get()
    if (!userDoc.exists) {
      await serveSpaShell(res)
      return
    }

    const agent = userDoc.data()
    // Always emit canonical (reel.st) URLs in OG meta — even when the
    // crawler hit us via plot-fe990.web.app or another alias. Prevents
    // Google from indexing duplicate URLs per hostname.
    const origin = CANONICAL_ORIGIN

    // Deep-link branch: `?pin=<id>` (optionally with `?content=<id>`)
    // points the share at a specific listing instead of the agent
    // profile. Render listing-shaped OG tags so iMessage / Slack /
    // FB preview the unit, not the general profile. Falls back to
    // agent HTML if the pin lookup fails for any reason (security:
    // pin must belong to this agent + be enabled + not archived).
    const pinIdRaw = req.query.pin
    const contentIdRaw = req.query.content
    const pinId = typeof pinIdRaw === 'string' ? pinIdRaw : ''
    const contentId = typeof contentIdRaw === 'string' ? contentIdRaw : ''

    if (pinId) {
      try {
        const pinSnap = await db.collection('pins').doc(pinId).get()
        if (pinSnap.exists) {
          const pin = pinSnap.data() as any
          const ownedByAgent = pin && pin.agentId === uid
          const visible = pin && pin.enabled !== false && pin.status !== 'archived'
          if (ownedByAgent && visible) {
            const contentItem =
              contentId && Array.isArray(pin.content)
                ? pin.content.find((c: any) => c && c.id === contentId) || null
                : null
            const qs = contentId
              ? `?pin=${encodeURIComponent(pinId)}&content=${encodeURIComponent(contentId)}`
              : `?pin=${encodeURIComponent(pinId)}`
            const url = `${origin}/${segment}${qs}`
            const html = buildPinHTML(pin, contentItem, agent, url)
            res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
            res.set('Content-Type', 'text/html; charset=utf-8')
            res.status(200).send(html)
            return
          }
        }
      } catch (err) {
        console.warn('[og] pin lookup failed, falling back to agent HTML', err)
        // fall through to agent HTML
      }
    }

    const url = `${origin}/${segment}`
    const html = buildAgentHTML(agent, url, origin)

    res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (e) {
    console.error('OG function error:', e)
    await serveSpaShell(res)
  }
})
