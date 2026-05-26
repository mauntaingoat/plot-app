/**
 * Open House scheduler. Pro-only on web; we enforce here too via
 * an inline paywall card for free users so the gate is visible from
 * the action sheet — same shape the desktop OpenHouseEditor uses.
 *
 * Sessions store as { id, date 'YYYY-MM-DD', startTime 'HH:MM', endTime
 * 'HH:MM' } per `OpenHouseSession` in `src/lib/types.ts`. Recurring
 * weekly drop-down repeats the FIRST session for N additional weeks
 * (server-side rendering walks this on the public profile).
 */
import { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import { Calendar, Plus, Trash, X, Lock } from 'phosphor-react-native'
import { BottomSheet } from './BottomSheet'
import { BrandButton } from './BrandButton'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap, selection, warning } from '../lib/haptics'
import { updatePin } from '../lib/firestoreDb'
import type { Pin } from '../types'

interface OpenHouseSession {
  id: string
  date: string       // YYYY-MM-DD
  startTime: string  // 24h HH:MM
  endTime: string    // 24h HH:MM
}

interface OpenHouse {
  sessions: OpenHouseSession[]
  recurringWeeks?: number
}

// Pin's `openHouse` field is `unknown` in the mobile narrow type
// (see `mobile/src/types/index.ts`) — we cast on read here so we
// keep one source of truth (the Pin type) without a full mobile
// schema port.
function getOpenHouse(p: Pin | null): OpenHouse | null {
  if (!p) return null
  const v = (p as Pin & { openHouse?: unknown }).openHouse
  if (!v || typeof v !== 'object') return null
  return v as OpenHouse
}

const RECURRING_OPTIONS = [
  { id: 0, label: 'No repeat' },
  { id: 1, label: '1 wk' },
  { id: 2, label: '2 wks' },
  { id: 4, label: '4 wks' },
  { id: 8, label: '8 wks' },
]

function newSession(): OpenHouseSession {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: today,
    startTime: '14:00',
    endTime: '17:00',
  }
}

function toDate(yyyymmdd: string): Date {
  return new Date(`${yyyymmdd}T12:00:00`)
}
function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function toTimeDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}
function dateToTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateShort(yyyymmdd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return yyyymmdd
  return new Date(`${yyyymmdd}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}
function formatTime12h(hhmm: string): string {
  if (!/^\d{1,2}:\d{2}$/.test(hhmm)) return hhmm
  const [hStr, m] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export function OpenHouseSheet({
  pin,
  isPro,
  onClose,
  onUpgrade,
}: {
  pin: Pin | null
  isPro: boolean
  onClose: () => void
  onUpgrade: () => void
}) {
  const styles = useThemedStyles(_styles)
  const colors = useColors()
  const [sessions, setSessions] = useState<OpenHouseSession[]>([])
  const [recurringWeeks, setRecurringWeeks] = useState(0)
  const [saving, setSaving] = useState(false)
  // Per-session picker state — null when no picker is open.
  const [picker, setPicker] = useState<{ sessionId: string; field: 'date' | 'startTime' | 'endTime' } | null>(null)

  useEffect(() => {
    if (!pin) return
    const oh = getOpenHouse(pin)
    const existing = oh?.sessions || []
    setSessions(existing.length > 0 ? existing : [newSession()])
    setRecurringWeeks(oh?.recurringWeeks || 0)
    setPicker(null)
  }, [pin])

  const updateSession = (id: string, patch: Partial<OpenHouseSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  const addSession = () => {
    lightTap()
    setSessions((prev) => [...prev, newSession()])
  }
  const removeSession = (id: string) => {
    warning()
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSave = async () => {
    if (!pin) return
    setSaving(true)
    const validSessions = sessions.filter((s) => s.date && s.startTime && s.endTime)
    const oh = validSessions.length === 0
      ? null
      : { sessions: validSessions, recurringWeeks: recurringWeeks || 0 }
    try {
      await updatePin(pin.id, { openHouse: oh })
      onClose()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[OpenHouseSheet] save failed', e)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!pin) return
    setSaving(true)
    try {
      await updatePin(pin.id, { openHouse: null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const hasValidSessions = sessions.some((s) => s.date && s.startTime && s.endTime)
  const hadOpenHouse = !!getOpenHouse(pin)

  return (
    <BottomSheet visible={!!pin} onClose={onClose}>
      <View style={styles.header}>
        <Calendar size={18} color={COLORS.tangerine} weight="regular" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>Schedule Open House</Text>
          {pin ? <Text style={styles.address} numberOfLines={1}>{pin.address}</Text> : null}
        </View>
        <Pressable
          onPress={() => { lightTap(); onClose() }}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <X size={18} color={colors.smoke} weight="bold" />
        </Pressable>
      </View>

      {!isPro ? (
        // Pro paywall card — Free users see what Open House is but
        // can't schedule one until they upgrade.
        <View style={styles.body}>
          <View style={styles.paywallCard}>
            <View style={styles.paywallIcon}>
              <Lock size={18} color={COLORS.tangerine} weight="fill" />
            </View>
            <Text style={styles.paywallTitle}>Open Houses are a Pro feature</Text>
            <Text style={styles.paywallBody}>
              Schedule sessions on your for-sale listings — buyers see them on
              your profile and can save the date.
            </Text>
            <Pressable
              onPress={() => { lightTap(); onUpgrade() }}
              style={({ pressed }) => [styles.upgradeBtn, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient
                colors={[...COLORS.brandGradient]}
                locations={[...COLORS.brandGradientLocations]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.upgradeBtnText}>Go Pro — $19/mo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <ScrollView style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
          <View style={styles.body}>
            {sessions.map((session, idx) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionLabel}>Session {idx + 1}</Text>
                  {sessions.length > 1 ? (
                    <Pressable
                      onPress={() => removeSession(session.id)}
                      hitSlop={6}
                      style={({ pressed }) => [styles.sessionDelete, pressed && { opacity: 0.6 }]}
                    >
                      <Trash size={14} color={COLORS.liveRed} weight="regular" />
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.fieldLabel}>Date</Text>
                <Pressable
                  onPress={() => { selection(); setPicker({ sessionId: session.id, field: 'date' }) }}
                  style={({ pressed }) => [styles.fieldRow, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.fieldValue}>{formatDateShort(session.date)}</Text>
                </Pressable>

                <View style={styles.timeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Start</Text>
                    <Pressable
                      onPress={() => { selection(); setPicker({ sessionId: session.id, field: 'startTime' }) }}
                      style={({ pressed }) => [styles.fieldRow, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.fieldValue}>{formatTime12h(session.startTime)}</Text>
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>End</Text>
                    <Pressable
                      onPress={() => { selection(); setPicker({ sessionId: session.id, field: 'endTime' }) }}
                      style={({ pressed }) => [styles.fieldRow, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.fieldValue}>{formatTime12h(session.endTime)}</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.previewLine}>
                  {formatDateShort(session.date)} · {formatTime12h(session.startTime)} – {formatTime12h(session.endTime)}
                </Text>

                {/* Inline iOS-native picker. Forced to `themeVariant
                    "light"` so the calendar/spinner renders against a
                    white card embedded in the dark sheet — iOS's dark
                    picker variant has muted gray-on-near-black text
                    that's hard to read in our context. */}
                {picker?.sessionId === session.id ? (
                  <View style={[styles.pickerWrap, { backgroundColor: '#FEFEFE' }]}>
                    {picker.field === 'date' ? (
                      <DateTimePicker
                        value={toDate(session.date)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        themeVariant="light"
                        accentColor={COLORS.tangerine}
                        onChange={(_, d) => {
                          if (d) updateSession(session.id, { date: dateToISO(d) })
                          if (Platform.OS !== 'ios') setPicker(null)
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        value={toTimeDate(picker.field === 'startTime' ? session.startTime : session.endTime)}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant="light"
                        accentColor={COLORS.tangerine}
                        onChange={(_, d) => {
                          if (d) updateSession(session.id, { [picker.field]: dateToTime(d) })
                          if (Platform.OS !== 'ios') setPicker(null)
                        }}
                      />
                    )}
                    <Pressable
                      onPress={() => setPicker(null)}
                      style={({ pressed }) => [styles.pickerDone, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}

            <Pressable
              onPress={addSession}
              style={({ pressed }) => [styles.addSessionBtn, pressed && { opacity: 0.85 }]}
            >
              <Plus size={14} color={COLORS.tangerine} weight="bold" />
              <Text style={styles.addSessionText}>Add another session</Text>
            </Pressable>

            <Text style={styles.recurringLabel}>Repeat weekly</Text>
            <View style={styles.recurringRow}>
              {RECURRING_OPTIONS.map((o) => {
                const active = o.id === recurringWeeks
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => { selection(); setRecurringWeeks(o.id) }}
                    style={({ pressed }) => [
                      styles.recurringBtn,
                      active && styles.recurringBtnActive,
                      pressed && !active && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.recurringBtnText, active && styles.recurringBtnTextActive]}>
                      {o.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={styles.recurringHelp}>
              Repeats the first session same day &amp; time for the next N weeks.
            </Text>

            <View style={{ height: 16 }} />
            <BrandButton
              label={saving ? 'Saving…' : 'Save'}
              onPress={handleSave}
              loading={saving}
              disabled={saving || !hasValidSessions}
            />
            {hadOpenHouse ? (
              <Pressable
                onPress={handleClear}
                disabled={saving}
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.clearBtnText}>Clear all sessions</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      )}
    </BottomSheet>
  )
}

const _styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  address: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.cream,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  sessionCard: {
    backgroundColor: COLORS.cream,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sessionLabel: {
    fontFamily: FONTS.humanistBold, fontSize: 12, color: COLORS.tangerine,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sessionDelete: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
  },

  fieldLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 10, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 4,
  },
  fieldRow: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 8,
  },
  fieldValue: { fontFamily: FONTS.humanistSemibold, fontSize: 14, color: COLORS.ink },

  pickerWrap: {
    marginTop: 8,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 10,
    paddingVertical: 4,
  },
  pickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, marginBottom: 4,
  },
  pickerDoneText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.tangerine },

  timeRow: { flexDirection: 'row', gap: 8 },
  previewLine: {
    fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke,
    marginTop: 4,
  },

  addSessionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,107,61,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,107,61,0.30)', borderStyle: 'dashed',
    marginTop: 6,
  },
  addSessionText: { fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.tangerine },

  recurringLabel: {
    fontFamily: FONTS.humanistBold, fontSize: 13, color: COLORS.ink,
    marginTop: 18, marginBottom: 8,
  },
  recurringRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recurringBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.cream,
  },
  recurringBtnActive: { backgroundColor: COLORS.ink },
  recurringBtnText: { fontFamily: FONTS.humanistSemibold, fontSize: 12, color: COLORS.smoke },
  recurringBtnTextActive: { color: COLORS.warmWhite },
  recurringHelp: {
    fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.smoke, lineHeight: 16,
    marginTop: 8,
  },

  clearBtn: {
    alignItems: 'center', paddingVertical: 12, marginTop: 8,
  },
  clearBtnText: { fontFamily: FONTS.humanistMedium, fontSize: 13, color: COLORS.liveRed },

  // Paywall card (Free users)
  paywallCard: {
    backgroundColor: COLORS.cream,
    borderRadius: 18, padding: 20,
    alignItems: 'center',
  },
  paywallIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,107,61,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  paywallTitle: {
    fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.ink,
    textAlign: 'center', marginBottom: 6,
  },
  paywallBody: {
    fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke,
    textAlign: 'center', lineHeight: 19, marginBottom: 18,
  },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, paddingHorizontal: 22,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#D94A1F',
    shadowOpacity: 0.45, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  upgradeBtnText: { fontFamily: FONTS.humanistBold, fontSize: 14, color: COLORS.warmWhite },
})
