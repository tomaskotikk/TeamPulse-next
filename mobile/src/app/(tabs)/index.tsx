import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, EmptyState, EventCard, Group, Row, SectionHeader, tapFeedback, ui } from '@/components/ui'
import { withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dayLabel, formatTime } from '@/lib/format'
import { palette, useTheme } from '@/lib/theme'
import type { ClubEvent } from '@/lib/types'
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
  const { data, error, refreshing, refresh } = useFetch<Home & { staff?: boolean }>(withChild('/api/mobile/home', childId))

  if (!me) return null
  const isParent = me.user.role === 'rodič'
  const activeChild = me.children.find((c) => c.id === childId)

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />}
    >
      {/* club hero (matches the web mobile header) */}
      <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
        <View style={[styles.heroGlow, { backgroundColor: theme.accentSoft }]} pointerEvents="none" />
        <Animated.View entering={FadeIn.duration(500)}>
          {me.club.logo ? (
            <Image source={{ uri: me.club.logo }} style={styles.clubLogo} contentFit="contain" transition={200} />
          ) : (
            <View style={[styles.clubLogoFallback, { backgroundColor: theme.accent }]}>
              <Text style={[styles.clubLogoText, { color: theme.accentText }]}>{me.club.name.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(100).duration(450)} style={styles.heroName}>
          {me.user.first_name} {me.user.last_name}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160).duration(450)} style={styles.heroClub}>
          {me.club.name.toUpperCase()}
        </Animated.Text>
        <Animated.View entering={FadeInDown.delay(220).duration(450)}>
          <Pressable
            onPress={() => {
              tapFeedback()
              router.push('/profile')
            }}
            style={({ pressed }) => [styles.profilePill, pressed && { opacity: 0.8 }]}
          >
            <Avatar uri={me.user.avatar} first={me.user.first_name} last={me.user.last_name} size={24} />
            <Text style={styles.profilePillText}>Otevřít profil</Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={ui.content}>
        {isParent && me.children.length > 0 && (
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
                  <Avatar uri={c.avatar} first={c.first_name} last={c.last_name} size={28} />
                  <Text style={styles.childName}>{c.first_name}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}

        <SectionHeader
          title="Nejbližší události"
          subtitle={
            data && data.pendingCount > 0
              ? `${data.pendingCount} ${data.pendingCount === 1 ? 'událost čeká' : 'události čekají'} na vaši odpověď`
              : isParent && activeChild
                ? `Program · ${activeChild.first_name}`
                : 'Přehled toho, kde se očekává vaše účast.'
          }
          action={{ label: 'Všechny', onPress: () => router.push('/events') }}
        />

        {error && !data ? (
          <EmptyState icon="cloud-offline-outline" title="Nepodařilo se načíst" text={error} />
        ) : !data ? (
          <View style={styles.skeleton} />
        ) : data.upcoming.length === 0 ? (
          <EmptyState icon="calendar-clear-outline" title="Nic naplánováno" text="Jakmile trenér vypíše trénink nebo zápas, uvidíte ho tady." />
        ) : (
          data.upcoming.map((event, i) => <EventCard key={event.id} event={event} index={i} showStatus={!data.staff} />)
        )}

        <SectionHeader title="Zprávy" />
        <Group>
          <Row
            icon="chatbubbles"
            label="Klubová zeď"
            value={data?.lastMessage ? `${dayLabel(data.lastMessage.created_at) === 'Dnes' ? formatTime(data.lastMessage.created_at) : dayLabel(data.lastMessage.created_at)}` : undefined}
            onPress={() => router.push('/chat')}
            last
          />
        </Group>
        {data?.lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={2}>
            <Text style={styles.lastAuthor}>{data.lastMessage.author}: </Text>
            {data.lastMessage.message}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 26,
    backgroundColor: '#11151B',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -260, alignSelf: 'center', opacity: 0.9 },
  clubLogo: { width: 96, height: 96 },
  clubLogoFallback: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  clubLogoText: { fontSize: 26, fontWeight: '800' },
  heroName: { color: palette.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.3, marginTop: 14, textAlign: 'center' },
  heroClub: { color: palette.muted, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginTop: 6 },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingLeft: 4,
    paddingRight: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(11,13,16,0.6)',
  },
  profilePillText: { color: palette.text, fontSize: 14, fontWeight: '700' },
  children: { gap: 8, paddingTop: 16 },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 14,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  childName: { color: palette.text, fontSize: 15, fontWeight: '600' },
  skeleton: { height: 110, borderRadius: 14, backgroundColor: palette.surface },
  lastMessage: { color: palette.muted, fontSize: 14, marginTop: 10, marginHorizontal: 16, lineHeight: 20 },
  lastAuthor: { color: palette.text, fontWeight: '600' },
})
