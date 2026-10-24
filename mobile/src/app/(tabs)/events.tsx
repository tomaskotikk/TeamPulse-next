import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState } from 'react'
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { EmptyState, EventCard, LargeTitle, SectionHeader, tapFeedback, ui } from '@/components/ui'
import { withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatTime, isoDate } from '@/lib/format'
import { eventTypeColor, palette, useTheme } from '@/lib/theme'
import type { ClubEvent } from '@/lib/types'
import { useFetch } from '@/lib/useFetch'

const WEEKDAYS = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne']

function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7 // Monday-first
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  // drop a trailing week that belongs entirely to the next month
  if (days[35].getMonth() !== month.getMonth()) days.length = 35
  return days
}

export default function EventsScreen() {
  const { childId } = useAuth()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [openDay, setOpenDay] = useState<string | null>(null)

  const days = useMemo(() => monthGrid(month), [month])
  const path = withChild(`/api/mobile/events?from=${isoDate(days[0])}&to=${isoDate(days[days.length - 1])}`, childId)
  const { data, refreshing, refresh, error } = useFetch<{ events: ClubEvent[]; staff?: boolean }>(path)

  const byDay = useMemo(() => {
    const map = new Map<string, ClubEvent[]>()
    for (const e of data?.events ?? []) {
      const key = isoDate(new Date(e.starts_at))
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return map
  }, [data])

  const todayKey = isoDate(new Date())
  const upcoming = (data?.events ?? []).filter((e) => new Date(e.starts_at) >= new Date(new Date().setHours(0, 0, 0, 0))).slice(0, 8)
  const openEvents = openDay ? byDay.get(openDay) ?? [] : []

  function shiftMonth(delta: number) {
    tapFeedback()
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  return (
    <View style={ui.screen}>
      <ScrollView
        contentContainerStyle={[ui.content, { paddingTop: insets.top + 8 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />}
      >
        <LargeTitle>Události</LargeTitle>

        <View style={styles.calendar}>
          <View style={styles.calHeader}>
            <Text style={styles.monthLabel}>
              {month.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.monthNav}>
              <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Předchozí měsíc">
                <Ionicons name="chevron-back" size={22} color={theme.accent} />
              </Pressable>
              <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityLabel="Další měsíc">
                <Ionicons name="chevron-forward" size={22} color={theme.accent} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((d, i) => {
              const key = isoDate(d)
              const list = byDay.get(key) ?? []
              const inMonth = d.getMonth() === month.getMonth()
              const weekend = i % 7 >= 5
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    if (list.length === 0) return
                    tapFeedback()
                    setOpenDay(key)
                  }}
                  style={[styles.cell, weekend && styles.cellWeekend, key === todayKey && { borderColor: theme.accent, borderWidth: 1 }]}
                >
                  <Text style={[styles.dayNum, !inMonth && styles.dayMuted, key === todayKey && { color: theme.accent, fontWeight: '800' }]}>
                    {d.getDate()}
                  </Text>
                  {list.slice(0, 2).map((e) => (
                    <View key={e.id} style={[styles.pill, { backgroundColor: eventTypeColor[e.type] ?? eventTypeColor.event }]}>
                      <Text style={styles.pillText} numberOfLines={1}>{e.all_day ? 'den' : formatTime(e.starts_at)}</Text>
                    </View>
                  ))}
                  {list.length > 2 ? <Text style={styles.more}>+{list.length - 2}</Text> : null}
                </Pressable>
              )
            })}
          </View>
        </View>

        <SectionHeader title="Nadcházející" />
        {error && !data ? (
          <EmptyState icon="cloud-offline-outline" title="Nepodařilo se načíst" text={error} />
        ) : upcoming.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title="Tento měsíc nic dalšího" text="Přepněte na další měsíc šipkou nahoře." />
        ) : (
          upcoming.map((e, i) => <EventCard key={e.id} event={e} index={i} showStatus={!data?.staff} />)
        )}
      </ScrollView>

      <Modal visible={openDay !== null} transparent animationType="none" onRequestClose={() => setOpenDay(null)}>
        <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenDay(null)} accessibilityLabel="Zavřít" />
          <Animated.View entering={SlideInDown.springify().damping(20)} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {openDay ? new Date(`${openDay}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }) : ''}
            </Text>
            <ScrollView style={{ maxHeight: 460 }}>
              {openEvents.map((e) => (
                <EventCard key={e.id} event={e} onOpen={() => setOpenDay(null)} showStatus={!data?.staff} />
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  calendar: { backgroundColor: palette.surface, borderRadius: 14, overflow: 'hidden' },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  monthLabel: { color: palette.text, fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  monthNav: { flexDirection: 'row', gap: 22 },
  weekRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  weekday: { flex: 1, textAlign: 'center', color: palette.dim, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 78,
    padding: 3,
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  cellWeekend: { backgroundColor: 'rgba(255,255,255,0.025)' },
  dayNum: { color: palette.text, fontSize: 14, fontWeight: '600', textAlign: 'right', paddingRight: 4, marginBottom: 2 },
  dayMuted: { color: palette.dim, opacity: 0.6 },
  pill: { borderRadius: 5, paddingVertical: 2, alignItems: 'center' },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  more: { color: palette.muted, fontSize: 10, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: palette.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: 'rgba(243,245,248,0.25)', marginBottom: 12 },
  sheetTitle: { color: palette.muted, fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 14 },
})
