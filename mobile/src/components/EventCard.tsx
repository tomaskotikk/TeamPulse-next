import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { ResponseBadge, tapFeedback } from '@/components/ui'
import { withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { eventTypeColor, eventTypeLabel, palette } from '@/lib/theme'
import type { ClubEvent } from '@/lib/types'
import { primeCache } from '@/lib/useFetch'

const hm = (iso: string) => new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

type Props = { event: ClubEvent; index?: number; onOpen?: () => void; showStatus?: boolean; animate?: boolean }

/** Event card led by a calendar date block. */
export default function EventCard({ event, index = 0, onOpen, showStatus = true, animate = true }: Props) {
  const { me, childId } = useAuth()
  const start = new Date(event.starts_at)
  const time = event.all_day ? 'Celý den' : `${hm(event.starts_at)}${event.ends_at ? ` – ${hm(event.ends_at)}` : ''}`
  const color = eventTypeColor[event.type] ?? eventTypeColor.event
  const extraCats = event.categories.length - 2

  return (
    <Animated.View entering={animate ? FadeInDown.delay(Math.min(index, 5) * 40).duration(260) : undefined}>
      <Pressable
        onPress={() => {
          tapFeedback()
          onOpen?.()
          // open the detail instantly with what the card already knows; the screen refreshes it
          primeCache(withChild(`/api/mobile/events/${event.id}`, childId), {
            event,
            reason: null,
            started: start.getTime() <= Date.now(),
            canRespond: showStatus,
            memberId: childId ?? me?.user.id ?? null,
          })
          router.push({ pathname: '/event/[id]', params: { id: String(event.id) } })
        }}
        style={({ pressed }) => [s.card, pressed && s.pressed]}
        accessibilityRole="button"
      >
        <View style={s.dateBlock}>
          <Text style={[s.weekday, { color }]}>{start.toLocaleDateString('cs-CZ', { weekday: 'short' }).toUpperCase()}</Text>
          <Text style={s.day}>{start.getDate()}</Text>
          <Text style={s.month}>{start.toLocaleDateString('cs-CZ', { month: 'short' }).replace('.', '')}</Text>
        </View>

        <View style={s.body}>
          <View style={s.typeLine}>
            <View style={[s.typeDot, { backgroundColor: color }]} />
            <Text style={s.typeText}>{eventTypeLabel[event.type] ?? 'Akce'}</Text>
          </View>
          <Text style={s.title} numberOfLines={2}>{event.title}</Text>
          <View style={s.meta}>
            <Ionicons name="time-outline" size={14} color={palette.dim} />
            <Text style={s.metaText}>{time}</Text>
          </View>
          {event.location ? (
            <View style={s.meta}>
              <Ionicons name="location-outline" size={14} color={palette.dim} />
              <Text style={s.metaText} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
          {event.categories.length > 0 ? (
            <View style={s.tags}>
              {event.categories.slice(0, 2).map((c) => (
                <View key={c.name} style={s.tag}>
                  <View style={[s.tagDot, { backgroundColor: c.color }]} />
                  <Text style={s.tagText}>{c.name}</Text>
                </View>
              ))}
              {extraCats > 0 ? (
                <View style={s.tag}>
                  <Text style={s.tagText}>+{extraCats}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {showStatus ? (
          <View style={s.status}>
            <ResponseBadge response={event.response} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 16, padding: 14, gap: 14, marginBottom: 10 },
  pressed: { opacity: 0.7 },
  dateBlock: {
    width: 54,
    borderRadius: 12,
    backgroundColor: palette.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  weekday: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  day: { color: palette.text, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  month: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  body: { flex: 1, gap: 3 },
  typeLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeDot: { width: 7, height: 7, borderRadius: 4 },
  typeText: { color: palette.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  title: { color: palette.text, fontSize: 17, fontWeight: '600', lineHeight: 22, marginBottom: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, color: palette.muted, fontSize: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  status: { justifyContent: 'center', paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: palette.border },
})
