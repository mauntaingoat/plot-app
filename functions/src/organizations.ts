/**
 * Cloud Functions — Organization (brokerage / team) lifecycle.
 *
 * Manual-fulfillment ready: until Stripe is wired, the brokerage
 * owner pays the user directly, the user runs scripts/create-
 * organization.mjs to provision the org, then this file's
 * inviteToOrganization + redeemOrganizationInvite callables handle
 * everything else self-serve from the dashboard.
 *
 * Functions:
 *   - createOrganization(name): caller becomes ownerId. seatsTotal=0
 *     until the admin script bumps it. Used by the (future) Stripe
 *     checkout success handler too.
 *   - inviteToOrganization(orgId, email): org admin only. Generates a
 *     48-char hex token at /organizationInvites/{token}, sends an
 *     email. Refuses if seatsTotal - seatsAllocated <= 0.
 *   - redeemOrganizationInvite(token): the invitee (signed-in)
 *     accepts. Transactionally: marks invite redeemed, attaches user
 *     to org via organizationId, flips user.tier to 'pro', increments
 *     org.seatsAllocated, writes the members subcollection doc.
 *   - releaseOrganizationMember(orgId, userId): org admin (or the
 *     member themselves) removes the member. Reverses redeem.
 *   - updateOrganizationSeats(orgId, seatsTotal): owner adjusts seat
 *     count downward (refuses to go below seatsAllocated). Upward
 *     adjustments should come from Stripe webhook once wired; this
 *     callable exists for the manual-fulfillment path.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'
import * as nodemailer from 'nodemailer'
import { renderOrgInviteEmail, ORG_INVITE_SUBJECT } from './email/orgInviteEmail'

if (!admin.apps.length) admin.initializeApp()

const GMAIL_USER = defineSecret('GMAIL_USER')
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD')

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
const ORG_NAME_MIN = 2
const ORG_NAME_MAX = 64
const PUBLIC_ORIGIN = 'https://www.reel.st'

interface OrgDoc {
  id: string
  name: string
  ownerId: string
  seatsTotal: number
  seatsAllocated: number
  status: 'active' | 'past_due' | 'canceled'
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  createdAt: admin.firestore.Timestamp
  updatedAt?: admin.firestore.Timestamp
}

function assertSignedIn(auth: { uid?: string } | undefined): string {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  return auth.uid
}

async function getOrgOrThrow(orgId: string): Promise<OrgDoc> {
  const snap = await admin.firestore().doc(`organizations/${orgId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Organization not found.')
  return { id: snap.id, ...(snap.data() as Omit<OrgDoc, 'id'>) }
}

async function assertOrgAdmin(orgId: string, uid: string): Promise<OrgDoc> {
  const org = await getOrgOrThrow(orgId)
  if (org.ownerId !== uid) {
    throw new HttpsError('permission-denied', 'Only the org owner can do that.')
  }
  return org
}

// ──────────────────────────────────────────────────────────────────
// createOrganization
// ──────────────────────────────────────────────────────────────────
export const createOrganization = onCall(async (req) => {
  const uid = assertSignedIn(req.auth)
  const name = String((req.data as { name?: string })?.name || '').trim()
  if (name.length < ORG_NAME_MIN || name.length > ORG_NAME_MAX) {
    throw new HttpsError('invalid-argument', `Name must be ${ORG_NAME_MIN}–${ORG_NAME_MAX} characters.`)
  }
  // One org per owner for now — keeps the data model simple. Lift this
  // once we have a real customer running multiple brokerages.
  const existing = await admin.firestore()
    .collection('organizations')
    .where('ownerId', '==', uid)
    .limit(1)
    .get()
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'You already own an organization.')
  }
  const userSnap = await admin.firestore().doc(`users/${uid}`).get()
  const user = userSnap.data() as { displayName?: string; email?: string; photoURL?: string | null; username?: string | null } | undefined
  const now = admin.firestore.Timestamp.now()
  const ref = admin.firestore().collection('organizations').doc()
  const org: Omit<OrgDoc, 'id'> = {
    name,
    ownerId: uid,
    seatsTotal: 0,
    seatsAllocated: 1, // the owner takes one seat by default
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: now,
    updatedAt: now,
  }
  const batch = admin.firestore().batch()
  batch.set(ref, org)
  // Owner becomes their own first member with role 'admin'.
  batch.set(ref.collection('members').doc(uid), {
    userId: uid,
    role: 'admin',
    joinedAt: now,
    displayName: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL ?? null,
    username: user?.username ?? null,
  })
  // Attach the user to the org. Tier is left alone — owners pay for
  // their own Pro seat by default but might already be Pro from
  // individual billing; we don't want to clobber that until Stripe
  // is wired to manage both flows.
  batch.update(userSnap.ref, {
    organizationId: ref.id,
    organizationRole: 'admin',
  })
  await batch.commit()
  return { ok: true, organizationId: ref.id }
})

// ──────────────────────────────────────────────────────────────────
// inviteToOrganization
// ──────────────────────────────────────────────────────────────────
export const inviteToOrganization = onCall(
  { secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (req) => {
    const uid = assertSignedIn(req.auth)
    const { orgId, email } = (req.data || {}) as { orgId?: string; email?: string }
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId required.')
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new HttpsError('invalid-argument', 'Valid email required.')
    }

    const org = await assertOrgAdmin(orgId, uid)
    if (org.seatsTotal - org.seatsAllocated <= 0) {
      throw new HttpsError('failed-precondition', 'No seats available. Increase your seat count first.')
    }
    return await sendEmailInvite({ org, invitedBy: uid, email: normalizedEmail })
  }
)

// ──────────────────────────────────────────────────────────────────
// inviteByUsername — UX shortcut for inviting an existing Reelst user
//   by their @username. Looks up their account email, then falls
//   through to the same email-invite flow. Refuses if the username
//   doesn't resolve to a verified agent account.
// ──────────────────────────────────────────────────────────────────
export const inviteByUsername = onCall(
  { secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (req) => {
    const uid = assertSignedIn(req.auth)
    const { orgId, username } = (req.data || {}) as { orgId?: string; username?: string }
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId required.')
    const cleanUsername = String(username || '').trim().toLowerCase().replace(/^@/, '')
    if (!/^[a-z]{3,24}$/.test(cleanUsername)) {
      throw new HttpsError('invalid-argument', 'Username must be 3–24 lowercase letters.')
    }
    const org = await assertOrgAdmin(orgId, uid)
    if (org.seatsTotal - org.seatsAllocated <= 0) {
      throw new HttpsError('failed-precondition', 'No seats available.')
    }
    // Resolve username → uid via the canonical /usernames index, then
    // pull the user doc for the email.
    const unameSnap = await admin.firestore().doc(`usernames/${cleanUsername}`).get()
    if (!unameSnap.exists) {
      throw new HttpsError('not-found', `No Reelst user found with @${cleanUsername}.`)
    }
    const targetUid = (unameSnap.data() as { uid?: string })?.uid
    if (!targetUid) throw new HttpsError('not-found', 'Username record is broken — contact support.')
    const userSnap = await admin.firestore().doc(`users/${targetUid}`).get()
    if (!userSnap.exists) throw new HttpsError('not-found', 'User account missing.')
    const targetUser = userSnap.data() as { email?: string; organizationId?: string }
    if (!targetUser.email) {
      throw new HttpsError('failed-precondition', 'That user has no email on file.')
    }
    if (targetUser.organizationId) {
      throw new HttpsError('failed-precondition', 'That user is already in another organization.')
    }
    // Re-use the inviteToOrganization path by writing the invite doc
    // directly here — avoids a self-call (Cloud Functions can't invoke
    // each other cleanly without an HTTPS hop).
    return await sendEmailInvite({
      org,
      invitedBy: uid,
      email: targetUser.email.toLowerCase(),
    })
  }
)

// ──────────────────────────────────────────────────────────────────
// createInviteLink — generates a single-use, time-limited token that
//   anyone with the URL can redeem (no email pre-binding). Useful for
//   sharing in WhatsApp/Slack/etc. when you don't have the agent's
//   email handy. Tradeoff: if the link leaks, a stranger could claim
//   the seat — single-use + 14d expiry caps the blast radius. Admin
//   can revoke from the dashboard before redemption.
// ──────────────────────────────────────────────────────────────────
export const createInviteLink = onCall(async (req) => {
  const uid = assertSignedIn(req.auth)
  const { orgId } = (req.data || {}) as { orgId?: string }
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId required.')
  const org = await assertOrgAdmin(orgId, uid)
  if (org.seatsTotal - org.seatsAllocated <= 0) {
    throw new HttpsError('failed-precondition', 'No seats available.')
  }
  const token = crypto.randomBytes(24).toString('hex')
  const now = admin.firestore.Timestamp.now()
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + INVITE_TTL_MS)
  await admin.firestore().doc(`organizationInvites/${token}`).set({
    token,
    organizationId: orgId,
    organizationName: org.name,
    // Empty string flags this as a link-style invite (no email gate
    // at redemption — any signed-in user without an org can claim).
    email: '',
    kind: 'link',
    invitedBy: uid,
    status: 'pending',
    createdAt: now,
    expiresAt,
  })
  return { ok: true, token, inviteUrl: `${PUBLIC_ORIGIN}/invite/${token}` }
})

// ──────────────────────────────────────────────────────────────────
// revokeOrganizationInvite — admin cancels a still-pending invite.
//   Flips status to 'revoked'; redeemers see a clear message on the
//   accept page.
// ──────────────────────────────────────────────────────────────────
export const revokeOrganizationInvite = onCall(async (req) => {
  const uid = assertSignedIn(req.auth)
  const { token } = (req.data || {}) as { token?: string }
  if (!token) throw new HttpsError('invalid-argument', 'token required.')
  await admin.firestore().runTransaction(async (tx) => {
    const ref = admin.firestore().doc(`organizationInvites/${token}`)
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpsError('not-found', 'Invite not found.')
    const data = snap.data() as { organizationId: string; status: string }
    const orgSnap = await tx.get(admin.firestore().doc(`organizations/${data.organizationId}`))
    if (!orgSnap.exists || (orgSnap.data() as OrgDoc).ownerId !== uid) {
      throw new HttpsError('permission-denied', 'Not your invite.')
    }
    if (data.status !== 'pending') {
      throw new HttpsError('failed-precondition', `Invite is already ${data.status}.`)
    }
    tx.update(ref, { status: 'revoked' })
  })
  return { ok: true }
})

// Shared email-invite creation logic, used by both
// inviteToOrganization and inviteByUsername.
async function sendEmailInvite({
  org,
  invitedBy,
  email,
}: {
  org: OrgDoc
  invitedBy: string
  email: string
}): Promise<{ ok: boolean; token: string; inviteUrl: string }> {
  // Refuse if there's already a pending invite for this email + org.
  const existing = await admin.firestore()
    .collection('organizationInvites')
    .where('organizationId', '==', org.id)
    .where('email', '==', email)
    .where('status', '==', 'pending')
    .limit(1)
    .get()
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'An invite to that email is already pending.')
  }

  const token = crypto.randomBytes(24).toString('hex')
  const now = admin.firestore.Timestamp.now()
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + INVITE_TTL_MS)
  await admin.firestore().doc(`organizationInvites/${token}`).set({
    token,
    organizationId: org.id,
    organizationName: org.name,
    email,
    kind: 'email',
    invitedBy,
    status: 'pending',
    createdAt: now,
    expiresAt,
  })

  const inviteUrl = `${PUBLIC_ORIGIN}/invite/${token}`
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
    })
    await transporter.sendMail({
      from: `Reelst <${GMAIL_USER.value()}>`,
      to: email,
      subject: ORG_INVITE_SUBJECT(org.name),
      html: renderOrgInviteEmail({ orgName: org.name, inviteUrl }),
    })
  } catch (e) {
    logger.warn('orgInvite email failed', { e, token })
  }

  return { ok: true, token, inviteUrl }
}

// ──────────────────────────────────────────────────────────────────
// redeemOrganizationInvite
// ──────────────────────────────────────────────────────────────────
export const redeemOrganizationInvite = onCall(async (req) => {
  const uid = assertSignedIn(req.auth)
  const token = String((req.data as { token?: string })?.token || '').trim()
  if (!token) throw new HttpsError('invalid-argument', 'token required.')

  const inviteRef = admin.firestore().doc(`organizationInvites/${token}`)
  const userRef = admin.firestore().doc(`users/${uid}`)

  const result = await admin.firestore().runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef)
    if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invite not found.')
    const invite = inviteSnap.data() as {
      organizationId: string
      email: string
      kind?: 'email' | 'link'
      status: string
      expiresAt: admin.firestore.Timestamp
    }
    if (invite.status !== 'pending') {
      throw new HttpsError('failed-precondition', `Invite already ${invite.status}.`)
    }
    const now = admin.firestore.Timestamp.now()
    if (invite.expiresAt.toMillis() < now.toMillis()) {
      tx.update(inviteRef, { status: 'expired' })
      throw new HttpsError('failed-precondition', 'Invite has expired.')
    }

    const userSnap = await tx.get(userRef)
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')
    const user = userSnap.data() as {
      email: string
      organizationId?: string | null
      displayName?: string
      photoURL?: string | null
      username?: string | null
    }
    // For email-style invites, the email match is the security gate —
    // anyone holding the token can see the org name, but only the
    // invited email can redeem. Link-style invites have no email
    // pre-binding (the URL is the secret); single-use + expiry
    // bound the risk.
    if ((invite.kind ?? 'email') === 'email') {
      if ((user.email || '').toLowerCase() !== invite.email.toLowerCase()) {
        throw new HttpsError('permission-denied', 'This invite is for a different email address.')
      }
    }
    if (user.organizationId) {
      throw new HttpsError('failed-precondition', 'You\'re already in an organization. Leave it first.')
    }

    const orgRef = admin.firestore().doc(`organizations/${invite.organizationId}`)
    const orgSnap = await tx.get(orgRef)
    if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization no longer exists.')
    const org = orgSnap.data() as OrgDoc
    if (org.status === 'canceled') {
      throw new HttpsError('failed-precondition', 'This organization\'s subscription has been canceled.')
    }
    if (org.seatsAllocated >= org.seatsTotal) {
      throw new HttpsError('failed-precondition', 'No seats available in this organization.')
    }

    // Commit: redeem invite, attach user to org, flip tier, write member, bump count.
    tx.update(inviteRef, {
      status: 'redeemed',
      redeemedBy: uid,
      redeemedAt: now,
    })
    tx.update(userRef, {
      organizationId: invite.organizationId,
      organizationRole: 'member',
      tier: 'pro',
    })
    tx.set(orgRef.collection('members').doc(uid), {
      userId: uid,
      role: 'member',
      invitedAt: inviteSnap.get('createdAt') ?? null,
      joinedAt: now,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL ?? null,
      username: user.username ?? null,
    })
    tx.update(orgRef, {
      seatsAllocated: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    })
    return { orgId: invite.organizationId }
  })

  return { ok: true, organizationId: result.orgId }
})

// ──────────────────────────────────────────────────────────────────
// releaseOrganizationMember
//   Either the org admin removes a member, or the member removes
//   themselves. Decrements seatsAllocated and flips the member's
//   tier back to free.
// ──────────────────────────────────────────────────────────────────
export const releaseOrganizationMember = onCall(async (req) => {
  const callerUid = assertSignedIn(req.auth)
  const { orgId, userId } = (req.data || {}) as { orgId?: string; userId?: string }
  if (!orgId || !userId) throw new HttpsError('invalid-argument', 'orgId + userId required.')

  await admin.firestore().runTransaction(async (tx) => {
    const orgRef = admin.firestore().doc(`organizations/${orgId}`)
    const orgSnap = await tx.get(orgRef)
    if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found.')
    const org = orgSnap.data() as OrgDoc

    // Authz: only the org admin OR the member themselves can do this.
    if (org.ownerId !== callerUid && userId !== callerUid) {
      throw new HttpsError('permission-denied', 'Not allowed.')
    }
    // The owner cannot be released — they'd have to delete the org
    // outright (separate flow).
    if (userId === org.ownerId) {
      throw new HttpsError('failed-precondition', 'Cannot release the owner. Delete the organization instead.')
    }

    const memberRef = orgRef.collection('members').doc(userId)
    const memberSnap = await tx.get(memberRef)
    if (!memberSnap.exists) {
      throw new HttpsError('not-found', 'Member not in this organization.')
    }

    const userRef = admin.firestore().doc(`users/${userId}`)
    const userSnap = await tx.get(userRef)
    if (userSnap.exists) {
      const user = userSnap.data() as { organizationId?: string | null }
      if (user.organizationId !== orgId) {
        // Drift between user doc and member doc — repair member doc, leave user alone.
        tx.delete(memberRef)
        return
      }
      // Flip back to free. If they had an individual Stripe sub, the
      // Stripe webhook will set this back to 'pro' next sync — but at
      // this stage individual Stripe isn't wired, so just clear.
      tx.update(userRef, {
        organizationId: admin.firestore.FieldValue.delete(),
        organizationRole: admin.firestore.FieldValue.delete(),
        tier: 'free',
      })
    }
    tx.delete(memberRef)
    tx.update(orgRef, {
      seatsAllocated: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.Timestamp.now(),
    })
  })

  return { ok: true }
})

// ──────────────────────────────────────────────────────────────────
// updateOrganizationSeats
//   Owner-only. Adjusts the total seat count on the org. Used for
//   the manual-fulfillment path before Stripe is wired. Once Stripe
//   is in, the Stripe webhook is the source of truth for seatsTotal
//   and this callable refuses to write.
// ──────────────────────────────────────────────────────────────────
export const updateOrganizationSeats = onCall(async (req) => {
  const uid = assertSignedIn(req.auth)
  const { orgId, seatsTotal } = (req.data || {}) as { orgId?: string; seatsTotal?: number }
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId required.')
  if (!Number.isInteger(seatsTotal) || (seatsTotal as number) < 1) {
    throw new HttpsError('invalid-argument', 'seatsTotal must be a positive integer.')
  }

  await admin.firestore().runTransaction(async (tx) => {
    const orgRef = admin.firestore().doc(`organizations/${orgId}`)
    const orgSnap = await tx.get(orgRef)
    if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found.')
    const org = orgSnap.data() as OrgDoc
    if (org.ownerId !== uid) throw new HttpsError('permission-denied', 'Owner only.')
    if (org.stripeSubscriptionId) {
      // Once Stripe is the source of truth, refuse manual adjustments
      // — let the webhook handle it on quantity changes.
      throw new HttpsError('failed-precondition', 'Adjust seat count via your Stripe subscription instead.')
    }
    if ((seatsTotal as number) < org.seatsAllocated) {
      throw new HttpsError('failed-precondition', `Cannot drop below currently allocated seats (${org.seatsAllocated}). Release members first.`)
    }
    tx.update(orgRef, {
      seatsTotal,
      updatedAt: admin.firestore.Timestamp.now(),
    })
  })

  return { ok: true }
})
