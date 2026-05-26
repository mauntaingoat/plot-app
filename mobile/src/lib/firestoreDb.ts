/**
 * Native Firestore wrapper using @react-native-firebase/firestore
 * (modular API, v22+). Mirrors the web app's `src/lib/firestore.ts`
 * query patterns. Same Firestore collections + shapes as web.
 */
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  addDoc,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore'
import type { Pin } from '../types'
import type { AgentStyle } from './style'

type Unsub = () => void

export interface UserDocLite {
  uid: string
  email?: string
  username?: string | null
  displayName?: string | null
  photoURL?: string | null
  bio?: string | null
  brokerage?: string | null
  licenseNumber?: string | null
  platforms?: { id: string; username: string }[]
  tier?: 'free' | 'pro'
  profileVisits?: number
  pinTaps?: number
  subscriberCount?: number
  style?: Partial<AgentStyle>
  notificationPrefs?: {
    showingRequest?: boolean
    newSubscriber?: boolean
    newWave?: boolean
  }
  emailPrefs?: {
    showingRequest?: boolean
    newSubscriber?: boolean
    newWave?: boolean
  }
}

/** Seed a brand-new agent userDoc + claim their `usernames/{slug}`
 *  reservation in one shot. Mirrors web `createUserDoc` shape.
 *
 *  Caller is responsible for already having created the Firebase Auth
 *  user (so we have a uid). This writes the Firestore docs that the
 *  rest of the app expects (subscribeUserDoc, etc.).
 */
export interface NotificationPrefs {
  showingRequest: boolean
  newSubscriber: boolean
  newWave: boolean
}

export async function seedAgentOnSignup(
  uid: string,
  data: {
    email: string
    username: string
    displayName: string
    photoURL?: string | null
    bio?: string | null
    goals?: string[]
    license?: { state: string; number: string; name: string } | null
    notificationPrefs?: NotificationPrefs
    emailPrefs?: NotificationPrefs
  },
) {
  const db = getFirestore()
  const { setDoc } = await import('@react-native-firebase/firestore')
  const cleanedUsername = data.username.toLowerCase()

  // userDoc (`/users/{uid}`)
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: data.email,
    role: 'agent',
    createdAt: serverTimestamp(),
    username: cleanedUsername,
    displayName: data.displayName,
    photoURL: data.photoURL ?? null,
    bio: data.bio ?? '',
    brokerage: null,
    licenseNumber: data.license?.number ?? null,
    licenseState: data.license?.state ?? null,
    licenseName: data.license?.name ?? null,
    verificationStatus: 'unverified',
    fairHousingAccepted: false,
    dataSecurityAccepted: false,
    emailVerified: false,
    tier: 'free',
    brandColor: null,
    platforms: [],
    goals: data.goals ?? [],
    notificationPrefs: data.notificationPrefs ?? {
      showingRequest: true, newSubscriber: true, newWave: true,
    },
    emailPrefs: data.emailPrefs ?? {
      showingRequest: true, newSubscriber: true, newWave: false,
    },
    onboardingComplete: true,
    onboardingStep: 99,
    setupPercent: data.license ? 50 : 30,
  })

  // Reserve the username (`/usernames/{slug}`). Best-effort — if it
  // races with another signup we'd surface that earlier at the
  // availability check step.
  try {
    await setDoc(doc(db, 'usernames', cleanedUsername), {
      uid,
      createdAt: serverTimestamp(),
    })
  } catch {
    // Reservation failed; userDoc is still written so the agent can
    // pick a new username from Settings later.
  }
}

/** Patch the agent's style object. We write the FULL resolved style
 *  on every save so newly-added fields (tickerOrder, ctaLabels, etc.)
 *  stay present even when the user only flipped one toggle. Caller
 *  should pass a pre-merged AgentStyle (use `resolveStyle` + spread). */
export async function updateUserStyle(uid: string, style: AgentStyle) {
  const db = getFirestore()
  await updateDoc(doc(db, 'users', uid), { style })
}

/** Update a pin doc — used by the visibility toggle, archive action, etc. */
export async function updatePin(pinId: string, patch: Record<string, unknown>) {
  const db = getFirestore()
  await updateDoc(doc(db, 'pins', pinId), patch)
}

/** Create a new pin doc. Mirrors web `createPin` — same defaults
 *  (enabled:false, status:'active', counters at 0). The agent enables
 *  it separately via `togglePinEnabled` so the server-side cap is
 *  enforced through the `setPinEnabled` callable. */
export async function createPin(data: Record<string, unknown>): Promise<string> {
  const db = getFirestore()
  const ref = await addDoc(collection(db, 'pins'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    views: 0,
    taps: 0,
    saves: 0,
    enabled: false,
    status: 'active',
    content: data.content || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  return ref.id
}

/**
 * Toggle the `enabled` flag on a pin.
 *
 * Firestore rules permit DISABLING via direct write but DENY enabling
 * (rules: `enabled == false || enabled unchanged`). Enabling has to
 * go through the `setPinEnabled` callable Cloud Function so the
 * per-tier active-pin cap is enforced server-side. Mirrors the web
 * `setPinEnabled` wrapper in src/lib/firestore.ts.
 */
export async function togglePinEnabled(pinId: string, enabled: boolean) {
  if (enabled) {
    // @react-native-firebase/functions v22 only ships the namespaced API.
    // `functions()` returns the default region instance; `.httpsCallable`
    // gets a callable function reference.
    const functionsModule = await import('@react-native-firebase/functions')
    const fn = functionsModule.default().httpsCallable('setPinEnabled')
    await fn({ pinId, enabled })
  } else {
    // Disabling: direct Firestore write — rules permit, no cap check.
    await updatePin(pinId, { enabled })
  }
}

/** Archive a pin — sets archivedAt + status:'archived' + enabled:false
 *  so the client-side filter hides it and the cleanup function knows
 *  to remove assets after the 7-day retention window. Matches the web
 *  `archivePin` write shape. */
export async function archivePin(pinId: string) {
  await updatePin(pinId, {
    status: 'archived',
    enabled: false,
    archivedAt: serverTimestamp(),
  })
}

/** Create a new content item — appends to the pin's `content[]` AND
 *  upserts a standalone `content` collection doc (matches the dual-
 *  write that the rest of these helpers expect). Returns the new
 *  content ID so the caller can navigate / scroll to it.
 *
 *  `mediaUrls` are already-uploaded Storage download URLs. The caller
 *  is responsible for the upload; this helper just stitches the doc. */
export async function createContent(
  agentId: string,
  pinId: string,
  data: {
    type: 'photo' | 'reel'
    mediaUrls: string[]
    thumbnailUrl?: string | null
    caption?: string | null
    aspect?: string | null
  },
): Promise<string> {
  const db = getFirestore()
  const { getDoc, setDoc } = await import('@react-native-firebase/firestore')

  const contentId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const first = data.mediaUrls[0] ?? null
  const item: Record<string, unknown> = {
    id: contentId,
    type: data.type,
    // ContentCard.tsx falls back through thumbnailUrl → mediaUrls[0]
    // → mediaUrl, so populate enough fields that every consumer is
    // covered (web profile, mobile library, mobile pin card).
    mediaUrl: first,
    mediaUrls: data.mediaUrls,
    thumbnailUrl: data.thumbnailUrl ?? first,
    caption: data.caption ?? null,
    aspect: data.aspect ?? null,
    views: 0,
    saves: 0,
    status: 'ready',
  }

  // 1) Append to pin.content[]. Read-modify-write because the array is
  //    inline on the pin doc (consistent with the other helpers).
  const pinSnap = await getDoc(doc(db, 'pins', pinId))
  const pinData = pinSnap.data() as { content?: Array<Record<string, unknown>> } | undefined
  const nextContent = [...(pinData?.content ?? []), item]
  await updatePin(pinId, {
    content: nextContent,
    contentLastAddedAt: serverTimestamp(),
  })

  // 2) Upsert standalone content doc so ContentTab + reassign / unlink
  //    / archive helpers can find it later. Same shape as inline item
  //    plus agentId / pinId / createdAt for queryability.
  await setDoc(
    doc(db, 'content', contentId),
    {
      ...item,
      agentId,
      pinId,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )

  return contentId
}

/** Update a single content item's caption (or other field) inside
 *  a pin's content array. Reads the array, replaces the matching
 *  item, writes it back. Also updates the standalone content doc
 *  if one exists (web does the same dual-write — keeps the pin
 *  array + content collection in sync). */
export async function updatePinContentItem(
  pinId: string,
  contentId: string,
  patch: Partial<{ caption: string }>,
) {
  const db = getFirestore()
  const pinSnap = await import('@react-native-firebase/firestore').then(({ getDoc }) =>
    getDoc(doc(db, 'pins', pinId))
  )
  const data = pinSnap.data() as { content?: Array<{ id?: string; [k: string]: unknown }> } | undefined
  if (!data?.content) return
  const nextContent = data.content.map((c) => (c.id === contentId ? { ...c, ...patch } : c))
  await updatePin(pinId, { content: nextContent })
  // Best-effort content doc update — ignore if it doesn't exist
  try {
    await updateDoc(doc(db, 'content', contentId), patch)
  } catch {
    // No standalone content doc — pin array write above is enough.
  }
}

/** Reassign a content item from one pin to another. Removes it from
 *  the source pin's content[], appends to the target pin's content[],
 *  and updates the standalone content doc's pinId field. Mirrors the
 *  web `onAssignContent` flow. */
export async function reassignContentToPin(
  contentId: string,
  fromPinId: string,
  toPinId: string,
) {
  if (fromPinId === toPinId) return
  const db = getFirestore()
  const { getDoc } = await import('@react-native-firebase/firestore')
  const [fromSnap, toSnap] = await Promise.all([
    getDoc(doc(db, 'pins', fromPinId)),
    getDoc(doc(db, 'pins', toPinId)),
  ])
  const fromData = fromSnap.data() as { content?: Array<{ id?: string; [k: string]: unknown }> } | undefined
  const toData = toSnap.data() as { content?: Array<{ id?: string; [k: string]: unknown }> } | undefined
  if (!fromData?.content) return
  const item = fromData.content.find((c) => c.id === contentId)
  if (!item) return
  const nextFrom = fromData.content.filter((c) => c.id !== contentId)
  const nextTo = [...(toData?.content ?? []), item]
  await Promise.all([
    updatePin(fromPinId, { content: nextFrom }),
    updatePin(toPinId, { content: nextTo, contentLastAddedAt: serverTimestamp() }),
  ])
  // Update the standalone content doc's pinId if present.
  try {
    await updateDoc(doc(db, 'content', contentId), { pinId: toPinId })
  } catch {
    // No standalone content doc — pin writes above are enough.
  }
}

/** Unlink a content item from its current pin so it lives in the
 *  standalone `content` collection as a "no listing" item. Mirrors
 *  the web ContentLibrary unlink flow (`toPinId === '__none__'`). */
export async function unlinkContentFromPin(
  contentId: string,
  fromPinId: string,
  contentItem: Record<string, unknown>,
  agentId: string,
) {
  const db = getFirestore()
  const { getDoc, setDoc } = await import('@react-native-firebase/firestore')
  const fromSnap = await getDoc(doc(db, 'pins', fromPinId))
  const fromData = fromSnap.data() as { content?: Array<{ id?: string }> } | undefined
  if (fromData?.content) {
    await updatePin(fromPinId, { content: fromData.content.filter((c) => c.id !== contentId) })
  }
  // Ensure the standalone content doc exists with pinId:null. Web
  // calls `upsertContent` here — on iOS we just setDoc with merge so
  // a brand-new content item gets created and an existing one gets
  // its pinId flipped.
  await setDoc(
    doc(db, 'content', contentId),
    { ...contentItem, agentId, pinId: null },
    { merge: true },
  )
}

/** Soft-archive a single content item. Sets `archivedAt` on the
 *  standalone content doc and removes the item from its pin's
 *  content[] (so it stops appearing in the agent's library + on
 *  their public profile). */
export async function archiveContentItem(contentId: string, pinId: string | null) {
  const db = getFirestore()
  if (pinId) {
    const { getDoc } = await import('@react-native-firebase/firestore')
    const pinSnap = await getDoc(doc(db, 'pins', pinId))
    const data = pinSnap.data() as { content?: Array<{ id?: string }> } | undefined
    if (data?.content) {
      await updatePin(pinId, { content: data.content.filter((c) => c.id !== contentId) })
    }
  }
  try {
    await updateDoc(doc(db, 'content', contentId), { archivedAt: serverTimestamp() })
  } catch {
    // Content may live only inside the pin array — pin write is enough.
  }
}

export function subscribeUserDoc(
  uid: string,
  onUpdate: (doc: UserDocLite | null) => void,
  onError?: (err: unknown) => void,
): Unsub {
  const db = getFirestore()
  const ref = doc(db, 'users', uid)
  return onSnapshot(
    ref,
    (snap: FirebaseFirestoreTypes.DocumentSnapshot) => {
      if (!snap.exists()) {
        onUpdate(null)
        return
      }
      onUpdate({ uid: snap.id, ...(snap.data() as Omit<UserDocLite, 'uid'>) })
    },
    onError,
  )
}

export function subscribeAgentPins(
  agentId: string,
  onUpdate: (pins: Pin[]) => void,
  onError?: (err: unknown) => void,
): Unsub {
  const db = getFirestore()
  const q = query(
    collection(db, 'pins'),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
      const pins: Pin[] = []
      snap.forEach((d) => {
        const data = d.data() as Omit<Pin, 'id'>
        if (data.archivedAt == null) {
          pins.push({ id: d.id, ...data })
        }
      })
      onUpdate(pins)
    },
    onError,
  )
}
