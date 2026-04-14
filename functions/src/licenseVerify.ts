/**
 * License Verification Cloud Function
 *
 * V1 (current): accepts any license number + name and marks the account
 * as `pending_review`. No scraping, no external API. The previous DBPR
 * scrape was too brittle — DBPR requires a multi-step session flow with
 * SID cookies + board-type routing that no bare GET can satisfy, and
 * fallback landing pages happened to match "no records" text, causing
 * valid licenses to be hard-rejected.
 *
 * V2 (planned): bulk-import DBPR's monthly license data extract into a
 * Firestore `fl_licenses` collection, query it locally for instant
 * authoritative verification. CA DRE has a similar data dump.
 *
 * V3 (post-launch): add Persona/ID.me photo ID + license card upload
 * for identity verification, catching fraud and impersonation.
 *
 * Called via HTTPS callable from the signup flow.
 * Returns { valid: true, status: 'pending_review', reason } — never blocks.
 *
 * Deploy: firebase deploy --only functions:verifyLicense
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'

interface VerifyRequest {
  licenseNumber: string
  licenseState: string
  licenseName: string
}

interface VerifyResult {
  valid: boolean
  name?: string
  status?: string
  licenseType?: string
  expirationDate?: string
  reason?: string
  matchScore?: number
}

/**
 * Soft-accept every license. Automated verification is disabled until the
 * DBPR bulk-data + Persona ID-upload pipeline lands. Signup never blocks
 * on this function; the agent account gets `pending_review` status and we
 * review manually (or via the V2 pipeline) before promoting to `verified`.
 */
function softAccept(state: string): VerifyResult {
  return {
    valid: true,
    status: 'pending_review',
    reason: `Your ${state} license will be reviewed within 24 hours.`,
  }
}

// ── Callable function ──
export const verifyLicense = onCall(
  { region: 'us-central1', memory: '256MiB' },
  async (request) => {
    const { licenseNumber, licenseState, licenseName } = request.data as VerifyRequest

    if (!licenseNumber || !licenseState || !licenseName) {
      throw new HttpsError('invalid-argument', 'licenseNumber, licenseState, and licenseName are required.')
    }

    logger.info(`[verifyLicense] soft-accept: ${licenseState} #${licenseNumber} for "${licenseName}"`)
    return softAccept(licenseState.toUpperCase())
  },
)
