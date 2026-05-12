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

// Canonical share URL base. Hardcoded to current production until the
// reel.st domain ships — once DNS swaps over, update this in one place.
const PUBLIC_BASE_URL = 'https://plot-fe990.web.app'
const DEFAULT_OG_IMAGE = `${PUBLIC_BASE_URL}/icons/og-image.png`

// In-memory cache of the SPA shell. Vite builds index.html with
// content-hashed asset refs that change on deploy; we cache for the
// life of the function instance and accept a tiny lag (one cold
// start) after a fresh deploy. Hosting serves /index.html directly
// from the static bucket — no rewrite re-trigger.
let cachedIndexHtml: string | null = null
async function getIndexHtml(): Promise<string> {
  if (cachedIndexHtml) return cachedIndexHtml
  const resp = await fetch(`${PUBLIC_BASE_URL}/index.html`)
  if (!resp.ok) throw new Error(`index.html fetch ${resp.status}`)
  cachedIndexHtml = await resp.text()
  return cachedIndexHtml
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

function buildAgentHTML(agent: any, url: string): string {
  const title = `${agent.displayName} on Reelst`
  const desc = agent.bio || `${agent.displayName} — interactive map of listings, reels, and spotlights.`
  const image = agent.photoURL || DEFAULT_OG_IMAGE

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
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
    const url = `${PUBLIC_BASE_URL}/${segment}`
    const html = buildAgentHTML(agent, url)

    res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (e) {
    console.error('OG function error:', e)
    await serveSpaShell(res)
  }
})
