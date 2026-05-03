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
  const image = agent.photoURL || 'https://reel.st/icons/og-image.png'

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
  const username = (req.params[0] || '').replace(/^\//, '').split('?')[0]

  // Real users — serve the SPA
  if (!isCrawler(userAgent)) {
    res.set('Cache-Control', 'public, max-age=3600')
    res.redirect(`/index.html`)
    return
  }

  // Crawler — look up agent and build custom HTML
  try {
    const db = admin.firestore()
    // Lookup by username
    const usernameDoc = await db.collection('usernames').doc(username.toLowerCase()).get()
    if (!usernameDoc.exists) {
      res.status(404).send('Agent not found')
      return
    }
    const { uid } = usernameDoc.data() || {}
    const userDoc = await db.collection('users').doc(uid).get()
    if (!userDoc.exists) {
      res.status(404).send('Agent not found')
      return
    }

    const agent = userDoc.data()
    const url = `https://reel.st/${username}`
    const html = buildAgentHTML(agent, url)

    res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(html)
  } catch (e) {
    console.error('OG function error:', e)
    res.redirect('/index.html')
  }
})
