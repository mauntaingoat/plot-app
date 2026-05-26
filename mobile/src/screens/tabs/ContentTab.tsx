import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FilmStrip, UploadSimple, Plus } from 'phosphor-react-native'
import { BrandIconChip } from '../../components/BrandIconChip'
import { ContentCard, type ContentRow } from '../../components/ContentCard'
import { ContentActionsSheet } from '../../components/ContentActionsSheet'
import { EditCaptionSheet } from '../../components/content/EditCaptionSheet'
import { ReassignPinSheet } from '../../components/content/ReassignPinSheet'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { updatePinContentItem, reassignContentToPin, archiveContentItem, unlinkContentFromPin } from '../../lib/firestoreDb'
import { useEffect } from 'react'
import { getFirestore, collection, query, where, onSnapshot, type FirebaseFirestoreTypes } from '@react-native-firebase/firestore'
import { COLORS, FONTS } from '../../lib/tokens'
import { useThemedStyles } from '../../lib/theme'
import { usePins } from '../../lib/usePins'
import { useUserDoc } from '../../lib/useUserDoc'
import { lightTap, selection, warning } from '../../lib/haptics'
import type { Pin, PinContentItem } from '../../types'

/**
 * Content tab — mirrors `src/components/dashboard/ContentLibrary.tsx`
 * mobile layout. Aggregates pin.content[] across all pins into a
 * single library view, filterable by type.
 *
 * Filter pills (active = ink bg / warm-white text; inactive = cream
 * bg / smoke text): All / Videos / Photos / No Listing
 *
 * Each ContentCard shows a linked-pin chip, caption, Pro-gated stats,
 * and a three-dots actions menu. Tap card OR three-dots opens the
 * ContentActionsSheet (Edit Caption / Edit Media / Archive). Edit
 * flows themselves drop in next milestone.
 */

type Filter = 'all' | 'reel' | 'photo' | 'no_listing'

export function ContentTab({ onUpload }: { onUpload?: () => void }) {
  const styles = useThemedStyles(_styles)
  const { pins, loading } = usePins()
  const { userDoc } = useUserDoc()
  const [filter, setFilter] = useState<Filter>('all')
  const [actions, setActions] = useState<ContentRow | null>(null)
  const [editCaptionFor, setEditCaptionFor] = useState<ContentRow | null>(null)
  const [reassignFor, setReassignFor] = useState<ContentRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ContentRow | null>(null)

  const isPro = userDoc?.tier === 'pro'

  // Standalone "no-listing" content. Subscribed live from the
  // `content` collection where pinId is null. Web does the same —
  // these items show up under the "No Listing" filter.
  const [unlinked, setUnlinked] = useState<PinContentItem[]>([])
  useEffect(() => {
    if (!userDoc?.uid) return
    const db = getFirestore()
    const q = query(
      collection(db, 'content'),
      where('agentId', '==', userDoc.uid),
      where('pinId', '==', null),
    )
    return onSnapshot(
      q,
      (snap: FirebaseFirestoreTypes.QuerySnapshot) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PinContentItem, 'id'>) }))
          .filter((c) => !(c as { archivedAt?: unknown }).archivedAt)
        setUnlinked(rows)
      },
      () => setUnlinked([]),
    )
  }, [userDoc?.uid])

  const allContent: ContentRow[] = useMemo(() => {
    const rows: ContentRow[] = []
    pins.forEach((pin: Pin) => {
      (pin.content || []).forEach((c: PinContentItem) => {
        rows.push({
          contentId: c.id ?? `${pin.id}-${Math.random().toString(36).slice(2, 8)}`,
          pinId: pin.id,
          pinAddress: pin.address,
          item: c,
          isLinked: true,
        })
      })
    })
    unlinked.forEach((c) => {
      rows.push({
        contentId: c.id ?? `unlinked-${Math.random().toString(36).slice(2, 8)}`,
        pinId: null,
        pinAddress: null,
        item: c,
        isLinked: false,
      })
    })
    return rows
  }, [pins, unlinked])

  const filtered = useMemo(() => {
    return allContent.filter((row) => {
      if (filter === 'all') return true
      if (filter === 'no_listing') return !row.isLinked
      if (filter === 'reel') return row.item.type === 'reel'
      if (filter === 'photo') return row.item.type === 'photo'
      return true
    })
  }, [allContent, filter])

  return (
    <View>
      {/* TabHeader */}
      <View style={styles.tabHeader}>
        <BrandIconChip>
          <FilmStrip size={20} color={COLORS.warmWhite} weight="regular" />
        </BrandIconChip>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Content</Text>
          <Text style={styles.tabSubtitle}>Reels, photos, and listing media</Text>
        </View>
      </View>

      {/* Filter pills + Upload */}
      <View style={styles.filterRow}>
        {([
          { id: 'all', label: 'All' },
          { id: 'reel', label: 'Videos' },
          { id: 'photo', label: 'Photos' },
          { id: 'no_listing', label: 'No Listing' },
        ] as const).map((f) => {
          const isActive = filter === f.id
          return (
            <Pressable
              key={f.id}
              onPress={() => { if (!isActive) { selection(); setFilter(f.id) } }}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.pillText, { color: isActive ? COLORS.warmWhite : COLORS.smoke }]}>
                {f.label}
              </Text>
            </Pressable>
          )
        })}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => { lightTap(); onUpload?.() }}
          style={({ pressed }) => [styles.uploadBtn, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient
            colors={[...COLORS.brandGradient]}
            locations={[...COLORS.brandGradientLocations]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Plus size={14} color={COLORS.warmWhite} weight="bold" />
          <Text style={styles.uploadBtnText}>Upload</Text>
        </Pressable>
      </View>

      <Text style={styles.countText}>
        {loading ? '…' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
      </Text>

      {/* Grid */}
      {loading ? (
        <View style={styles.grid}>
          <SkeletonContent />
          <SkeletonContent />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState onUpload={onUpload} />
      ) : (
        <View style={styles.grid}>
          {filtered.map((row) => (
            <View key={row.contentId} style={styles.col}>
              <ContentCard
                row={row}
                isPro={isPro}
                onPress={() => setActions(row)}
                onMediaPress={() => Alert.alert(
                  row.item.type === 'reel' ? 'Play reel' : 'View carousel',
                  'Media player lands next milestone.',
                )}
              />
            </View>
          ))}
        </View>
      )}

      <ContentActionsSheet
        row={actions}
        onClose={() => setActions(null)}
        onEditCaption={() => {
          const row = actions
          setActions(null)
          if (row) setEditCaptionFor(row)
        }}
        onEditMedia={() => { setActions(null); Alert.alert('Edit Media', 'Content editor lands next milestone.') }}
        onArchive={() => {
          const row = actions
          setActions(null)
          if (!row) return
          warning()
          setArchiveTarget(row)
        }}
        onReassignPin={() => {
          const row = actions
          setActions(null)
          if (row) setReassignFor(row)
        }}
      />

      <EditCaptionSheet
        visible={!!editCaptionFor}
        initialCaption={editCaptionFor?.item.caption ?? null}
        onClose={() => setEditCaptionFor(null)}
        onSave={async (caption) => {
          if (!editCaptionFor?.pinId || !editCaptionFor.item.id) return
          try {
            await updatePinContentItem(editCaptionFor.pinId, editCaptionFor.item.id, { caption })
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[ContentTab] caption save failed', e)
            Alert.alert('Could not save', 'Try again in a moment.')
          }
        }}
      />

      <ReassignPinSheet
        visible={!!reassignFor}
        pins={pins}
        currentPinId={reassignFor?.pinId ?? null}
        onClose={() => setReassignFor(null)}
        onPick={async (toPinId) => {
          if (!reassignFor?.item.id) return
          try {
            if (reassignFor.pinId) {
              await reassignContentToPin(reassignFor.item.id, reassignFor.pinId, toPinId)
            } else {
              // Re-linking an unlinked item: simulate the same shape
              // by passing a synthetic "from" id so the helper picks
              // up the append-to-target path. The fromPin path is a
              // no-op for unlinked items since there's no pin array
              // to remove from.
              const { getFirestore: gfs, doc: docFn, getDoc: gd, updateDoc: ud } = await import('@react-native-firebase/firestore')
              const db = gfs()
              const toSnap = await gd(docFn(db, 'pins', toPinId))
              const toData = toSnap.data() as { content?: unknown[] } | undefined
              const nextTo = [...(toData?.content ?? []), reassignFor.item]
              await ud(docFn(db, 'pins', toPinId), { content: nextTo })
              await ud(docFn(db, 'content', reassignFor.item.id), { pinId: toPinId })
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[ContentTab] reassign failed', e)
            Alert.alert('Could not reassign', 'Try again in a moment.')
          }
        }}
        onUnlink={async () => {
          if (!reassignFor?.pinId || !reassignFor.item.id || !userDoc?.uid) return
          try {
            await unlinkContentFromPin(
              reassignFor.item.id,
              reassignFor.pinId,
              reassignFor.item as unknown as Record<string, unknown>,
              userDoc.uid,
            )
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[ContentTab] unlink failed', e)
            Alert.alert('Could not unlink', 'Try again in a moment.')
          }
        }}
      />

      <ConfirmSheet
        visible={!!archiveTarget}
        title="Archive this content?"
        message="It'll be removed from your library and any pin it's attached to. Archived content is permanently deleted after 7 days."
        confirmLabel="Archive"
        destructive
        onConfirm={async () => {
          const row = archiveTarget
          setArchiveTarget(null)
          if (!row) return
          try {
            await archiveContentItem(row.contentId, row.pinId)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[ContentTab] archive failed', e)
            Alert.alert('Could not archive', 'Try again in a moment.')
          }
        }}
        onClose={() => setArchiveTarget(null)}
      />
    </View>
  )
}

function EmptyState({ onUpload }: { onUpload?: () => void }) {
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <UploadSimple size={18} color={COLORS.smoke} />
      </View>
      <Text style={styles.emptyTitle}>No content yet</Text>
      <Text style={styles.emptyBody}>Upload photos and videos to your library.</Text>
      {onUpload ? (
        <Pressable
          onPress={() => { lightTap(); onUpload() }}
          style={({ pressed }) => [styles.emptyCta, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient
            colors={[...COLORS.brandGradient]}
            locations={[...COLORS.brandGradientLocations]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Plus size={16} color={COLORS.warmWhite} weight="bold" />
          <Text style={styles.emptyCtaText}>Upload Content</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function SkeletonContent() {
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.col}>
      <View style={[styles.skeleton]} />
    </View>
  )
}

const _styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: COLORS.ink },
  pillInactive: { backgroundColor: COLORS.cream },
  pillText: { fontFamily: FONTS.humanistBold, fontSize: 12 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  uploadBtnText: { fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.warmWhite },

  countText: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.ash, marginBottom: 12, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  col: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },

  skeleton: { aspectRatio: 9 / 11, backgroundColor: COLORS.pearl, borderRadius: 18 },

  empty: { backgroundColor: COLORS.cream, borderRadius: 18, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.pearl, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink, marginBottom: 4 },
  emptyBody: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginBottom: 16, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  emptyCtaText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.warmWhite },
})
