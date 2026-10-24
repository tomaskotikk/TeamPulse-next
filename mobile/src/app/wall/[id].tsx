import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Conversation, { type ConversationMessage } from '@/components/Conversation'
import { Avatar, EmptyState, EventCard, GroupLabel, Segmented, ui } from '@/components/ui'
import { api, withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { palette } from '@/lib/theme'
import type { ClubEvent } from '@/lib/types'
import { useFetch } from '@/lib/useFetch'

type Wall = {
  category: { id: number; name: string; color: string; birth_year_from: number | null; birth_year_to: number | null }
  staff: boolean
  members: Array<{ id: number; first_name: string; last_name: string; role: string; avatar: string | null }>
  events: ClubEvent[]
}

const ROLE_ORDER: Record<string, number> = { 'trenér': 0, 'manažer': 1, 'hráč': 2, 'rodič': 3 }

function years(c: Wall['category']) {
  if (c.birth_year_from && c.birth_year_to) return `ročníky ${c.birth_year_from}–${c.birth_year_to}`
  if (c.birth_year_from) return `od ročníku ${c.birth_year_from}`
  if (c.birth_year_to) return `do ročníku ${c.birth_year_to}`
  return 'bez omezení ročníků'
}

export default function CategoryWallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { me, childId } = useAuth()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<'wall' | 'calendar' | 'members'>('wall')
  const { data, error } = useFetch<Wall>(withChild(`/api/mobile/walls/${id}`, childId))

  if (!me) return null

  if (!data) {
    return (
      <View style={[ui.screen, styles.center]}>
        <Stack.Screen options={{ title: '' }} />
        {error ? <EmptyState icon="alert-circle-outline" title="Zeď nelze otevřít" text={error} /> : <ActivityIndicator color={palette.muted} />}
      </View>
    )
  }

  const { category } = data
  const members = [...data.members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))

  return (
    <View style={[ui.screen, { paddingBottom: tab === 'wall' ? insets.bottom : 0 }]}>
      <Stack.Screen options={{ title: category.name }} />

      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: `${category.color}2E` }]}>
          <Ionicons name="people" size={24} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{category.name}</Text>
          <Text style={styles.meta}>
            {years(category)} · {data.members.length} členů
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'wall', label: 'Zeď' },
            { value: 'calendar', label: 'Kalendář' },
            { value: 'members', label: 'Členové' },
          ]}
        />
      </View>

      {tab === 'wall' ? (
        <Conversation
          myId={me.user.id}
          emptyText={`Napište první zprávu kategorii ${category.name}.`}
          keyboardOffset={insets.top + 44}
          realtime={{ channel: `category-wall-${category.id}`, table: 'category_posts', filter: `category_id=eq.${category.id}` }}
          load={async () => {
            const res = await api<{ posts: ConversationMessage[] }>(withChild(`/api/mobile/walls/${category.id}/posts`, childId))
            return res.posts
          }}
          send={async (text) => {
            await api(withChild(`/api/mobile/walls/${category.id}/posts`, childId), { method: 'POST', body: { message: text } })
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={[ui.content, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeIn.duration(250)}>
            {tab === 'calendar' ? (
              <>
                <GroupLabel>Nejbližší události</GroupLabel>
                {data.events.length === 0 ? (
                  <EmptyState icon="calendar-clear-outline" title="Nic naplánováno" text="Pro tuto kategorii zatím není vypsaný trénink ani zápas." />
                ) : (
                  data.events.map((e, i) => <EventCard key={e.id} event={e} index={i} showStatus={!data.staff} />)
                )}
              </>
            ) : (
              <>
                <GroupLabel>{`Členové (${members.length})`}</GroupLabel>
                <View style={styles.group}>
                  {members.map((m, i) => (
                    <View key={m.id} style={[styles.member, i < members.length - 1 && styles.divider]}>
                      <Avatar uri={m.avatar} first={m.first_name} last={m.last_name} size={38} />
                      <Text style={styles.memberName} numberOfLines={1}>{m.last_name} {m.first_name}</Text>
                      <Text style={styles.memberRole}>{m.role}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 },
  badge: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { color: palette.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  meta: { color: palette.muted, fontSize: 14, marginTop: 2 },
  tabs: { paddingHorizontal: 16, paddingBottom: 6 },
  group: { backgroundColor: palette.surface, borderRadius: 14, overflow: 'hidden' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  memberName: { flex: 1, color: palette.text, fontSize: 16, fontWeight: '500' },
  memberRole: { color: palette.dim, fontSize: 14 },
})
