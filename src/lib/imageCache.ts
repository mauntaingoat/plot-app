const cache = new Map<string, HTMLImageElement>()
const pending = new Map<string, Promise<void>>()

export function preloadImage(url: string): Promise<void> {
  if (!url) return Promise.resolve()
  if (cache.has(url)) return Promise.resolve()
  if (pending.has(url)) return pending.get(url)!

  const p = new Promise<void>((resolve) => {
    const img = document.createElement('img')
    img.onload = () => { cache.set(url, img); pending.delete(url); resolve() }
    img.onerror = () => { cache.set(url, img); pending.delete(url); resolve() }
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
