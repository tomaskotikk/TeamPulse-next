import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { EmptyState, GroupLabel, LargeTitle, tapFeedback, ui } from '@/components/ui'
import { withChild } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dayLabel, formatTime } from '@/lib/format'
import { palette, useTheme } from '@/lib/theme'
import { useFetch } from '@/lib/useFetch'

type Last = { message: string; created_at: string; author: string } | null
type Walls = {
  club: { name: string; last: Last }
  categories: Array<{ id: number; name: string; color: string; birth_year_from: number | null; birth_year_to: number | null; memberCount: number; last: Last }>
}

function when(iso: string) {
  return dayLabel(iso) === 'Dnes' ? formatTime(iso) : new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

function WallRow({ icon, color, title, subtitle, last, onPress, isLast }: {
  icon: 'people' | 'shield'
  color: string
  title: string
  subtitle: string
  last: Last
  onPress: () => void
  isLast: boolean
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
      <View style={[styles.icon, { backgroundColor: `${color}2E` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={[styles.rowMain, !isLast && styles.divider]}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleLine}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {last ? <Text style={styles.when}>{when(last.created_at)}</Text> : null}
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {last ? (
              <>
                <Text style={styles.previewAuthor}>{last.author}: </Text>
                {last.message}
              </>
            ) : (
              subtitle
            )}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.dim} />
      </View>
    </Pressable>
  )
}

export default function WallsScreen() {
  const { childId } = useAuth()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { data, error, refreshing, refresh } = useFetch<Walls>(withChild('/api/mobile/walls', childId))

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={[ui.content, { paddingTop: insets.top + 8 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.muted} />}
    >
      <LargeTitle>Zdi</LargeTitle>

      {error && !data ? (
        <EmptyState icon="cloud-offline-outline" title="Nepodařilo se načíst" text={error} />
      ) : !data ? null : (
        <Animated.View entering={FadeInDown.duration(350)}>
          <GroupLabel>Klub</GroupLabel>
          <View style={styles.group}>
            <WallRow
              icon="shield"
              color={theme.accent}
              title="Klubová zeď"
              subtitle={`Všichni členové · ${data.club.name}`}
              last={data.club.last}
              onPress={() => {
                tapFeedback()
                router.push('/wall/club')
              }}
              isLast
            />
          </View>

          <GroupLabel>Moje zdi</GroupLabel>
          {data.categories.length === 0 ? (
            <EmptyState icon="people-outline" title="Zatím žádná kategorie" text="Jakmile vás klub zařadí do kategorie, objeví se tu její zeď." />
          ) : (
            <View style={styles.group}>
              {data.categories.map((c, i) => (
                <WallRow
                  key={c.id}
                  icon="people"
                  color={c.color}
                  title={c.name}
                  subtitle={`${c.memberCount} ${c.memberCount === 1 ? 'člen' : c.memberCount < 5 ? 'členové' : 'členů'}`}
                  last={c.last}
                  onPress={() => {
                    tapFeedback()
                    router.push({ pathname: '/wall/[id]', params: { id: String(c.id) } })
                  }}
                  isLast={i === data.categories.length - 1}
                />
              ))}
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  group: { backgroundColor: palette.surface, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingRight: 14, minHeight: 64 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: palette.text, fontSize: 17, fontWeight: '600' },
  when: { color: palette.dim, fontSize: 13 },
  preview: { color: palette.muted, fontSize: 14 },
  previewAuthor: { color: palette.text, fontWeight: '500' },
})
