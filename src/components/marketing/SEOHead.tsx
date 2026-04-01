import { useEffect } from 'react'

interface SEOHeadProps {
  title?: string
  description?: string
  ogImage?: string
  path?: string
}

const BASE_URL = 'https://reeltor.co'
const DEFAULT_TITLE = 'Reeltor — Where Listings Come Alive'
const DEFAULT_DESC = 'One link. A live map of your listings, stories, reels, and open houses. The modern agent\'s profile, built for content.'
const DEFAULT_OG = '/reeltor-logo-4b.png'

export function SEOHead({ title, description, ogImage, path = '' }: SEOHeadProps) {
  const fullTitle = title ? `${title} — Reeltor` : DEFAULT_TITLE
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
