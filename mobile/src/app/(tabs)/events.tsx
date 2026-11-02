import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
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
  const todayKey = isoDate(new Date())
  const [selected, setSelected] = useState<string>(todayKey)

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

  const selectedEvents = byDay.get(selected) ?? []
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })
  const upcoming = (data?.events ?? [])
    .filter((e) => new Date(e.starts_at) >= new Date(new Date().setHours(0, 0, 0, 0)) && isoDate(new Date(e.starts_at)) !== selected)
    .slice(0, 8)

  function shiftMonth(delta: number) {
    tapFeedback()
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1)
    // keep the selection inside the visible month: today when we return to it, otherwise the 1st
    const now = new Date()
    setMonth(next)
    setSelected(next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth() ? todayKey : isoDate(next))
  }

  return (
    <View style={ui.screen}>
      <ScrollView
        contentContainerStyle={[ui.content, { paddingTop: insets.top + 8, paddingBottom: 110 }]}
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
              const isSelected = key === selected
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    tapFeedback()
                    setSelected(key)
                  }}
                  style={[styles.cell, weekend && styles.cellWeekend, isSelected && { backgroundColor: theme.accentSoft }]}
                  accessibilityLabel={d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
                  accessibilityState={{ selected: isSelected }}
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

        {/* selected day */}
        <Animated.View key={selected} entering={FadeIn.duration(220)}>
          <Text style={styles.dayLabel}>{selectedLabel.charAt(0).toUpperCase() + selectedLabel.slice(1)}</Text>
          {selectedEvents.length > 0 ? (
            selectedEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} showStatus={!data?.staff} />)
          ) : (
            <Text style={styles.dayEmpty}>V tento den nic není.</Text>
          )}
          {data?.staff ? (
            <Pressable
              onPress={() => router.push({ pathname: '/event/new', params: { date: selected } })}
              style={({ pressed }) => [styles.dayAdd, { backgroundColor: theme.accentSoft }, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="add" size={20} color={theme.accent} />
              <Text style={[styles.dayAddText, { color: theme.accent }]}>Přidat událost na tento den</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <SectionHeader title="Nadcházející" />
        {error && !data ? (
          <EmptyState icon="cloud-offline-outline" title="Nepodařilo se načíst" text={error} />
        ) : upcoming.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title="Tento měsíc nic dalšího" text="Přepněte na další měsíc šipkou nahoře." />
        ) : (
          upcoming.map((e, i) => <EventCard key={e.id} event={e} index={i} showStatus={!data?.staff} />)
        )}
      </ScrollView>

      {data?.staff ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.fabWrap}>
          <Pressable
            onPress={() => {
              tapFeedback()
              router.push('/event/new')
            }}
            style={({ pressed }) => [styles.fab, { backgroundColor: theme.accent }, pressed && { transform: [{ scale: 0.94 }] }]}
            accessibilityLabel="Nová událost"
          >
            <Ionicons name="add" size={30} color={theme.accentText} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  calendar: { backgroundColor: palette.surface, borderRadius: 16, overflow: 'hidden' },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  monthLabel: { color: palette.text, fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  monthNav: { flexDirection: 'row', gap: 22 },
  weekRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  weekday: { flex: 1, textAlign: 'center', color: palette.dim, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 72,
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
  dayLabel: { color: palette.muted, fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 10, marginHorizontal: 4 },
  dayEmpty: { color: palette.dim, fontSize: 15, textAlign: 'center', paddingVertical: 18, backgroundColor: palette.surface, borderRadius: 16 },
  dayAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14, marginTop: 8 },
  dayAddText: { fontSize: 15, fontWeight: '700' },
  fabWrap: { position: 'absolute', right: 20, bottom: 16 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
})
