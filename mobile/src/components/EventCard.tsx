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
        <View style={[s.dateBlock, { backgroundColor: `${color}24` }]}>
          <Text style={[s.weekday, { color }]}>{start.toLocaleDateString('cs-CZ', { weekday: 'short' }).toUpperCase()}</Text>
          <Text style={s.day}>{start.getDate()}</Text>
          <Text style={s.month}>{start.toLocaleDateString('cs-CZ', { month: 'short' }).replace('.', '')}</Text>
        </View>

        <View style={s.body}>
          <View style={[s.typeChip, { backgroundColor: `${color}2E` }]}>
            <Text style={[s.typeText, { color }]}>{eventTypeLabel[event.type] ?? 'Akce'}</Text>
          </View>
          <Text style={s.title} numberOfLines={1}>{event.title}</Text>
          <Text style={s.metaText} numberOfLines={1}>
            {time}
            {event.location ? ` · ${event.location}` : ''}
          </Text>
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
          <ResponseBadge response={event.response} size={26} />
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderRadius: 16, padding: 12, gap: 12, marginBottom: 8 },
  pressed: { opacity: 0.7 },
  dateBlock: { width: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, alignSelf: 'stretch' },
  weekday: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  day: { color: palette.text, fontSize: 22, fontWeight: '700', lineHeight: 26 },
  month: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  body: { flex: 1, gap: 3, minWidth: 0 },
  typeChip: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '700' },
  title: { color: palette.text, fontSize: 16, fontWeight: '600', lineHeight: 21 },
  metaText: { color: palette.muted, fontSize: 13.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: palette.surface2, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { color: palette.muted, fontSize: 12, fontWeight: '500' },
})
