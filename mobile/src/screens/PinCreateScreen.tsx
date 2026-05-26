/**
 * Pin Create flow — iOS port of `src/pages/PinCreate.tsx` (web).
 *
 * 3-step wizard inside a single stack screen:
 *   1. Type    — For Sale / Sold / Spotlight
 *   2. Address — Mapbox geocoding autocomplete
 *   3. Details — price + beds/baths/sqft (manual entry) → Publish
 *
 * No external property-data lookup: the listing agent already knows
 * beds/baths/sqft/price for their own listing. We surface a clean,
 * fast manual form rather than burning per-call API spend on data
 * the user can type in ten seconds.
 *
 * Photo upload is intentionally deferred to Edit Pin Details so the
 * create flow stays fast. After publish we navigate back to the
 * dashboard; the agent can tap the new pin → Edit → add photos.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  X,
  MapPin,
  MagnifyingGlass as Search,
  House,
  Key,
  Compass,
  Check,
  CurrencyDollar as DollarSign,
} from 'phosphor-react-native'
import { BrandButton } from '../components/BrandButton'
import { BrandInput } from '../components/BrandInput'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { COLORS, FONTS } from '../lib/tokens'
import { useColors, useThemedStyles } from '../lib/theme'
import { lightTap, selection } from '../lib/haptics'
import { useUserDoc } from '../lib/useUserDoc'
import { createPin, togglePinEnabled } from '../lib/firestoreDb'
import { createGeocodingController, type GeocodingResult } from '../lib/geocoding'
import type { AppStackParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<AppStackParamList, 'PinCreate'>
type PinType = 'for_sale' | 'sold' | 'spotlight'

const TYPE_OPTIONS: { id: PinType; label: string; description: string; Icon: typeof House; color: string }[] = [
  { id: 'for_sale',  label: 'For Sale Listing', description: 'Active listing with MLS data, photos, and content',     Icon: House,   color: '#3B82F6' },
  { id: 'sold',      label: 'Sold Listing',     description: 'Closed sale — showcase your track record',              Icon: Key,     color: COLORS.soldGreen },
  { id: 'spotlight', label: 'Spotlight',        description: 'Highlight a neighborhood, building, or local favorite', Icon: Compass, color: COLORS.tangerine },
]

export function PinCreateScreen() {
  const navigation = useNavigation<Nav>()
  const { userDoc } = useUserDoc()
  const colors = useColors()
  const styles = useThemedStyles(_styles)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [pinType, setPinType] = useState<PinType>('for_sale')
  const [address, setAddress] = useState('')
  const [center, setCenter] = useState<[number, number] | null>(null)
  const [unit, setUnit] = useState('')

  // Property fields — the agent fills these in by hand. We used to
  // auto-fill from Rentcast on address selection; removed because
  // the per-call cost broke Pro economics and listing agents already
  // know these values for their own listings.
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState(3)
  const [baths, setBaths] = useState(2)
  const [sqft, setSqft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [description, setDescription] = useState('')

  const [publishing, setPublishing] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const hasUnsavedWork = () => {
    return !!address || !!price || !!description
  }

  // Header X — exits the whole screen (with confirm if user has typed anything).
  const onHeaderClose = () => {
    if (hasUnsavedWork()) {
      setDiscardConfirmOpen(true)
    } else {
      navigation.goBack()
    }
  }

  // Footer Back — goes to previous step (only shown on steps 2/3).
  const onStepBack = () => {
    selection()
    setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3)
  }

  const onContinue = () => {
    if (step === 1) { selection(); setStep(2); return }
    if (step === 2) { selection(); setStep(3); return }
  }

  const canContinueFromStep = (s: number): boolean => {
    if (s === 1) return !!pinType
    if (s === 2) return address.length > 3 && !!center
    if (s === 3) {
      // Spotlight has no required fields on step 3 — name auto-derives
      // from the picked location, description is optional.
      if (pinType === 'spotlight') return true
      return !!price && Number(price) > 0
    }
    return false
  }

  const onPublish = async () => {
    if (!userDoc?.uid || !center) return
    setPublishing(true)
    try {
      const priceNum = Number(price) || 0
      const sqftNum = Number(sqft) || 0
      const yearBuiltNum = yearBuilt ? Number(yearBuilt) : null
      const pinData: Record<string, unknown> = {
        agentId: userDoc.uid,
        type: pinType,
        coordinates: { lat: center[1], lng: center[0] },
        address,
        unit: unit.trim() || null,
        neighborhoodId: '',
        geohash: '',
        content: [],
      }
      if (pinType === 'for_sale') {
        Object.assign(pinData, {
          price: priceNum, beds, baths, sqft: sqftNum,
          pricePerSqft: sqftNum ? Math.round(priceNum / sqftNum) : 0,
          yearBuilt: yearBuiltNum,
          description,
          listingStatus: 'active',
          heroPhotoUrl: '', photos: [], openHouse: null,
        })
      } else if (pinType === 'sold') {
        Object.assign(pinData, {
          soldPrice: priceNum, originalPrice: priceNum,
          soldDate: new Date(), // server stores as Timestamp
          beds, baths, sqft: sqftNum,
          pricePerSqft: sqftNum ? Math.round(priceNum / sqftNum) : 0,
          yearBuilt: yearBuiltNum,
          description,
          heroPhotoUrl: '', photos: [],
        })
      } else {
        Object.assign(pinData, {
          // Spotlight name = first segment of selected location
          // (e.g. "Brickell" from "Brickell, Miami, Florida, United States").
          name: address.split(',')[0].trim(),
          description,
          heroPhotoUrl: '',
        })
      }
      const pinId = await createPin(pinData)
      // Try to enable — server-side will reject if at cap. We swallow
      // the failure and leave the pin as a hidden draft; the agent
      // sees the toggle off on My Pins.
      try { await togglePinEnabled(pinId, true) } catch { /* at cap */ }
      navigation.goBack()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[PinCreate] publish failed', e)
      Alert.alert('Could not publish', 'Try again in a moment.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.pageBg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { lightTap(); onHeaderClose() }}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.surfaceBg, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <X size={18} color={colors.ink} weight="bold" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>New Pin</Text>
          <Text style={[styles.stepHint, { color: colors.smoke }]}>Step {step} of 3</Text>
        </View>
        {/* Progress dots */}
        <View style={styles.dots}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={[
                styles.dot,
                n <= step ? { backgroundColor: COLORS.tangerine } : { backgroundColor: colors.pearlBg },
              ]}
            />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <StepType pinType={pinType} onPick={setPinType} />
          ) : step === 2 ? (
            <StepAddress
              pinType={pinType}
              address={address}
              setAddress={setAddress}
              setCenter={setCenter}
              unit={unit}
              setUnit={setUnit}
              colors={colors}
            />
          ) : (
            <StepDetails
              pinType={pinType}
              address={address}
              price={price} setPrice={setPrice}
              beds={beds} setBeds={setBeds}
              baths={baths} setBaths={setBaths}
              sqft={sqft} setSqft={setSqft}
              description={description} setDescription={setDescription}
              colors={colors}
            />
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.pageBg, borderTopColor: colors.border }]}>
          <View style={styles.footerRow}>
            {step > 1 ? (
              <Pressable
                onPress={onStepBack}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { backgroundColor: colors.surfaceBg, borderColor: colors.border },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.ink }]}>Back</Text>
              </Pressable>
            ) : null}
            <View style={{ flex: step > 1 ? 2 : 1 }}>
              {step < 3 ? (
                <BrandButton
                  label="Continue"
                  onPress={onContinue}
                  disabled={!canContinueFromStep(step)}
                />
              ) : (
                <BrandButton
                  label={publishing ? 'Publishing…' : 'Publish Pin'}
                  onPress={onPublish}
                  loading={publishing}
                  disabled={publishing || !canContinueFromStep(3)}
                />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={discardConfirmOpen}
        title="Discard this pin?"
        message="You'll lose anything you've entered."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => { setDiscardConfirmOpen(false); navigation.goBack() }}
        onClose={() => setDiscardConfirmOpen(false)}
      />
    </SafeAreaView>
  )
}

// ── Step 1: type picker ──
function StepType({ pinType, onPick }: { pinType: PinType; onPick: (t: PinType) => void }) {
  const colors = useColors()
  const styles = useThemedStyles(_styles)
  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTitle, { color: colors.ink }]}>What are you adding?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.smoke }]}>
        Choose the type of pin for your map.
      </Text>
      <View style={{ height: 18 }} />
      {TYPE_OPTIONS.map((o) => {
        const active = pinType === o.id
        return (
          <Pressable
            key={o.id}
            onPress={() => { selection(); onPick(o.id) }}
            style={({ pressed }) => [
              styles.typeCard,
              { backgroundColor: colors.cardBg, borderColor: active ? COLORS.tangerine : colors.border },
              active && { borderWidth: 2 },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.typeIcon, { backgroundColor: `${o.color}1f` }]}>
              <o.Icon size={20} color={o.color} weight="regular" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.typeLabel, { color: colors.ink }]}>{o.label}</Text>
              <Text style={[styles.typeDesc, { color: colors.smoke }]}>{o.description}</Text>
            </View>
            {active ? <Check size={18} color={COLORS.tangerine} weight="bold" /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

// ── Step 2: address search ──
function StepAddress({
  pinType,
  address,
  setAddress,
  setCenter,
  unit,
  setUnit,
  colors,
}: {
  pinType: PinType
  address: string
  setAddress: (s: string) => void
  setCenter: (c: [number, number] | null) => void
  unit: string
  setUnit: (s: string) => void
  colors: ReturnType<typeof useColors>
}) {
  const styles = useThemedStyles(_styles)
  const [query, setQuery] = useState(address)
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState(!!address && !!query)

  const isSpotlight = pinType === 'spotlight'

  const controller = useMemo(
    () => createGeocodingController(({ results, loading, error }) => {
      setResults(results)
      setLoading(loading)
      setError(error)
    }),
    [],
  )

  useEffect(() => () => controller.clear(), [controller])

  const onChangeText = (v: string) => {
    setQuery(v)
    setPicked(false)
    setCenter(null)
    setAddress('')
    controller.search(v, isSpotlight ? 'spotlight' : 'address')
  }

  const onPick = (r: GeocodingResult) => {
    lightTap()
    setQuery(r.placeName)
    setAddress(r.placeName)
    setCenter(r.center)
    setResults([])
    setPicked(true)
  }

  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTitle, { color: colors.ink }]}>
        {isSpotlight ? 'What location?' : 'Where is it?'}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.smoke }]}>
        Search for the address or location.
      </Text>
      <View style={{ height: 14 }} />

      <View style={[styles.searchBox, { backgroundColor: colors.surfaceBg, borderColor: colors.border }]}>
        <Search size={16} color={colors.smoke} />
        <TextInput
          value={query}
          onChangeText={onChangeText}
          placeholder={isSpotlight ? 'Search neighborhoods, cities, counties...' : 'Search address...'}
          placeholderTextColor={colors.ash}
          style={[styles.searchInput, { color: colors.ink }]}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator size="small" color={COLORS.tangerine} /> : null}
      </View>

      {!picked && results.length > 0 ? (
        <View style={[styles.results, { backgroundColor: colors.surfaceBg, borderColor: colors.border }]}>
          {results.map((r, i) => (
            <Pressable
              key={`${r.placeName}-${i}`}
              onPress={() => onPick(r)}
              style={({ pressed }) => [
                styles.resultRow,
                i < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MapPin size={14} color={colors.smoke} />
              <Text style={[styles.resultText, { color: colors.ink }]} numberOfLines={2}>
                {r.placeName}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!picked && error ? (
        <Pressable
          onPress={() => { lightTap(); controller.retry() }}
          style={({ pressed }) => [
            styles.errorPill,
            { backgroundColor: 'rgba(225,72,72,0.08)', borderColor: 'rgba(225,72,72,0.30)' },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.errorPillText, { color: COLORS.liveRed }]} numberOfLines={2}>
            {error}
          </Text>
          <Text style={[styles.errorPillRetry, { color: COLORS.liveRed }]}>Retry</Text>
        </Pressable>
      ) : null}

      {!picked && !error && !loading && query.trim().length >= 3 && results.length === 0 ? (
        <View style={[styles.emptyPill, { backgroundColor: colors.surfaceBg, borderColor: colors.border }]}>
          <Text style={[styles.emptyPillText, { color: colors.smoke }]}>
            No matches. Try a more specific address or include the city.
          </Text>
        </View>
      ) : null}

      {picked && !isSpotlight ? (
        <>
          <Text style={[styles.fieldLabel, { color: colors.smoke, marginTop: 18 }]}>Apt / Unit / Suite (optional)</Text>
          <BrandInput
            value={unit}
            onChangeText={setUnit}
            placeholder="e.g. 4B, PH-2, 1201"
            autoCapitalize="characters"
          />
          <Text style={[styles.unitHint, { color: colors.smoke }]}>
            For condos & apartments — helps pull this unit's beds, baths, and price instead of the building-wide data.
          </Text>
        </>
      ) : null}
    </View>
  )
}

// ── Step 3: property details ──
function StepDetails(props: {
  pinType: PinType
  address: string
  price: string; setPrice: (s: string) => void
  beds: number; setBeds: (n: number) => void
  baths: number; setBaths: (n: number) => void
  sqft: string; setSqft: (s: string) => void
  description: string; setDescription: (s: string) => void
  colors: ReturnType<typeof useColors>
}) {
  const {
    pinType, address, price, setPrice, beds, setBeds, baths, setBaths, sqft, setSqft,
    description, setDescription, colors,
  } = props
  const styles = useThemedStyles(_styles)
  const isSpotlight = pinType === 'spotlight'

  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTitle, { color: colors.ink }]}>Add details</Text>
      {address ? (
        <Text style={[styles.stepSubtitle, { color: colors.smoke }]} numberOfLines={2}>
          {address}
        </Text>
      ) : null}

      <View style={{ height: 14 }} />

      {/* Spotlight has no name input — `name` auto-derives from
          the picked location (first segment of address). */}
      {isSpotlight ? null : (
        <>
          {/* Price — required, prominent */}
          <Text style={[styles.fieldLabel, { color: COLORS.tangerine }]}>
            {pinType === 'sold' ? 'Sold Price' : 'Listing Price'}
          </Text>
          <View style={[styles.priceBox, { borderColor: 'rgba(255,107,61,0.30)' }]}>
            <DollarSign size={22} color={colors.ink} weight="regular" />
            <TextInput
              value={price ? Number(price).toLocaleString() : ''}
              onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.ash}
              keyboardType="number-pad"
              style={[styles.priceInput, { color: colors.ink }]}
            />
          </View>

          {/* Beds / baths / sqft */}
          <View style={styles.bbsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.smoke }]}>Beds</Text>
              <Stepper value={beds} onChange={setBeds} min={0} max={20} colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.smoke }]}>Baths</Text>
              <Stepper value={baths} onChange={setBaths} min={0} max={20} step={0.5} colors={colors} />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.smoke }]}>Sqft</Text>
          <BrandInput
            value={sqft}
            onChangeText={(v) => setSqft(v.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
          />
        </>
      )}

      <View style={{ height: 14 }} />
      <Text style={[styles.fieldLabel, { color: colors.smoke }]}>Description</Text>
      <BrandInput
        value={description}
        onChangeText={setDescription}
        placeholder={isSpotlight ? 'What makes this place special?' : 'Describe this property...'}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
    </View>
  )
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  colors,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  colors: ReturnType<typeof useColors>
}) {
  const styles = useThemedStyles(_styles)
  const inc = () => { if (value + step <= max) { selection(); onChange(value + step) } }
  const dec = () => { if (value - step >= min) { selection(); onChange(value - step) } }
  return (
    <View style={[styles.stepperRow, { backgroundColor: colors.surfaceBg, borderColor: colors.border }]}>
      <Pressable onPress={dec} style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}>
        <Text style={[styles.stepperBtnText, { color: colors.ink }]}>−</Text>
      </Pressable>
      <Text style={[styles.stepperValue, { color: colors.ink }]}>{value}</Text>
      <Pressable onPress={inc} style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}>
        <Text style={[styles.stepperBtnText, { color: colors.ink }]}>+</Text>
      </Pressable>
    </View>
  )
}

const _styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  title: { fontFamily: FONTS.humanistBold, fontSize: 17, color: COLORS.ink },
  stepHint: { fontFamily: FONTS.humanist, fontSize: 11.5, color: COLORS.smoke, marginTop: 1 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.pearl },

  scroll: { paddingBottom: 24 },
  stepWrap: { paddingHorizontal: 20, paddingTop: 18 },
  stepTitle: { fontFamily: FONTS.humanistBold, fontSize: 22, color: COLORS.ink, letterSpacing: -0.3 },
  stepSubtitle: { fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.smoke, marginTop: 4, lineHeight: 18 },

  // Type cards
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight,
    padding: 16, marginBottom: 10,
  },
  typeIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  typeLabel: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink },
  typeDesc: { fontFamily: FONTS.humanist, fontSize: 12, color: COLORS.smoke, marginTop: 2 },

  // Address search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontFamily: FONTS.humanist, fontSize: 14, color: COLORS.ink, paddingVertical: 0 },
  results: {
    marginTop: 10,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  resultText: { flex: 1, fontFamily: FONTS.humanist, fontSize: 13, color: COLORS.ink },

  errorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  errorPillText: { flex: 1, fontFamily: FONTS.humanist, fontSize: 12.5, lineHeight: 17 },
  errorPillRetry: { fontFamily: FONTS.humanistBold, fontSize: 12.5, letterSpacing: -0.1 },

  emptyPill: {
    marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  emptyPillText: { fontFamily: FONTS.humanist, fontSize: 12.5, lineHeight: 17 },

  fieldLabel: {
    fontFamily: FONTS.humanistSemibold, fontSize: 11, color: COLORS.smoke,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 8, marginTop: 4,
  },
  unitHint: {
    fontFamily: FONTS.humanist, fontSize: 11, color: COLORS.smoke,
    marginTop: 6, lineHeight: 15,
  },

  // Details — price box
  priceBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,107,61,0.06)',
    borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,107,61,0.20)',
    paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 14,
  },
  priceInput: { flex: 1, fontFamily: FONTS.humanistBold, fontSize: 26, color: COLORS.ink, paddingVertical: 0 },

  bbsRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.warmWhite,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight,
    paddingHorizontal: 6, paddingVertical: 4,
    marginBottom: 8,
  },
  stepperBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontFamily: FONTS.humanistBold, fontSize: 20, color: COLORS.ink },
  stepperValue: { fontFamily: FONTS.humanistBold, fontSize: 16, color: COLORS.ink },

  // Footer (sticky)
  footer: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: 1,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondaryBtn: {
    flex: 1,
    height: 52, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  secondaryBtnText: { fontFamily: FONTS.humanistBold, fontSize: 15, color: COLORS.ink, letterSpacing: -0.1 },
})
