import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import type { ComponentProps, ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { formatEventRange, initials } from '@/lib/format'
import { eventTypeColor, eventTypeLabel, palette, useTheme } from '@/lib/theme'
import type { ClubEvent, Response } from '@/lib/types'

type IconName = ComponentProps<typeof Ionicons>['name']

export function tapFeedback() {
  void Haptics.selectionAsync().catch(() => {})
}

/* ── Typography ── */
export function LargeTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <View style={s.largeTitleWrap}>
      <Text style={s.largeTitle}>{children}</Text>
      {subtitle ? <Text style={s.largeSubtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: { label: string; onPress: () => void } }) {
  const theme = useTheme()
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} style={[s.pillButton, { backgroundColor: theme.accentSoft }]} hitSlop={8}>
          <Text style={[s.pillButtonText, { color: theme.accent }]}>{action.label}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.accent} />
        </Pressable>
      ) : null}
    </View>
  )
}

export function GroupLabel({ children }: { children: string }) {
  return <Text style={s.groupLabel}>{children.toUpperCase()}</Text>
}

/* ── Grouped list ── */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.group, style]}>{children}</View>
}

export function Row({
  icon,
  label,
  value,
  onPress,
  last,
  destructive,
  badge,
}: {
  icon?: IconName
  label: string
  value?: string
  onPress?: () => void
  last?: boolean
  destructive?: boolean
  badge?: number
}) {
  const theme = useTheme()
  const content = (
    <View style={s.row}>
      {icon ? (
        <View style={[s.rowIcon, { backgroundColor: destructive ? 'rgba(214,69,69,0.16)' : theme.accentSoft }]}>
          <Ionicons name={icon} size={17} color={destructive ? palette.no : theme.accent} />
        </View>
      ) : null}
      <View style={[s.rowMain, !last && s.rowDivider]}>
        <Text style={[s.rowLabel, destructive && { color: palette.no }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={s.rowRight}>
          {value ? <Text style={s.rowValue} numberOfLines={1}>{value}</Text> : null}
          {badge ? (
            <View style={[s.badge, { backgroundColor: theme.accent }]}>
              <Text style={[s.badgeText, { color: theme.accentText }]}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          ) : null}
          {onPress ? <Ionicons name="chevron-forward" size={18} color={palette.dim} /> : null}
        </View>
      </View>
    </View>
  )
  if (!onPress) return content
  return (
    <Pressable onPress={onPress} android_ripple={{ color: 'rgba(255,255,255,0.06)' }} style={({ pressed }) => pressed && s.pressed}>
      {content}
    </Pressable>
  )
}

/* ── Avatar ── */
export function Avatar({ uri, first, last, size = 36 }: { uri?: string | null; first?: string | null; last?: string | null; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={150} />
  }
  return (
    <View style={[s.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{initials(first, last)}</Text>
    </View>
  )
}

/* ── Response status ── */
export function ResponseBadge({ response, size = 28 }: { response: Response; size?: number }) {
  const icon: IconName = response === 'yes' ? 'checkmark' : response === 'no' ? 'close' : 'help'
  const bg = response === 'yes' ? palette.yes : response === 'no' ? palette.no : 'rgba(243,245,248,0.16)'
  return (
    <View style={[s.status, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Ionicons name={icon} size={size * 0.58} color="#fff" />
    </View>
  )
}

/* ── Event card ── */
export function EventCard({ event, index = 0, onOpen, showStatus = true }: { event: ClubEvent; index?: number; onOpen?: () => void; showStatus?: boolean }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(380)}>
      <Pressable
        onPress={() => {
          tapFeedback()
          onOpen?.()
          router.push({ pathname: '/event/[id]', params: { id: String(event.id) } })
        }}
        style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      >
        <View style={[s.stripe, { backgroundColor: eventTypeColor[event.type] ?? eventTypeColor.event }]} />
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={2}>{event.title}</Text>
          <Text style={s.cardMeta}>
            {formatEventRange(event.starts_at, event.ends_at, event.all_day)}
            {event.location ? ` · ${event.location}` : ''}
          </Text>
          <View style={s.tags}>
            <View style={s.tag}>
              <Text style={s.tagText}>{eventTypeLabel[event.type] ?? 'Akce'}</Text>
            </View>
            {event.categories.map((c) => (
              <View key={c.name} style={s.tag}>
                <View style={[s.tagDot, { backgroundColor: c.color }]} />
                <Text style={s.tagText}>{c.name}</Text>
              </View>
            ))}
          </View>
        </View>
        {showStatus ? (
          <View style={s.cardStatus}>
            <ResponseBadge response={event.response} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

/* ── States ── */
export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={30} color={palette.dim} />
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
    </View>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <View style={s.segmented}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tapFeedback()
              onChange(o.value)
            }}
            style={[s.segment, active && s.segmentActive]}
          >
            <Text style={[s.segmentText, active && s.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
})

const s = StyleSheet.create({
  largeTitleWrap: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 16 },
  largeTitle: { color: palette.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  largeSubtitle: { color: palette.muted, fontSize: 15, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 24, marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { color: palette.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  sectionSubtitle: { color: palette.dim, fontSize: 13, marginTop: 2 },
  pillButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, height: 32, borderRadius: 16 },
  pillButtonText: { fontSize: 14, fontWeight: '600' },

  groupLabel: { color: palette.dim, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 24, marginBottom: 8, marginHorizontal: 16 },

  group: { backgroundColor: palette.surface, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, minHeight: 52 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingRight: 14, gap: 8 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowLabel: { flex: 1, color: palette.text, fontSize: 16, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '60%' },
  rowValue: { color: palette.muted, fontSize: 15 },
  badge: { minWidth: 24, paddingHorizontal: 7, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  pressed: { backgroundColor: 'rgba(255,255,255,0.05)' },

  avatarFallback: { backgroundColor: palette.surface2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.muted, fontWeight: '700' },

  status: { alignItems: 'center', justifyContent: 'center' },

  card: { flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 14, padding: 14, paddingLeft: 12, gap: 12, marginBottom: 10 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  stripe: { width: 5, borderRadius: 3 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { color: palette.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  cardMeta: { color: palette.muted, fontSize: 14, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(243,245,248,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  tagText: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  cardStatus: { justifyContent: 'center', paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: palette.border },

  empty: { alignItems: 'center', gap: 6, paddingVertical: 28, paddingHorizontal: 20, backgroundColor: palette.surface, borderRadius: 14 },
  emptyTitle: { color: palette.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyText: { color: palette.muted, fontSize: 14, textAlign: 'center' },

  segmented: { flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: 'rgba(243,245,248,0.14)' },
  segmentText: { color: palette.muted, fontSize: 15, fontWeight: '600' },
  segmentTextActive: { color: palette.text },
})
