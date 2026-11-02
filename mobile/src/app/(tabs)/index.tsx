import * as Haptics from 'expo-haptics'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, EmptyState, EventCard, Group, Row, SectionHeader, tapFeedback, ui } from '@/components/ui'
import { api, withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { countdownLabel, dayLabel, formatTime } from '@/lib/format'
import { eventTypeColor, eventTypeLabel, palette, useTheme } from '@/lib/theme'
import type { ClubEvent, Response } from '@/lib/types'
import { useFetch } from '@/lib/useFetch'

type Home = {
  upcoming: ClubEvent[]
  pendingCount: number
  lastMessage: { id: number; message: string; created_at: string; author: string } | null
}

export default function HomeScreen() {
  const { me, childId, setChildId } = useAuth()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { data, error, refreshing, refresh, reload } = useFetch<Home & { staff?: boolean }>(withChild('/api/mobile/home', childId))

  if (!me) return null
  const isParent = me.user.role === 'rodič'
  const activeChild = me.children.find((c) => c.id === childId)
  const [next, ...rest] = data?.upcoming ?? []
  const subtitle = isParent && activeChild ? `${me.club.name} · ${activeChild.first_name}` : me.club.name

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={[ui.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />}
    >
      {/* club header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        {me.club.logo ? (
          <Image source={{ uri: me.club.logo }} style={styles.clubLogo} contentFit="contain" transition={200} />
        ) : (
          <View style={[styles.clubLogo, styles.clubLogoFallback, { backgroundColor: theme.accent }]}>
            <Text style={[styles.clubLogoText, { color: theme.accentText }]}>{me.club.name.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.hello} numberOfLines={1}>Ahoj, {me.user.first_name}</Text>
          <Text style={styles.clubName} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={() => {
            tapFeedback()
            router.push('/profile')
          }}
          hitSlop={8}
          accessibilityLabel="Otevřít profil"
        >
          <Avatar uri={me.user.avatar} first={me.user.first_name} last={me.user.last_name} size={38} />
        </Pressable>
      </Animated.View>

      {isParent && me.children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.children}>
          {me.children.map((c) => {
            const active = c.id === childId
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  tapFeedback()
                  setChildId(c.id)
                }}
                style={[styles.childChip, active && { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
              >
                <Avatar uri={c.avatar} first={c.first_name} last={c.last_name} size={26} />
                <Text style={styles.childName}>{c.first_name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {error && !data ? (
        <View style={{ marginTop: 16 }}>
          <EmptyState icon="cloud-offline-outline" title="Nepodařilo se načíst" text={error} />
        </View>
      ) : !data ? (
        <View style={styles.skeleton} />
      ) : !next ? (
        <View style={{ marginTop: 16 }}>
          <EmptyState icon="calendar-clear-outline" title="Nic naplánováno" text="Jakmile trenér vypíše trénink nebo zápas, uvidíte ho tady." />
        </View>
      ) : (
        <NextEvent
          key={`${next.id}-${childId ?? ''}`}
          event={next}
          canRespond={!data.staff}
          memberId={childId ?? me.user.id}
          childName={isParent ? activeChild?.first_name : undefined}
          onChanged={reload}
        />
      )}

      {rest.length > 0 ? (
        <>
          <SectionHeader
            title="Nejbližší události"
            subtitle={
              data && data.pendingCount > 0
                ? `${data.pendingCount} ${data.pendingCount === 1 ? 'událost čeká' : 'události čekají'} na odpověď`
                : undefined
            }
            action={{ label: 'Všechny', onPress: () => router.push('/events') }}
          />
          {rest.map((event, i) => <EventCard key={event.id} event={event} index={i} showStatus={!data?.staff} />)}
        </>
      ) : null}

      <SectionHeader title="Zprávy" />
      <Group>
        <Row
          icon="chatbubbles"
          label="Klubová zeď"
          value={data?.lastMessage ? (dayLabel(data.lastMessage.created_at) === 'Dnes' ? formatTime(data.lastMessage.created_at) : dayLabel(data.lastMessage.created_at)) : undefined}
          onPress={() => router.push('/wall/club')}
          last
        />
      </Group>
      {data?.lastMessage ? (
        <Text style={styles.lastMessage} numberOfLines={2}>
          <Text style={styles.lastAuthor}>{data.lastMessage.author}: </Text>
          {data.lastMessage.message}
        </Text>
      ) : null}
    </ScrollView>
  )
}

/** Featured card for the very next event with one-tap RSVP. */
function NextEvent({
  event,
  canRespond,
  memberId,
  childName,
  onChanged,
}: {
  event: ClubEvent
  canRespond: boolean
  memberId: number
  childName?: string
  onChanged: () => Promise<void>
}) {
  const [response, setResponse] = useState<Response>(event.response)
  const [saving, setSaving] = useState<Response | 'none' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const color = eventTypeColor[event.type] ?? eventTypeColor.event
  const started = new Date(event.starts_at).getTime() <= Date.now()
  const start = new Date(event.starts_at)
  const isToday = start.toDateString() === new Date().toDateString()
  const day = isToday ? 'Dnes' : start.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' })
  const time = event.all_day ? 'celý den' : `${formatTime(event.starts_at)}${event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}`

  async function respond(next: Response) {
    if (saving) return
    const value = next === response ? null : next // tapping the active answer clears it
    tapFeedback()
    setSaving(value ?? 'none')
    setError(null)
    const previous = response
    setResponse(value)
    try {
      await api(`/api/events/${event.id}/response`, { method: 'POST', body: { response: value, reason: '', userId: memberId } })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      void onChanged()
    } catch (err) {
      setResponse(previous)
      setError(err instanceof Error ? err.message : 'Odpověď se nepodařilo uložit.')
    } finally {
      setSaving(null)
    }
  }

  const state = error
    ? error
    : response === 'yes'
      ? '✓ Potvrzeno · trenér to vidí hned'
      : response === 'no'
        ? 'Omluveno · trenér dostal vaši odpověď'
        : started
          ? 'Událost už začala'
          : childName
            ? `Zatím jste za ${childName} neodpověděli`
            : 'Zatím jste neodpověděli'

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(380)}>
      <Pressable
        onPress={() => router.push({ pathname: '/event/[id]', params: { id: String(event.id) } })}
        style={({ pressed }) => [styles.next, { borderColor: `${color}40` }, pressed && { opacity: 0.92 }]}
      >
        <View style={[styles.nextTint, { backgroundColor: `${color}14` }]} pointerEvents="none" />
        <View style={styles.nextTop}>
          <View style={[styles.typeChip, { backgroundColor: `${color}2E` }]}>
            <Text style={[styles.typeText, { color }]}>{eventTypeLabel[event.type] ?? 'Akce'}</Text>
          </View>
          <Text style={styles.countdown}>{countdownLabel(event.starts_at, event.ends_at)}</Text>
        </View>
        <Text style={styles.nextTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.nextMeta}>{day.charAt(0).toUpperCase() + day.slice(1)} · {time}</Text>
        {event.location ? <Text style={styles.nextMeta} numberOfLines={1}>{event.location}</Text> : null}

        {canRespond && !started ? (
          <View style={styles.rsvp}>
            {(['yes', 'no'] as const).map((r) => {
              const active = response === r
              const bg = r === 'yes' ? palette.yes : palette.no
              return (
                <Pressable
                  key={r}
                  onPress={() => respond(r)}
                  disabled={saving !== null}
                  style={({ pressed }) => [styles.rsvpBtn, active && { backgroundColor: bg, borderColor: bg }, pressed && { transform: [{ scale: 0.97 }] }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {saving === r ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rsvpText}>{r === 'yes' ? 'Přijdu' : 'Nepřijdu'}</Text>}
                </Pressable>
              )
            })}
          </View>
        ) : null}
        {canRespond ? (
          <Text style={[styles.state, response === 'yes' && { color: '#3EC27B' }, (response === 'no' || error) && { color: '#EF6A6A' }]}>{state}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, marginBottom: 14 },
  clubLogo: { width: 50, height: 50, borderRadius: 15 },
  clubLogoFallback: { alignItems: 'center', justifyContent: 'center' },
  clubLogoText: { fontSize: 18, fontWeight: '800' },
  hello: { color: palette.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  clubName: { color: palette.muted, fontSize: 14, marginTop: 1 },
  children: { gap: 8, paddingBottom: 14 },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  childName: { color: palette.text, fontSize: 15, fontWeight: '600' },
  skeleton: { height: 210, borderRadius: 20, backgroundColor: palette.surface },

  next: { backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, padding: 16, overflow: 'hidden' },
  nextTint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeChip: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  typeText: { fontSize: 12, fontWeight: '700' },
  countdown: { color: palette.muted, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  nextTitle: { color: palette.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  nextMeta: { color: palette.muted, fontSize: 15, lineHeight: 21 },
  rsvp: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rsvpBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpText: { color: palette.text, fontSize: 16, fontWeight: '700' },
  state: { color: palette.dim, fontSize: 13, textAlign: 'center', marginTop: 10 },

  lastMessage: { color: palette.muted, fontSize: 14, marginTop: 10, marginHorizontal: 16, lineHeight: 20 },
  lastAuthor: { color: palette.text, fontWeight: '600' },
})
