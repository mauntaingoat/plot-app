/**
 * Reserved usernames — agents cannot claim these at signup because
 * they collide with route names, brand assets, or system-y identities.
 *
 * Usernames in our system are stored lowercase with letters only
 * (no digits, no underscores, no hyphens). So every entry here is in
 * "cleaned" form: `signup` not `sign-up`, `termsofuse` not
 * `terms-of-use`.
 *
 * KEEP IN SYNC WITH firestore.rules — the rule for /usernames/{id}
 * inlines this list as a `in [...]` check. If you add/remove here,
 * mirror the change in firestore.rules.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Current routes
  'about', 'pricing', 'blog', 'glossary', 'terms', 'privacy',
  'signup', 'signin', 'welcome', 'verify', 'dashboard',
  'saved', 'auth', 'dev', 'email', 'marketing', 'index',
  'u', 'sitemap', 'robots', 'favicon', 'icons',

  // Future likely routes
  'register', 'community', 'connect', 'termsofuse', 'privacypolicy',
  'explore', 'features', 'faq', 'faqs', 'contact', 'careers', 'jobs',
  'press', 'news', 'team', 'company', 'mission', 'story', 'brand',
  'partners', 'investors', 'media', 'plans',
  'download', 'app', 'mobile', 'ios', 'android', 'demo', 'trial',
  'pro', 'premium', 'enterprise', 'free',
  'agents', 'agent', 'broker', 'brokers', 'brokerage',
  'listings', 'listing', 'properties', 'property', 'homes', 'home',
  'neighborhoods', 'markets', 'reviews',
  'search', 'discover', 'browse', 'feed', 'nearby',
  'settings', 'account', 'accounts', 'profile', 'profiles',
  'billing', 'subscription', 'subscriptions', 'invoices',
  'payment', 'payments', 'notifications', 'inbox', 'messages', 'chat',

  // Standard reserved web identities
  'admin', 'administrator', 'root', 'owner', 'staff', 'moderator',
  'mod', 'support', 'help', 'helpdesk', 'security', 'legal',
  'compliance', 'abuse',
  'api', 'www', 'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets',
  'public', 'private',
  'login', 'logout', 'signout', 'me', 'you', 'myself', 'user', 'users',
  'noreply', 'nobody', 'null', 'undefined', 'anonymous', 'system',
  'bot', 'official',

  // Anti-impersonation
  'reelstofficial', 'realestate', 'realtor', 'mls', 'zillow', 'redfin', 'compass',

  // Anti-spam / customer-service squatting
  'info', 'hello', 'contact', 'customerservice', 'customer',
  'inquiry', 'inquiries', 'feedback',
])

/** Strip a raw input down to the canonical username form: lowercase,
 *  letters only. Returns the cleaned string (which may be empty). */
export function cleanUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, '')
}

/** True when the cleaned username is on the reserved blocklist. */
export function isReservedUsername(cleaned: string): boolean {
  return RESERVED_USERNAMES.has(cleaned)
}
