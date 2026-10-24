import Ionicons from '@expo/vector-icons/Ionicons'
import * as Haptics from 'expo-haptics'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useBottomTabBarHeight } from 'expo-router/build/layouts/Tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, EmptyState, ui } from '@/components/ui'
import { API_URL, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dayLabel, formatTime } from '@/lib/format'
import { getRealtime } from '@/lib/realtime'
import { palette, useTheme } from '@/lib/theme'
import type { ChatMessage } from '@/lib/types'

type Item =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: ChatMessage; own: boolean; showAuthor: boolean; showAvatar: boolean }

/** Builds the inverted list: newest first, with day separators and sender grouping. */
function buildItems(messages: ChatMessage[], myId: number): Item[] {
  const items: Item[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const day = new Date(msg.created_at).toDateString()
    if (!prev || new Date(prev.created_at).toDateString() !== day) {
      items.push({ kind: 'day', key: `d-${day}`, label: dayLabel(msg.created_at) })
    }
    const sameAsPrev = prev && prev.user_id === msg.user_id && new Date(prev.created_at).toDateString() === day
    const sameAsNext = next && next.user_id === msg.user_id && new Date(next.created_at).toDateString() === day
    items.push({
      kind: 'msg',
      key: `m-${msg.id}`,
      msg,
      own: msg.user_id === myId,
      showAuthor: !sameAsPrev,
      showAvatar: !sameAsNext,
    })
  }
  return items.reverse()
}

export default function ChatScreen() {
  const { me } = useAuth()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList<Item>>(null)

  const load = useCallback(async () => {
    try {
      const data = await api<{ messages: ChatMessage[] }>('/api/chat/messages')
      setMessages(data.messages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zprávy se nepodařilo načíst.')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  // realtime: any insert/delete in this club's chat triggers a reload
  useEffect(() => {
    const client = getRealtime()
    const clubId = me?.club.id
    if (!client || !clubId) return
    const channel = client
      .channel(`mobile-chat-${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `club_id=eq.${clubId}` }, () => {
        void load()
      })
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [me?.club.id, load])

  const items = useMemo(() => (messages && me ? buildItems(messages, me.user.id) : []), [messages, me])

  async function send() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await api('/api/chat/messages', { method: 'POST', body: { message: trimmed } })
      setText('')
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      await load()
      listRef.current?.scrollToOffset({ offset: 0, animated: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zprávu se nepodařilo odeslat.')
    } finally {
      setSending(false)
    }
  }

  if (!me) return null

  return (
    <KeyboardAvoidingView
      style={ui.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.headerTitle}>Klubová zeď</Text>
        <Text style={styles.headerSub}>{me.club.name}</Text>
      </View>

      {messages === null ? (
        <View style={styles.center}>
          {error ? <EmptyState icon="cloud-offline-outline" title="Zprávy nelze načíst" text={error} /> : <ActivityIndicator color={palette.muted} />}
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="chatbubbles-outline" title="Zatím tu nic není" text="Napište první zprávu celému klubu." />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          inverted
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          renderItem={({ item, index }) => {
            if (item.kind === 'day') {
              return (
                <View style={styles.dayWrap}>
                  <Text style={styles.day}>{item.label}</Text>
                </View>
              )
            }
            const { msg, own, showAuthor, showAvatar } = item
            const avatarUri = msg.profile_picture ? `${API_URL}/uploads/profiles/${encodeURIComponent(msg.profile_picture)}` : null
            return (
              <Animated.View
                entering={index < 2 ? FadeInUp.duration(220) : undefined}
                style={[styles.msgRow, own && styles.msgRowOwn, { marginTop: showAuthor ? 10 : 2 }]}
              >
                {!own ? (
                  <View style={styles.avatarSlot}>
                    {showAvatar ? <Avatar uri={avatarUri} first={msg.first_name} last={msg.last_name} size={30} /> : null}
                  </View>
                ) : null}
                <View style={[styles.msgCol, own && { alignItems: 'flex-end' }]}>
                  {showAuthor && !own ? (
                    <Text style={styles.author}>
                      {msg.first_name} {msg.last_name}
                      {msg.role ? <Text style={styles.authorRole}> · {msg.role}</Text> : null}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      own ? { backgroundColor: theme.accent } : styles.bubbleOther,
                      own ? (showAuthor ? styles.ownFirst : null) : showAuthor ? styles.otherFirst : null,
                    ]}
                  >
                    <Text style={[styles.bubbleText, own && { color: theme.accentText }]}>{msg.message}</Text>
                  </View>
                  {showAvatar ? <Text style={styles.time}>{formatTime(msg.created_at)}</Text> : null}
                </View>
              </Animated.View>
            )
          }}
        />
      )}

      <View style={[styles.composerWrap, { borderTopColor: palette.border }]}>
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Napište zprávu…"
            placeholderTextColor={palette.dim}
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.send, { backgroundColor: text.trim() ? theme.accent : palette.surface2 }]}
            accessibilityLabel="Odeslat zprávu"
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.accentText} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={text.trim() ? theme.accentText : palette.dim} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  headerTitle: { color: palette.text, fontSize: 22, fontWeight: '700' },
  headerSub: { color: palette.dim, fontSize: 13, marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  list: { paddingHorizontal: 12, paddingVertical: 12 },
  dayWrap: { alignItems: 'center', marginVertical: 14 },
  day: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowOwn: { justifyContent: 'flex-end' },
  avatarSlot: { width: 30 },
  msgCol: { maxWidth: '78%' },
  author: { color: palette.muted, fontSize: 12, fontWeight: '600', marginBottom: 3, marginLeft: 4 },
  authorRole: { color: palette.dim, fontWeight: '500' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleOther: { backgroundColor: palette.surface2 },
  ownFirst: { borderTopRightRadius: 6 },
  otherFirst: { borderTopLeftRadius: 6 },
  bubbleText: { color: palette.text, fontSize: 16, lineHeight: 21 },
  time: { color: palette.dim, fontSize: 11, marginTop: 3, marginHorizontal: 4 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: palette.bg },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
  },
  input: { flex: 1, color: palette.text, fontSize: 16, maxHeight: 120, paddingTop: 8, paddingBottom: 8 },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
})
