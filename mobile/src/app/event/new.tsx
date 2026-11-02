import Ionicons from '@expo/vector-icons/Ionicons'
import * as Haptics from 'expo-haptics'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GroupLabel, tapFeedback, ui } from '@/components/ui'
import { api } from '@/lib/api'
import { isoDate } from '@/lib/format'
import { eventTypeColor, eventTypeLabel, palette, useTheme } from '@/lib/theme'
import type { EventType } from '@/lib/types'
import { useFetch } from '@/lib/useFetch'

type Category = { id: number; name: string; color: string | null; member_count: number }
type Panel = 'date' | 'start' | 'end' | 'repeatEnd' | null

const TYPES: Array<{ value: EventType; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'training', icon: 'fitness-outline' },
  { value: 'match', icon: 'trophy-outline' },
  { value: 'meeting', icon: 'chatbubbles-outline' },
  { value: 'event', icon: 'sparkles-outline' },
]

// Monday-first labels mapped to JS getDay() values the API expects
const WEEKDAYS = [
  { label: 'Po', day: 1 },
  { label: 'Út', day: 2 },
  { label: 'St', day: 3 },
  { label: 'Čt', day: 4 },
  { label: 'Pá', day: 5 },
  { label: 'So', day: 6 },
  { label: 'Ne', day: 0 },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const pad = (n: number) => String(n).padStart(2, '0')
const layout = LinearTransition.duration(220)

function parseDate(key: string) {
  return new Date(`${key}T12:00:00`)
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 55)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

function prettyDate(key: string) {
  return parseDate(key).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Same expansion the server does, so the user sees how many events will be created. */
function countRepeats(start: string, end: string, weekdays: number[]) {
  if (!weekdays.length || end < start) return 0
  let count = 0
  const cursor = parseDate(start)
  const last = parseDate(end)
  while (cursor <= last && count <= 260) {
    if (weekdays.includes(cursor.getDay())) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export default function NewEventScreen() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ date?: string }>()
  const initialDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : isoDate(new Date())

  const [type, setType] = useState<EventType>('training')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState('17:00')
  const [endTime, setEndTime] = useState<string | null>('18:30')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [weekdays, setWeekdays] = useState<number[]>(() => [parseDate(initialDate).getDay()])
  const [repeatEnd, setRepeatEnd] = useState(() => {
    const d = parseDate(initialDate)
    d.setMonth(d.getMonth() + 3)
    return isoDate(d)
  })
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [includeUncategorized, setIncludeUncategorized] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null)

  const { data: catData } = useFetch<{ categories: Category[] }>('/api/categories')
  const categories = catData?.categories ?? []

  const repeatCount = useMemo(() => (repeat ? countRepeats(date, repeatEnd, weekdays) : 1), [repeat, date, repeatEnd, weekdays])
  const accentColor = eventTypeColor[type]

  const validation = (() => {
    if (!title.trim()) return 'Zadejte název události.'
    if (!allDay && endTime && endTime <= startTime) return 'Konec musí být později než začátek.'
    if (repeat) {
      if (!weekdays.length) return 'Vyberte alespoň jeden den opakování.'
      if (repeatEnd < date) return 'Konec opakování musí být po prvním termínu.'
      if (repeatCount === 0) return 'Ve zvoleném období nepadne žádný termín.'
      if (repeatCount > 260) return 'Maximálně 260 termínů najednou.'
    }
    return null
  })()

  function togglePanel(next: Panel) {
    tapFeedback()
    setPanel((p) => (p === next ? null : next))
  }

  function pickStart(time: string) {
    // keep the event length when the start moves
    if (endTime) {
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const length = Math.max(eh * 60 + em - (sh * 60 + sm), 15)
      setEndTime(addMinutes(time, length))
    }
    setStartTime(time)
  }

  async function submit() {
    if (validation || saving) {
      if (validation) {
        setError(validation)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      }
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api('/api/events', {
        method: 'POST',
        body: {
          type,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          date,
          startTime: allDay ? '00:00' : startTime,
          endTime: allDay || !endTime ? '' : endTime,
          allDay,
          repeat: repeat ? { enabled: true, weekdays, endDate: repeatEnd } : { enabled: false },
          categoryIds,
          includeUncategorized,
        },
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit událost.')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setSaving(false)
    }
  }

  const audience =
    categoryIds.length === 0 && !includeUncategorized
      ? 'Pozvánka přijde všem členům klubu.'
      : `Pozvánka přijde ${[
          ...categories.filter((c) => categoryIds.includes(c.id)).map((c) => c.name),
          ...(includeUncategorized ? ['členům bez kategorie'] : []),
        ].join(', ')}.`

  return (
    <View style={ui.screen}>
      <Stack.Screen
        options={{
          title: 'Nová událost',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.headerCancel}>Zrušit</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[ui.content, { paddingTop: 8, paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Type */}
          <View style={styles.typeGrid}>
            {TYPES.map((t) => {
              const active = t.value === type
              const color = eventTypeColor[t.value]
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    tapFeedback()
                    setType(t.value)
                  }}
                  style={({ pressed }) => [
                    styles.typeTile,
                    active && { backgroundColor: `${color}22`, borderColor: color },
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.typeIcon, { backgroundColor: active ? color : palette.surface2 }]}>
                    <Ionicons name={t.icon} size={20} color={active ? '#fff' : palette.muted} />
                  </View>
                  <Text style={[styles.typeLabel, active && { color: palette.text }]}>{eventTypeLabel[t.value]}</Text>
                </Pressable>
              )
            })}
          </View>

          {/* Title */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v)
                if (error) setError(null)
              }}
              placeholder={`Název – např. ${type === 'match' ? 'Zápas vs. Sokol' : type === 'meeting' ? 'Schůzka rodičů' : type === 'event' ? 'Letní soustředění' : 'Trénink U15'}`}
              placeholderTextColor={palette.dim}
              style={styles.titleInput}
              maxLength={120}
              returnKeyType="done"
            />
          </View>

          {/* When */}
          <GroupLabel>Kdy</GroupLabel>
          <Animated.View layout={layout} style={styles.card}>
            <FieldRow icon="calendar-outline" label="Datum" value={prettyDate(date)} active={panel === 'date'} onPress={() => togglePanel('date')} />
            {panel === 'date' ? (
              <Expand>
                <DatePicker
                  value={date}
                  onChange={(d) => {
                    setDate(d)
                    if (!repeat) setWeekdays([parseDate(d).getDay()])
                    if (repeatEnd < d) setRepeatEnd(d)
                    setPanel(null)
                  }}
                />
              </Expand>
            ) : null}

            <Divider />
            <View style={styles.fieldRow}>
              <FieldIcon name="sunny-outline" />
              <Text style={styles.fieldLabel}>Celý den</Text>
              <Switch
                value={allDay}
                onValueChange={(v) => {
                  tapFeedback()
                  setAllDay(v)
                  if (v && (panel === 'start' || panel === 'end')) setPanel(null)
                }}
                trackColor={{ true: theme.accent, false: palette.surface2 }}
                thumbColor="#fff"
              />
            </View>

            {!allDay ? (
              <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                <Divider />
                <FieldRow icon="time-outline" label="Začátek" value={startTime} active={panel === 'start'} onPress={() => togglePanel('start')} />
                {panel === 'start' ? (
                  <Expand>
                    <TimePicker value={startTime} onChange={pickStart} />
                  </Expand>
                ) : null}
                <Divider />
                <FieldRow
                  icon="hourglass-outline"
                  label="Konec"
                  value={endTime ?? 'Bez konce'}
                  active={panel === 'end'}
                  onPress={() => togglePanel('end')}
                  invalid={!!endTime && endTime <= startTime}
                />
                {panel === 'end' ? (
                  <Expand>
                    <View style={styles.quickRow}>
                      {[60, 90, 120].map((m) => (
                        <Chip key={m} label={`${m / 60} h`.replace('.5', ',5')} active={endTime === addMinutes(startTime, m)} onPress={() => setEndTime(addMinutes(startTime, m))} />
                      ))}
                      <Chip label="Bez konce" active={endTime === null} onPress={() => setEndTime(null)} />
                    </View>
                    <TimePicker value={endTime ?? addMinutes(startTime, 60)} onChange={setEndTime} />
                  </Expand>
                ) : null}
              </Animated.View>
            ) : null}
          </Animated.View>

          {/* Repeat */}
          <GroupLabel>Opakování</GroupLabel>
          <Animated.View layout={layout} style={styles.card}>
            <View style={styles.fieldRow}>
              <FieldIcon name="repeat-outline" />
              <Text style={styles.fieldLabel}>Opakovat každý týden</Text>
              <Switch
                value={repeat}
                onValueChange={(v) => {
                  tapFeedback()
                  setRepeat(v)
                  if (!v && panel === 'repeatEnd') setPanel(null)
                }}
                trackColor={{ true: theme.accent, false: palette.surface2 }}
                thumbColor="#fff"
              />
            </View>
            {repeat ? (
              <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                <Divider />
                <View style={styles.weekdays}>
                  {WEEKDAYS.map((w) => {
                    const active = weekdays.includes(w.day)
                    return (
                      <Pressable
                        key={w.day}
                        onPress={() => {
                          tapFeedback()
                          setWeekdays((cur) => (active ? cur.filter((d) => d !== w.day) : [...cur, w.day]))
                        }}
                        style={[styles.weekday, active && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                      >
                        <Text style={[styles.weekdayText, active && { color: theme.accentText }]}>{w.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
                <Divider />
                <FieldRow icon="flag-outline" label="Do" value={prettyDate(repeatEnd)} active={panel === 'repeatEnd'} onPress={() => togglePanel('repeatEnd')} />
                {panel === 'repeatEnd' ? (
                  <Expand>
                    <DatePicker
                      value={repeatEnd}
                      min={date}
                      onChange={(d) => {
                        setRepeatEnd(d)
                        setPanel(null)
                      }}
                    />
                  </Expand>
                ) : null}
                <Text style={[styles.hint, repeatCount > 260 && { color: palette.no }]}>
                  {repeatCount === 0 ? 'Ve zvoleném období nepadne žádný termín.' : `Vytvoří se ${repeatCount} ${repeatCount === 1 ? 'termín' : repeatCount < 5 ? 'termíny' : 'termínů'}.`}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>

          {/* Details */}
          <GroupLabel>Detaily</GroupLabel>
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <FieldIcon name="location-outline" />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Místo"
                placeholderTextColor={palette.dim}
                style={styles.inlineInput}
                maxLength={160}
              />
            </View>
            <Divider />
            <View style={[styles.fieldRow, { alignItems: 'flex-start', paddingVertical: 12 }]}>
              <FieldIcon name="document-text-outline" />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Poznámka pro hráče (nepovinné)"
                placeholderTextColor={palette.dim}
                style={[styles.inlineInput, { minHeight: 72, textAlignVertical: 'top', paddingTop: 6 }]}
                multiline
                maxLength={2000}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
              />
            </View>
          </View>

          {/* Audience */}
          <GroupLabel>Kdo je pozván</GroupLabel>
          <View style={[styles.card, { padding: 14 }]}>
            <View style={styles.chips}>
              <Chip
                label="Všichni"
                active={categoryIds.length === 0 && !includeUncategorized}
                onPress={() => {
                  setCategoryIds([])
                  setIncludeUncategorized(false)
                }}
              />
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  dot={c.color ?? undefined}
                  count={c.member_count}
                  active={categoryIds.includes(c.id)}
                  onPress={() => setCategoryIds((cur) => (cur.includes(c.id) ? cur.filter((id) => id !== c.id) : [...cur, c.id]))}
                />
              ))}
              {categories.length > 0 ? (
                <Chip label="Bez kategorie" active={includeUncategorized} onPress={() => setIncludeUncategorized((v) => !v)} />
              ) : null}
            </View>
            <Text style={[styles.hint, { paddingHorizontal: 0, paddingBottom: 0 }]}>{audience}</Text>
          </View>

          {error ? (
            <Animated.View entering={FadeIn.duration(160)} style={styles.error}>
              <Ionicons name="alert-circle" size={18} color={palette.no} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Sticky submit */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={submit}
            disabled={saving}
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: validation ? palette.surface2 : accentColor },
              pressed && !validation && { opacity: 0.88, transform: [{ scale: 0.985 }] },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={validation ? palette.muted : '#fff'} />
                <Text style={[styles.submitText, validation && { color: palette.muted }]}>
                  {repeat && repeatCount > 1 ? `Vytvořit ${repeatCount} událostí` : 'Vytvořit událost'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

/* ── Building blocks ── */

function Expand({ children }: { children: ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.expand}>
      {children}
    </Animated.View>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

function FieldIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme()
  return (
    <View style={[styles.fieldIcon, { backgroundColor: theme.accentSoft }]}>
      <Ionicons name={name} size={17} color={theme.accent} />
    </View>
  )
}

function FieldRow({
  icon,
  label,
  value,
  active,
  invalid,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  active: boolean
  invalid?: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fieldRow, pressed && { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
      <FieldIcon name={icon} />
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.valuePill, active && { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.fieldValue, active && { color: theme.accent }, invalid && { color: palette.no }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Pressable>
  )
}

function Chip({ label, active, onPress, dot, count }: { label: string; active: boolean; onPress: () => void; dot?: string; count?: number }) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={() => {
        tapFeedback()
        onPress()
      }}
      style={[styles.chip, active && { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
    >
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
      <Text style={[styles.chipText, active && { color: theme.accent }]}>{label}</Text>
      {count !== undefined ? <Text style={styles.chipCount}>{count}</Text> : null}
    </Pressable>
  )
}

function DatePicker({ value, onChange, min }: { value: string; onChange: (d: string) => void; min?: string }) {
  const theme = useTheme()
  const [month, setMonth] = useState(() => {
    const d = parseDate(value)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const today = isoDate(new Date())

  const days = useMemo(() => {
    const offset = (month.getDay() + 6) % 7
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array<null>(offset).fill(null), ...Array.from({ length: count }, (_, i) => isoDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))]
  }, [month])

  return (
    <View>
      <View style={styles.dpHeader}>
        <Pressable hitSlop={10} onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
          <Ionicons name="chevron-back" size={20} color={theme.accent} />
        </Pressable>
        <Text style={styles.dpMonth}>{month.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</Text>
        <Pressable hitSlop={10} onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          <Ionicons name="chevron-forward" size={20} color={theme.accent} />
        </Pressable>
      </View>
      <View style={styles.dpGrid}>
        {WEEKDAYS.map((w) => (
          <Text key={w.label} style={styles.dpWeekday}>{w.label}</Text>
        ))}
        {days.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.dpCell} />
          const selected = key === value
          const disabled = !!min && key < min
          return (
            <Pressable
              key={key}
              disabled={disabled}
              onPress={() => {
                tapFeedback()
                onChange(key)
              }}
              style={styles.dpCell}
            >
              <View style={[styles.dpDay, selected && { backgroundColor: theme.accent }, !selected && key === today && { borderWidth: 1, borderColor: theme.accent }]}>
                <Text style={[styles.dpDayText, selected && { color: theme.accentText, fontWeight: '800' }, disabled && { color: palette.dim, opacity: 0.4 }]}>
                  {Number(key.slice(8))}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = value.split(':').map(Number)
  const minute = Math.round(m / 5) * 5
  return (
    <View style={{ gap: 10 }}>
      <TimeStrip label="Hodina" items={HOURS} selected={h} onSelect={(v) => onChange(`${pad(v)}:${pad(minute)}`)} />
      <TimeStrip label="Minuta" items={MINUTES} selected={minute} onSelect={(v) => onChange(`${pad(h)}:${pad(v)}`)} />
    </View>
  )
}

const STRIP_ITEM = 50

function TimeStrip({ label, items, selected, onSelect }: { label: string; items: number[]; selected: number; onSelect: (v: number) => void }) {
  const theme = useTheme()
  const index = Math.max(items.indexOf(selected), 0)
  return (
    <View>
      <Text style={styles.stripLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: Math.max(index * STRIP_ITEM - STRIP_ITEM * 2.5, 0), y: 0 }}
        contentContainerStyle={{ gap: 6, paddingRight: 8 }}
      >
        {items.map((v) => {
          const active = v === selected
          return (
            <Pressable
              key={v}
              onPress={() => {
                tapFeedback()
                onSelect(v)
              }}
              style={[styles.stripItem, active && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.stripText, active && { color: theme.accentText, fontWeight: '800' }]}>{pad(v)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  headerCancel: { color: palette.muted, fontSize: 16 },

  typeGrid: { flexDirection: 'row', gap: 8 },
  typeTile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: palette.muted, fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: palette.surface, borderRadius: 14, overflow: 'hidden' },
  titleInput: { color: palette.text, fontSize: 20, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 16 },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 54 },
  fieldIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { flex: 1, color: palette.text, fontSize: 16, fontWeight: '500' },
  valuePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: palette.surface2, maxWidth: '62%' },
  fieldValue: { color: palette.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  inlineInput: { flex: 1, color: palette.text, fontSize: 16, paddingVertical: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: 58 },
  expand: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  hint: { color: palette.muted, fontSize: 13, paddingHorizontal: 14, paddingVertical: 12 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: palette.text, fontSize: 14, fontWeight: '600' },
  chipCount: { color: palette.dim, fontSize: 12, fontWeight: '600' },

  weekdays: { flexDirection: 'row', gap: 6, padding: 14 },
  weekday: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  weekdayText: { color: palette.muted, fontSize: 14, fontWeight: '700' },

  dpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  dpMonth: { color: palette.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  dpGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dpWeekday: { width: `${100 / 7}%`, textAlign: 'center', color: palette.dim, fontSize: 12, fontWeight: '600', paddingVertical: 6 },
  dpCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dpDay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dpDayText: { color: palette.text, fontSize: 15, fontWeight: '600' },

  stripLabel: { color: palette.dim, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  stripItem: { width: STRIP_ITEM - 6, height: 42, borderRadius: 10, backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' },
  stripText: { color: palette.text, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(214,69,69,0.12)',
  },
  errorText: { flex: 1, color: palette.no, fontSize: 14, fontWeight: '500' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: palette.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  submit: { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
