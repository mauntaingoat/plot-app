/**
 * Hover-to-preload for lazy-loaded routes.
 *
 * Every marketing page is registered with React.lazy() in App.tsx,
 * which means each page's JS chunk is only downloaded the first time
 * a user navigates to it. That first navigation can feel sluggish
 * (1-3s on cold cache) while the chunk is fetched + parsed.
 *
 * This helper triggers the same dynamic import on hover/focus so the
 * chunk is already cached by the time the user actually clicks. The
 * browser handles deduplication — calling import() twice for the same
 * module is free.
 *
 * Wire from a Link component's `onMouseEnter` + `onFocus`:
 *
 *   <Link to="/pricing"
 *     onMouseEnter={() => preloadRoute('/pricing')}
 *     onFocus={() => preloadRoute('/pricing')}>
 */

// Map route paths → matching lazy import. Keep in sync with the
// `lazy()` calls in src/App.tsx.
const PRELOADERS: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Home'),
  '/about': () => import('@/pages/About'),
  '/pricing': () => import('@/pages/Pricing'),
  '/blog': () => import('@/pages/Blog'),
  '/glossary': () => import('@/pages/Glossary'),
  '/terms': () => import('@/pages/Terms'),
  '/privacy': () => import('@/pages/Privacy'),
  '/sign-in': () => import('@/pages/SignIn'),
  '/sign-up': () => import('@/pages/Welcome'),
  '/welcome': () => import('@/pages/Welcome'),
}

const triggered = new Set<string>()

export function preloadRoute(path: string): void {
  // Strip query/hash so /pricing?ref=x preloads the same chunk as /pricing.
  const clean = path.split('?')[0].split('#')[0]
  if (triggered.has(clean)) return
  const preloader = PRELOADERS[clean]
  if (!preloader) return
  triggered.add(clean)
  preloader().catch(() => {
    // If preload fails (network blip, offline), forget about it so
    // a later hover can retry. The actual navigation will hit the
    // same failure with a real error UI, which is fine.
    triggered.delete(clean)
  })
}
