const MAX_CACHE_SIZE = 200
const cache = new Map<string, boolean>()
const pending = new Map<string, Promise<void>>()

function evictOldest() {
  if (cache.size <= MAX_CACHE_SIZE) return
  const first = cache.keys().next().value
  if (first) cache.delete(first)
}

export function preloadImage(url: string): Promise<void> {
  if (!url) return Promise.resolve()
  if (cache.has(url)) return Promise.resolve()
  if (pending.has(url)) return pending.get(url)!

  const p = new Promise<void>((resolve) => {
    const img = document.createElement('img')
    img.onload = () => { evictOldest(); cache.set(url, true); pending.delete(url); resolve() }
    img.onerror = () => { cache.set(url, true); pending.delete(url); resolve() }
    img.src = url
  })
  pending.set(url, p)
  return p
}

export function preloadImages(urls: string[]) {
  urls.forEach(preloadImage)
}

export function isImageCached(url: string): boolean {
  return cache.has(url)
}
