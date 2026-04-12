/**
 * License Verification Cloud Function
 *
 * Verifies real estate agent licenses against state databases:
 *   - FL: DBPR (Department of Business & Professional Regulation)
 *   - CA: DRE (Department of Real Estate)
 *
 * Called via HTTPS callable from the signup flow.
 * Returns { valid, name, status, expirationDate } or { valid: false, reason }.
 *
 * Deploy: firebase deploy --only functions:verifyLicense
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'

interface VerifyRequest {
  licenseNumber: string
  licenseState: string
  licenseName: string // name the agent entered — used for fuzzy match
}

interface VerifyResult {
  valid: boolean
  name?: string
  status?: string
  licenseType?: string
  expirationDate?: string
  reason?: string
  matchScore?: number // 0-1, how well the name matches
}

// ── Simple name matching ──
function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
}

function nameMatchScore(entered: string, official: string): number {
  const a = normalizeStr(entered)
  const b = normalizeStr(official)
  if (a === b) return 1
  // Check if all words in entered name appear in official name
  const aWords = a.split(' ')
  const bWords = b.split(' ')
  const matched = aWords.filter((w) => bWords.some((bw) => bw.includes(w) || w.includes(bw)))
  return matched.length / Math.max(aWords.length, 1)
}

// ── FL DBPR Verification ──
async function verifyFL(licenseNumber: string, licenseName: string): Promise<VerifyResult> {
  try {
    // FL DBPR has a public search API endpoint
    const url = `https://www.myfloridalicense.com/wl11.asp?mode=2&search=LicNbr&SID=&bession=&LicNbr=${encodeURIComponent(licenseNumber)}&LicName=&LicLoc=&LicCounty=&LicDist=&LicCat=&LicStatus=&LicType=&BusName1=&BusName2=&BusName3=&Submit=Search`

    const res = await fetch(url)
    const html = await res.text()

    // Parse the HTML response for license info
    // DBPR returns a table with licensee info
    const nameMatch = html.match(/licensee name<\/td>\s*<td[^>]*>([^<]+)/i)
    const statusMatch = html.match(/license status<\/td>\s*<td[^>]*>([^<]+)/i)
    const typeMatch = html.match(/license type<\/td>\s*<td[^>]*>([^<]+)/i)
    const expMatch = html.match(/expiration date<\/td>\s*<td[^>]*>([^<]+)/i)

    if (!nameMatch) {
      // Try alternate format
      const altName = html.match(/<td[^>]*class="results"[^>]*>([^<]+)<\/td>/i)
      if (!altName || html.includes('No Records Found') || html.includes('0 Records')) {
        return { valid: false, reason: 'License number not found in FL DBPR database.' }
      }
    }

    const officialName = (nameMatch?.[1] || '').trim()
    const status = (statusMatch?.[1] || '').trim()
    const licenseType = (typeMatch?.[1] || '').trim()
    const expirationDate = (expMatch?.[1] || '').trim()

    const score = nameMatchScore(licenseName, officialName)

    if (status.toLowerCase().includes('revoked') || status.toLowerCase().includes('suspended')) {
      return {
        valid: false,
        name: officialName,
        status,
        reason: `License is ${status.toLowerCase()}.`,
      }
    }

    return {
      valid: score >= 0.5,
      name: officialName,
      status: status || 'Active',
      licenseType,
      expirationDate,
      matchScore: score,
      reason: score < 0.5 ? `Name mismatch: entered "${licenseName}", found "${officialName}".` : undefined,
    }
  } catch (e) {
    logger.error('verifyFL error:', e)
    return { valid: false, reason: 'Could not reach FL DBPR. Try again later.' }
  }
}

// ── CA DRE Verification ──
async function verifyCA(licenseNumber: string, licenseName: string): Promise<VerifyResult> {
  try {
    // CA DRE public license lookup
    const url = `https://www2.dre.ca.gov/PublicASP/pplinfo.asp?License_id=${encodeURIComponent(licenseNumber)}`

    const res = await fetch(url)
    const html = await res.text()

    if (html.includes('was not found') || html.includes('No record found')) {
      return { valid: false, reason: 'License number not found in CA DRE database.' }
    }

    // Parse the response
    const nameMatch = html.match(/Name:\s*<\/td>\s*<td[^>]*>([^<]+)/i)
      || html.match(/<b>([^<]+)<\/b>\s*<br/i)
    const statusMatch = html.match(/Status:\s*<\/td>\s*<td[^>]*>([^<]+)/i)
      || html.match(/License Status[^<]*<[^>]*>([^<]+)/i)
    const expMatch = html.match(/Expiration Date:\s*<\/td>\s*<td[^>]*>([^<]+)/i)
      || html.match(/Expir[^<]*<[^>]*>([^<]+)/i)

    const officialName = (nameMatch?.[1] || '').trim()
    const status = (statusMatch?.[1] || '').trim()
    const expirationDate = (expMatch?.[1] || '').trim()

    const score = nameMatchScore(licenseName, officialName)

    return {
      valid: score >= 0.5,
      name: officialName,
      status: status || 'Licensed',
      licenseType: 'Salesperson/Broker',
      expirationDate,
      matchScore: score,
      reason: score < 0.5 ? `Name mismatch: entered "${licenseName}", found "${officialName}".` : undefined,
    }
  } catch (e) {
    logger.error('verifyCA error:', e)
    return { valid: false, reason: 'Could not reach CA DRE. Try again later.' }
  }
}

// ── Generic fallback for unsupported states ──
function unsupportedState(state: string): VerifyResult {
  return {
    valid: true, // don't block signup, just mark as unverified
    reason: `Automated verification is not yet available for ${state}. License will be manually reviewed.`,
    status: 'pending_review',
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

    logger.info(`verifyLicense: ${licenseState} #${licenseNumber} for "${licenseName}"`)

    let result: VerifyResult

    switch (licenseState.toUpperCase()) {
      case 'FL':
        result = await verifyFL(licenseNumber, licenseName)
        break
      case 'CA':
        result = await verifyCA(licenseNumber, licenseName)
        break
      default:
        result = unsupportedState(licenseState)
    }

    logger.info(`verifyLicense result:`, result)
    return result
  },
)
