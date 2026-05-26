import { useEffect } from 'react'

interface SEOHeadProps {
  title?: string
  description?: string
  ogImage?: string
  path?: string
}

const BASE_URL = 'https://www.reel.st'
const DEFAULT_TITLE = 'Reelst, The Link in Your Bio for Real Estate Agents'
const DEFAULT_DESC = 'A live map of your listings married to the reels, walkthroughs, and neighborhood spotlights you already make, every part of your real estate brand on one shareable link.'
const DEFAULT_OG = '/icons/og-image.png'

export function SEOHead({ title, description, ogImage, path = '' }: SEOHeadProps) {
  const fullTitle = title ? `${title}, Reelst` : DEFAULT_TITLE
  const desc = description || DEFAULT_DESC
  const img = ogImage || DEFAULT_OG
  const url = `${BASE_URL}${path}`

  useEffect(() => {
    document.title = fullTitle

    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    // Tell search engines that www.reel.st is the canonical host even
    // when the page is served from plot-fe990.web.app, plot-fe990.firebaseapp.com,
    // or the apex reel.st — otherwise Google indexes each hostname separately
    // and splits link equity. Apex reel.st 301s to www at the edge.
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', url)

    setMeta('description', desc)
    setMeta('og:title', fullTitle, true)
    setMeta('og:description', desc, true)
    setMeta('og:image', img, true)
    setMeta('og:url', url, true)
    setMeta('og:type', 'website', true)
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)
    setMeta('twitter:image', img)
  }, [fullTitle, desc, img, url])

  return null
}
