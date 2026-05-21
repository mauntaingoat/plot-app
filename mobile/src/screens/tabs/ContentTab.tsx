import { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Image } from 'react-native'
import { FilmStrip, UploadSimple, Plus, Camera } from 'phosphor-react-native'
import { COLORS, FONTS } from '../../lib/tokens'
import { usePins } from '../../lib/usePins'
import { lightTap, selection } from '../../lib/haptics'
import type { Pin, PinContentItem } from '../../types'

/**
 * Content tab — mirrors `src/components/dashboard/ContentLibrary.tsx`
 * mobile layout. Aggregates pin.content[] across all pins into a
 * single library view, filterable by type.
 *
 * Filter pills (active = ink bg / warm-white text; inactive = cream
 * bg / smoke text):
 *   All / Videos / Photos / No Listing
 *
 * Upload + Edit flows (caption editing, archive, carousel/reel
 * editing) are deferred to the next milestone — the content upload /
 * content edit / PinCreate work. This tab is read-only thumbnails
 * for now.
 */

type Filter = 'all' | 'reel' | 'photo' | 'no_listing'

interface ContentRow {
  contentId: string
  pinId: string | null
  pinAddress: string | null
  item: PinContentItem
  isLinked: boolean
}

export function ContentTab({ onUpload }: { onUpload?: () => void }) {
  const { pins, loading } = usePins()
  const [filter, setFilter] = useState<Filter>('all')

  const allContent: ContentRow[] = useMemo(() => {
    const rows: ContentRow[] = []
    pins.forEach((pin: Pin) => {
      (pin.content || []).forEach((c) => {
        rows.push({
          contentId: c.id ?? `${pin.id}-${Math.random()}`,
          pinId: pin.id,
          pinAddress: pin.address,
          item: c,
          isLinked: true,
        })
      })
    })
    return rows
  }, [pins])

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
        <View style={styles.iconChip}>
          <FilmStrip size={20} color={COLORS.warmWhite} weight="fill" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Content</Text>
          <Text style={styles.tabSubtitle}>Reels, photos, and listing media</Text>
        </View>
      </View>

      {/* Filter pills + Upload */}
      <View style={styles.filterRow}>
        {(['all', 'reel', 'photo', 'no_listing'] as const).map((id) => {
          const label = id === 'all' ? 'All' : id === 'reel' ? 'Videos' : id === 'photo' ? 'Photos' : 'No Listing'
          const isActive = filter === id
          return (
            <Pressable
              key={id}
              onPress={() => { if (filter !== id) { selection(); setFilter(id) } }}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.pillText, { color: isActive ? COLORS.warmWhite : COLORS.smoke }]}>
                {label}
              </Text>
            </Pressable>
          )
        })}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => { lightTap(); onUpload?.() }}
          style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.9 }]}
        >
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
          <SkeletonContent />
          <SkeletonContent />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState onUpload={onUpload} />
      ) : (
        <View style={styles.grid}>
          {filtered.map((row) => (
            <View key={row.contentId} style={styles.col}>
              <ContentCard row={row} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function ContentCard({ row }: { row: ContentRow }) {
  const thumb = row.item.thumbnailUrl ?? row.item.mediaUrl ?? null
  const isVideo = row.item.type === 'reel'
  return (
    <Pressable
      onPress={() => lightTap()}
      style={({ pressed }) => [
        styles.contentCard,
        row.isLinked && styles.contentCardLinked,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.contentThumb}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.thumbFallback]}>
            <Camera size={28} color={COLORS.ash} />
          </View>
        )}
        {isVideo ? (
          <View style={styles.videoChip}>
            <FilmStrip size={11} color={COLORS.warmWhite} weight="fill" />
            <Text style={styles.videoChipText}>Reel</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

function EmptyState({ onUpload }: { onUpload?: () => void }) {
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
          style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]}
        >
          <Plus size={16} color={COLORS.warmWhite} weight="bold" />
          <Text style={styles.emptyCtaText}>Upload Content</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function SkeletonContent() {
  return (
    <View style={styles.col}>
      <View style={[styles.contentThumb, { backgroundColor: COLORS.pearl }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconChip: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.tangerine,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D94A1F', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  tabTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  tabSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 2 },

  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { height: 32, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: COLORS.ink },
  pillInactive: { backgroundColor: COLORS.cream },
  pillText: { fontFamily: FONTS.humanistBold, fontSize: 12 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.tangerine,
  },
  uploadBtnText: { fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.warmWhite },
  countText: { fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.ash, marginBottom: 12, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  col: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },

  contentCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  contentCardLinked: { borderWidth: 2, borderColor: 'rgba(255,107,61,0.25)' },
  contentThumb: { aspectRatio: 9 / 11, backgroundColor: COLORS.pearl, position: 'relative' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  videoChip: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  videoChipText: { fontFamily: FONTS.humanistBold, fontSize: 9, color: COLORS.warmWhite, letterSpacing: 0.3 },

  empty: { backgroundColor: COLORS.cream, borderRadius: 18, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.pearl, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink, marginBottom: 4 },
  emptyBody: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginBottom: 16, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, paddingHorizontal: 18, borderRadius: 8, backgroundColor: COLORS.tangerine,
    shadowColor: '#D94A1F', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
  },
  emptyCtaText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.warmWhite },
})
