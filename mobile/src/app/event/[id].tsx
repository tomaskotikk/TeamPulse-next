import Ionicons from '@expo/vector-icons/Ionicons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  Easing, FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, EmptyState, Group, GroupLabel, ResponseBadge, Row, Segmented, ui } from '@/components/ui'
import { api, withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatEventRange, formatTime } from '@/lib/format'
import { eventTypeColor, eventTypeLabel, palette, useTheme } from '@/lib/theme'
import type { AttendanceData, ClubEvent, Response } from '@/lib/types'
import { useFetch } from '@/lib/useFetch'

type Detail = {
  event: ClubEvent
  reason: string | null
  started: boolean
  canRespond: boolean
  memberId: number | null
  summary?: { invited: number; yes: number; no: number; pending: number }
  going?: Array<{ id: number; first_name: string; last_name: string; avatar: string | null }>
  organizer?: string | null
}

function countdown(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt).getTime()
  const end = endsAt ? new Date(endsAt).getTime() : start
  const now = Date.now()
  if (now >= start && now <= end) return 'Právě probíhá'
  if (now > end) return 'Proběhlo'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(startsAt)
  day.setHours(0, 0, 0, 0)
  const days = Math.round((day.getTime() - today.getTime()) / 86400000)
  if (days === 0) {
    const hours = Math.round((start - now) / 3600000)
    return hours <= 1 ? 'Začíná za chvíli' : `Dnes · za ${hours} h`
  }
  if (days === 1) return 'Zítra'
  if (days < 5) return `Za ${days} dny`
  return `Za ${days} dní`
}

function duration(startsAt: string, endsAt: string | null) {
  if (!endsAt) return null
  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
  if (minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
}

const RESPONSE_LABEL: Record<'yes' | 'no', string> = { yes: 'Přijdu', no: 'Nepřijdu' }

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { me, childId } = useAuth()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<'info' | 'attendance'>('info')
  const [sheet, setSheet] = useState<'choose' | 'decline' | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const detail = useFetch<Detail>(withChild(`/api/mobile/events/${id}`, childId))
  const attendance = useFetch<AttendanceData>(tab === 'attendance' ? `/api/events/${id}/attendance` : null)

  const d = detail.data
  const isParent = me?.user.role === 'rodič'
  const childName = me?.children.find((c) => c.id === childId)?.first_name

  async function respond(response: Response, why = '') {
    if (!d) return
    setSaving(true)
    setSaveError(null)
    try {
      await api(`/api/events/${d.event.id}/response`, {
        method: 'POST',
        body: { response, reason: why, userId: d.memberId },
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setSheet(null)
      await detail.reload()
      if (tab === 'attendance') await attendance.reload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Odpověď se nepodařilo uložit.')
    } finally {
      setSaving(false)
    }
  }

  if (!d) {
    return (
      <View style={[ui.screen, styles.center]}>
        {detail.error ? <EmptyState icon="alert-circle-outline" title="Událost nelze načíst" text={detail.error} /> : <ActivityIndicator color={palette.muted} />}
      </View>
    )
  }

  const e = d.event
  const response = e.response

  return (
    <View style={ui.screen}>
      <ScrollView
        contentContainerStyle={[ui.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={detail.refreshing}
            onRefresh={() => {
              void detail.refresh()
              if (tab === 'attendance') void attendance.refresh()
            }}
            tintColor={palette.muted}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(350)} style={styles.hero}>
          <View style={styles.heroDate}>
            <Text style={[styles.heroWeekday, { color: eventTypeColor[e.type] ?? eventTypeColor.event }]}>
              {new Date(e.starts_at).toLocaleDateString('cs-CZ', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.heroDay}>{new Date(e.starts_at).getDate()}</Text>
            <Text style={styles.heroMonth}>{new Date(e.starts_at).toLocaleDateString('cs-CZ', { month: 'short' }).replace('.', '')}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.heroChips}>
              <View style={[styles.typeChip, { backgroundColor: `${eventTypeColor[e.type] ?? eventTypeColor.event}26` }]}>
                <View style={[styles.typeDot, { backgroundColor: eventTypeColor[e.type] ?? eventTypeColor.event }]} />
                <Text style={[styles.typeChipText, { color: eventTypeColor[e.type] ?? eventTypeColor.event }]}>{eventTypeLabel[e.type] ?? 'Akce'}</Text>
              </View>
              <Text style={styles.countdown}>{countdown(e.starts_at, e.ends_at)}</Text>
            </View>
            <Text style={styles.heroTitle}>{e.title}</Text>
            <Text style={styles.heroMeta}>
              {e.all_day ? 'Celý den' : `${formatTime(e.starts_at)}${e.ends_at ? ` – ${formatTime(e.ends_at)}` : ''}`}
              {e.location ? ` · ${e.location}` : ''}
            </Text>
          </View>
        </Animated.View>

        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'info', label: 'Informace' },
            { value: 'attendance', label: 'Docházka' },
          ]}
        />

        {tab === 'info' ? (
          <Animated.View entering={FadeIn.duration(250)}>
            {d.canRespond ? (
              <>
                <Pressable
                  onPress={() => !d.started && setSheet('choose')}
                  disabled={d.started}
                  style={({ pressed }) => [styles.myResponse, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.myResponseLabel}>{isParent && childName ? `Účast · ${childName}` : 'Moje účast'}</Text>
                  <View style={styles.myResponseRight}>
                    <Text style={[styles.myResponseValue, { color: d.started ? palette.muted : theme.accent }]}>
                      {response ? RESPONSE_LABEL[response] : d.started ? 'bez odpovědi' : 'vyberte možnost'}
                    </Text>
                    <ResponseBadge response={response} size={24} />
                  </View>
                </Pressable>
                <Text style={styles.note}>
                  {d.started
                    ? 'Událost už začala, odpověď nelze změnit.'
                    : response === 'no' && d.reason
                      ? `Důvod: ${d.reason}`
                      : 'Odpovídat můžete až do začátku události.'}
                </Text>
              </>
            ) : null}

            {d.summary ? (
              <>
                <GroupLabel>Účast</GroupLabel>
                <Pressable onPress={() => setTab('attendance')} style={({ pressed }) => [styles.partCard, pressed && { opacity: 0.8 }]}>
                  <View style={styles.partStats}>
                    <View style={styles.partStat}>
                      <Text style={[styles.partCount, { color: palette.yes }]}>{d.summary.yes}</Text>
                      <Text style={styles.partLabel}>Přijde</Text>
                    </View>
                    <View style={styles.partStat}>
                      <Text style={[styles.partCount, { color: palette.no }]}>{d.summary.no}</Text>
                      <Text style={styles.partLabel}>Nepřijde</Text>
                    </View>
                    <View style={styles.partStat}>
                      <Text style={styles.partCount}>{d.summary.pending}</Text>
                      <Text style={styles.partLabel}>Čeká</Text>
                    </View>
                  </View>
                  {d.summary.invited > 0 ? (
                    <View style={styles.partBar}>
                      <View style={{ flex: d.summary.yes, backgroundColor: palette.yes }} />
                      <View style={{ flex: d.summary.no, backgroundColor: palette.no }} />
                      <View style={{ flex: d.summary.pending, backgroundColor: palette.surface2 }} />
                    </View>
                  ) : null}
                  <View style={styles.partFooter}>
                    <View style={styles.avatars}>
                      {(d.going ?? []).slice(0, 5).map((u, i) => (
                        <View key={u.id} style={[styles.avatarRing, { marginLeft: i === 0 ? 0 : -10 }]}>
                          <Avatar uri={u.avatar} first={u.first_name} last={u.last_name} size={28} />
                        </View>
                      ))}
                      {d.summary.yes > 5 ? <Text style={styles.moreGoing}>+{d.summary.yes - 5}</Text> : null}
                      {d.summary.yes === 0 ? <Text style={styles.moreGoing}>Zatím nikdo nepotvrdil</Text> : null}
                    </View>
                    <Text style={styles.partLink}>Seznam ›</Text>
                  </View>
                </Pressable>
              </>
            ) : null}

            <GroupLabel>Podrobnosti</GroupLabel>
            <Group>
              <Row icon="calendar-outline" label="Datum" value={new Date(e.starts_at).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Row
                icon="time-outline"
                label="Čas"
                value={e.all_day ? 'celý den' : `${formatTime(e.starts_at)}${e.ends_at ? ` – ${formatTime(e.ends_at)}` : ''}`}
              />
              {duration(e.starts_at, e.ends_at) ? <Row icon="hourglass-outline" label="Délka" value={duration(e.starts_at, e.ends_at)!} /> : null}
              {e.location ? (
                <Row
                  icon="location-outline"
                  label={e.location}
                  value="Mapa"
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location!)}`)}
                />
              ) : null}
              {e.categories.length > 0 ? (
                <Row icon="people-outline" label="Kategorie" value={e.categories.map((c) => c.name).join(', ')} />
              ) : null}
              <Row icon="person-outline" label="Vypsal" value={d.organizer ?? '–'} last />
            </Group>

            {e.description ? (
              <>
                <GroupLabel>Popis</GroupLabel>
                <Group style={{ padding: 16 }}>
                  <Text style={styles.description}>{e.description}</Text>
                </Group>
              </>
            ) : null}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(250)} style={{ marginTop: 16 }}>
            {!attendance.data ? (
              attendance.error ? (
                <EmptyState icon="alert-circle-outline" title="Docházku nelze načíst" text={attendance.error} />
              ) : (
                <ActivityIndicator color={palette.muted} style={{ marginTop: 24 }} />
              )
            ) : (
              <>
                <View style={styles.summary}>
                  {[
                    ['Pozvaní', attendance.data.summary.invited, palette.text],
                    ['Přijde', attendance.data.summary.yes, palette.yes],
                    ['Nepřijde', attendance.data.summary.no, palette.no],
                    ['Čeká', attendance.data.summary.pending, palette.muted],
                  ].map(([label, count, color]) => (
                    <View key={label as string} style={styles.summaryItem}>
                      <Text style={[styles.summaryCount, { color: color as string }]}>{count as number}</Text>
                      <Text style={styles.summaryLabel}>{label as string}</Text>
                    </View>
                  ))}
                </View>
                <Group style={{ marginTop: 12 }}>
                  {attendance.data.rows.map((r, i) => (
                    <View key={r.user.id} style={[styles.person, i < attendance.data!.rows.length - 1 && styles.personDivider]}>
                      <Avatar first={r.user.first_name} last={r.user.last_name} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personName} numberOfLines={1}>{r.user.last_name} {r.user.first_name}</Text>
                        {r.reason ? <Text style={styles.personSub} numberOfLines={1}>{r.reason}</Text> : null}
                      </View>
                      <ResponseBadge response={r.response} size={24} />
                    </View>
                  ))}
                </Group>
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={sheet !== null} transparent animationType="none" onRequestClose={() => { if (!saving) setSheet(null) }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && setSheet(null)} accessibilityLabel="Zavřít" />
            <Animated.View entering={SlideInDown.duration(240).easing(Easing.out(Easing.cubic))} style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle} numberOfLines={2}>{e.title}</Text>
              <Text style={styles.sheetSub}>{formatEventRange(e.starts_at, e.ends_at, e.all_day)}</Text>

              {sheet === 'decline' ? (
                <View style={{ gap: 10 }}>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Důvod (nepovinné) – např. nemoc, škola"
                    placeholderTextColor={palette.dim}
                    style={styles.reason}
                    multiline
                    maxLength={300}
                    autoFocus
                  />
                  <Pressable style={[styles.sheetBtn, { backgroundColor: palette.no }]} onPress={() => respond('no', reason)} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Potvrdit, že nepřijdu</Text>}
                  </Pressable>
                  <Pressable style={styles.ghost} onPress={() => setSheet('choose')} disabled={saving}>
                    <Text style={styles.ghostText}>Zpět</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Pressable style={[styles.sheetBtn, { backgroundColor: palette.yes }]} onPress={() => respond('yes')} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.sheetBtnText}>Přijdu</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.sheetBtn, { backgroundColor: palette.no }]}
                    onPress={() => {
                      setReason(d.reason ?? '')
                      setSheet('decline')
                    }}
                    disabled={saving}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.sheetBtnText}>Nepřijdu</Text>
                  </Pressable>
                  {response ? (
                    <Pressable style={styles.ghost} onPress={() => respond(null)} disabled={saving}>
                      <Text style={styles.ghostText}>Zrušit odpověď</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
              {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { flexDirection: 'row', gap: 16, paddingTop: 6, paddingBottom: 20, alignItems: 'flex-start' },
  heroDate: { width: 70, paddingVertical: 10, borderRadius: 16, backgroundColor: palette.surface, alignItems: 'center' },
  heroWeekday: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  heroDay: { color: palette.text, fontSize: 32, fontWeight: '700', lineHeight: 38 },
  heroMonth: { color: palette.muted, fontSize: 13, fontWeight: '500' },
  heroChips: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, height: 24, borderRadius: 12 },
  typeDot: { width: 7, height: 7, borderRadius: 4 },
  typeChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  countdown: { color: palette.muted, fontSize: 13, fontWeight: '600' },
  partCard: { backgroundColor: palette.surface, borderRadius: 16, padding: 16, gap: 14 },
  partStats: { flexDirection: 'row' },
  partStat: { flex: 1, alignItems: 'center', gap: 2 },
  partCount: { color: palette.text, fontSize: 26, fontWeight: '700' },
  partLabel: { color: palette.muted, fontSize: 13, fontWeight: '500' },
  partBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: palette.surface2 },
  partFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: { borderWidth: 2, borderColor: palette.surface, borderRadius: 16 },
  moreGoing: { color: palette.muted, fontSize: 13, fontWeight: '500', marginLeft: 8 },
  partLink: { color: palette.muted, fontSize: 14, fontWeight: '600' },
  heroType: { color: palette.dim, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { color: palette.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.4, lineHeight: 31 },
  heroMeta: { color: palette.muted, fontSize: 15, lineHeight: 21 },
  myResponse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: 14,
    minHeight: 58,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  myResponseLabel: { color: palette.text, fontSize: 16, fontWeight: '600' },
  myResponseRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  myResponseValue: { fontSize: 16, fontWeight: '600' },
  note: { color: palette.dim, fontSize: 13, lineHeight: 19, marginTop: 8, marginHorizontal: 16 },
  description: { color: palette.text, fontSize: 15, lineHeight: 22 },
  summary: { flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 14, paddingVertical: 12 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryCount: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  personDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  personName: { color: palette.text, fontSize: 16, fontWeight: '500' },
  personSub: { color: palette.dim, fontSize: 13, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: palette.surface2, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(243,245,248,0.25)', marginBottom: 14 },
  sheetTitle: { color: palette.text, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  sheetSub: { color: palette.muted, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  sheetBtn: { height: 54, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ghost: { height: 46, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: palette.muted, fontSize: 16, fontWeight: '500' },
  reason: {
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
    fontSize: 16,
    padding: 14,
    textAlignVertical: 'top',
  },
  saveError: { color: palette.no, fontSize: 14, textAlign: 'center', marginTop: 10 },
})
