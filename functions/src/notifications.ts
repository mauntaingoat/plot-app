/**
 * Notification triggers — fire push messages and write persistent
 * notification docs on key Firestore events.
 *
 * Three triggers:
 *   - onNewFollower      : a follow doc is created → notify the followed agent
 *   - onNewShowingRequest: a showing request doc is created → notify the agent
 *   - onPinSaved         : a save doc is created → notify the listing's agent
 *
 * Each respects the user's notificationPrefs in their `users` doc.
 * Tokens that fail to deliver (unregistered, invalid) are pruned.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

interface NotifPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

async function notifyUser(uid: string, prefKey: 'newFollower' | 'showingRequest' | 'pinSaved', payload: NotifPayload) {
  const db = admin.firestore()
  const userSnap = await db.collection('users').doc(uid).get()
  if (!userSnap.exists) return

  const user = userSnap.data() as {
    fcmTokens?: string[]
    notificationPrefs?: Record<string, boolean>
  }

  const prefs = user.notificationPrefs || {}
  const defaultsOn: Record<string, boolean> = {
    newFollower: true,
    showingRequest: true,
    pinSaved: true,
  }
  const enabled = prefs[prefKey] ?? defaultsOn[prefKey]
  if (!enabled) {
    logger.info(`notifyUser: ${prefKey} disabled for ${uid}`)
    return
  }

  const tokens = user.fcmTokens || []
  if (tokens.length === 0) return

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      url: payload.url || '/dashboard',
      tag: payload.tag || 'reelst',
    },
    webpush: {
      fcmOptions: {
        link: payload.url || '/dashboard',
      },
    },
  }

  const result = await admin.messaging().sendEachForMulticast(message)
  logger.info(`notifyUser: ${prefKey} ${uid} success=${result.successCount} failure=${result.failureCount}`)

  if (result.failureCount > 0) {
    const dead: string[] = []
    result.responses.forEach((res, i) => {
      if (!res.success) {
        const code = res.error?.code || ''
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          dead.push(tokens[i])
        }
      }
    })
    if (dead.length > 0) {
      await db
        .collection('users')
        .doc(uid)
        .update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead),
        })
        .catch(() => {})
    }
  }
}

async function writeNotification(data: {
  agentId: string
  type: 'follow' | 'save' | 'showing_request'
  title: string
  body: string
  actorName?: string
  actorUid?: string
  pinId?: string
  pinAddress?: string
  refId?: string
}) {
  const db = admin.firestore()
  await db.collection('notifications').add({
    ...data,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// ── Trigger: new follower ──
export const onNewFollower = onDocumentCreated(
  { document: 'follows/{followId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data?.followedUid || !data?.followerUid) return

    const db = admin.firestore()
    const followerSnap = await db.collection('users').doc(data.followerUid).get()
    const followerData = followerSnap.data()
    const followerName = (followerData?.displayName as string) || 'Someone'

    await notifyUser(data.followedUid, 'newFollower', {
      title: 'New follower',
      body: `${followerName} just followed your Reelst.`,
      url: '/dashboard?tab=inbox',
      tag: `follow_${data.followerUid}`,
    })

    await writeNotification({
      agentId: data.followedUid,
      type: 'follow',
      title: 'New follower',
      body: `${followerName} just followed your Reelst.`,
      actorName: followerName,
      actorUid: data.followerUid,
    })

    // Log follow event for analytics
    await db.collection('events').add({
      type: 'follow',
      agentId: data.followedUid,
      actorUid: data.followerUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      hour: new Date().getHours(),
      date: new Date().toISOString().slice(0, 10),
    }).catch(() => {})
  },
)

// ── Trigger: new showing request ──
export const onNewShowingRequest = onDocumentCreated(
  { document: 'showing_requests/{reqId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data?.agentId) return

    await notifyUser(data.agentId, 'showingRequest', {
      title: 'New showing request',
      body: `${data.visitorName || 'Someone'} wants to tour ${data.pinAddress || 'a listing'}.`,
      url: '/dashboard?tab=inbox',
      tag: `req_${event.params.reqId}`,
    })

    await writeNotification({
      agentId: data.agentId,
      type: 'showing_request',
      title: 'New showing request',
      body: `${data.visitorName || 'Someone'} wants to tour ${data.pinAddress || 'a listing'}.`,
      actorName: data.visitorName || 'Someone',
      pinId: data.pinId,
      pinAddress: data.pinAddress,
      refId: event.params.reqId,
    })
  },
)

// ── Trigger: pin saved ──
export const onPinSaved = onDocumentCreated(
  { document: 'saves/{saveId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data()
    if (!data?.pinId) return

    const db = admin.firestore()
    const pinSnap = await db.collection('pins').doc(data.pinId).get()
    if (!pinSnap.exists) return
    const pin = pinSnap.data() as { agentId?: string; address?: string }
    if (!pin.agentId) return
    if (data.userId === pin.agentId) return

    await notifyUser(pin.agentId, 'pinSaved', {
      title: 'Listing saved',
      body: `Someone saved ${pin.address || 'one of your listings'}.`,
      url: '/dashboard?tab=inbox',
      tag: `save_${data.pinId}`,
    })

    await writeNotification({
      agentId: pin.agentId,
      type: 'save',
      title: 'Listing saved',
      body: `Someone saved ${pin.address || 'one of your listings'}.`,
      actorUid: data.userId,
      pinId: data.pinId,
      pinAddress: pin.address,
    })
  },
)
