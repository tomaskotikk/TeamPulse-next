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

type Detail = { event: ClubEvent; reason: string | null; started: boolean; canRespond: boolean; memberId: number | null }

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
        <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
          <View style={[styles.heroStripe, { backgroundColor: eventTypeColor[e.type] ?? eventTypeColor.event }]} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.heroType}>{(eventTypeLabel[e.type] ?? 'Akce').toUpperCase()}</Text>
            <Text style={styles.heroTitle}>{e.title}</Text>
            <Text style={styles.heroMeta}>
              {formatEventRange(e.starts_at, e.ends_at, e.all_day)}
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

            <GroupLabel>Základní údaje</GroupLabel>
            <Group>
              <Row icon="calendar-outline" label="Datum" value={new Date(e.starts_at).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })} />
              <Row
                icon="time-outline"
                label="Čas"
                value={e.all_day ? 'celý den' : `${formatTime(e.starts_at)}${e.ends_at ? ` – ${formatTime(e.ends_at)}` : ''}`}
                last={!e.location && e.categories.length === 0}
              />
              {e.location ? (
                <Row
                  icon="location-outline"
                  label={e.location}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location!)}`)}
                  last={e.categories.length === 0}
                />
              ) : null}
              {e.categories.length > 0 ? (
                <Row icon="pricetag-outline" label="Kategorie" value={e.categories.map((c) => c.name).join(', ')} last />
              ) : null}
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
  hero: { flexDirection: 'row', gap: 14, paddingTop: 4, paddingBottom: 20 },
  heroStripe: { width: 5, borderRadius: 3 },
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
