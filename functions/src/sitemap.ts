/**
 * Cloud Function: Sitemap.xml generation
 *
 * Serves /sitemap.xml dynamically — lists all public agent profiles.
 * Cached for 1 hour. Tells search engines what to index.
 *
 * Setup at the hosting level (firebase.json):
 *   {
 *     "hosting": {
 *       "rewrites": [
 *         { "source": "/sitemap.xml", "function": "sitemap" }
 *       ]
 *     }
 *   }
 */

import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const SITE_URL = 'https://reel.st'

interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly'
  priority?: number
}

function buildSitemapXML(entries: SitemapEntry[]): string {
  const urls = entries.map((e) => {
    const lastmod = e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''
    const changefreq = e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ''
    const priority = e.priority !== undefined ? `<priority>${e.priority}</priority>` : ''
    return `  <url>
    <loc>${e.loc}</loc>
    ${lastmod}
    ${changefreq}
    ${priority}
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export const sitemap = functions.https.onRequest(async (_req, res) => {
  try {
    const db = admin.firestore()

    // Static marketing pages
    const entries: SitemapEntry[] = [
      { loc: SITE_URL, changefreq: 'weekly', priority: 1.0 },
      { loc: `${SITE_URL}/for-agents`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${SITE_URL}/pricing`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${SITE_URL}/explore`, changefreq: 'weekly', priority: 0.7 },
      { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: 0.5 },
    ]

    // All public agent profiles
    const agentsSnap = await db
      .collection('users')
      .where('role', '==', 'agent')
      .where('onboardingComplete', '==', true)
      .get()

    for (const doc of agentsSnap.docs) {
      const data = doc.data()
      if (!data.username) continue
      entries.push({
        loc: `${SITE_URL}/${data.username}`,
        lastmod: data.updatedAt?.toDate?.()?.toISOString()?.split('T')[0],
        changefreq: 'weekly',
        priority: 0.9,
      })
    }

    const xml = buildSitemapXML(entries)

    res.set('Content-Type', 'application/xml; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    res.status(200).send(xml)
  } catch (e) {
    console.error('Sitemap function error:', e)
    res.status(500).send('Sitemap generation failed')
  }
})
