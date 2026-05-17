/**
 * Admin check for the CURRENT signed-in user.
 *
 * Backed by a Firebase Auth custom claim (`admin: true`) granted via
 * `functions/grant-admin.mjs`. The claim is read from the ID token at
 * sign-in by useAuth, then cached in this module so synchronous
 * `isAdmin()` calls anywhere in the React tree work without re-reading
 * the token. Cache is cleared on sign-out.
 *
 * Note: this only answers "is the currently-signed-in user admin?" —
 * the optional `uid` argument is retained for call-site compatibility
 * but is ignored. Other users' admin status is not accessible from
 * the client (claims are private to each user's own token).
 */

let cachedIsAdmin = false

export function setAdminFromClaims(claims: Record<string, unknown> | null | undefined): void {
  cachedIsAdmin = !!(claims && claims.admin === true)
}

export function isAdmin(_uid?: string | null): boolean {
  return cachedIsAdmin
}
