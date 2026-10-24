import Ionicons from '@expo/vector-icons/Ionicons'
import * as Haptics from 'expo-haptics'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Avatar, EmptyState } from '@/components/ui'
import { dayLabel, formatTime } from '@/lib/format'
import { getRealtime } from '@/lib/realtime'
import { palette, useTheme } from '@/lib/theme'

export type ConversationMessage = {
  id: number
  user_id: number
  message: string
  created_at: string
  first_name: string | null
  last_name: string | null
  role: string | null
  avatar: string | null
}

type Item =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: ConversationMessage; own: boolean; showAuthor: boolean; showAvatar: boolean }

function buildItems(messages: ConversationMessage[], myId: number): Item[] {
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
    items.push({ kind: 'msg', key: `m-${msg.id}`, msg, own: msg.user_id === myId, showAuthor: !sameAsPrev, showAvatar: !sameAsNext })
  }
  return items.reverse()
}

type Props = {
  myId: number
  load: () => Promise<ConversationMessage[]>
  send: (text: string) => Promise<void>
  /** realtime "something changed" signal */
  realtime: { channel: string; table: string; filter: string }
  emptyText: string
  keyboardOffset?: number
}

/** Chat-style thread used by the club wall and category walls. */
export default function Conversation({ myId, load, send, realtime, emptyText, keyboardOffset = 0 }: Props) {
  const theme = useTheme()
  const [messages, setMessages] = useState<ConversationMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList<Item>>(null)
  const loadRef = useRef(load)
  loadRef.current = load

  const refresh = useCallback(async () => {
    try {
      setMessages(await loadRef.current())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zprávy se nepodařilo načíst.')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  useEffect(() => {
    const client = getRealtime()
    if (!client) return
    const channel = client
      .channel(realtime.channel)
      .on('postgres_changes', { event: '*', schema: 'public', table: realtime.table, filter: realtime.filter }, () => {
        void refresh()
      })
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [realtime.channel, realtime.table, realtime.filter, refresh])

  const items = useMemo(() => (messages ? buildItems(messages, myId) : []), [messages, myId])

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await send(trimmed)
      setText('')
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      await refresh()
      listRef.current?.scrollToOffset({ offset: 0, animated: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zprávu se nepodařilo odeslat.')
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardOffset}>
      {messages === null ? (
        <View style={styles.center}>
          {error ? <EmptyState icon="cloud-offline-outline" title="Zprávy nelze načíst" text={error} /> : <ActivityIndicator color={palette.muted} />}
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="chatbubbles-outline" title="Zatím tu nic není" text={emptyText} />
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
            return (
              <Animated.View
                entering={index < 2 ? FadeInUp.duration(220) : undefined}
                style={[styles.msgRow, own && styles.msgRowOwn, { marginTop: showAuthor ? 10 : 2 }]}
              >
                {!own ? (
                  <View style={styles.avatarSlot}>
                    {showAvatar ? <Avatar uri={msg.avatar} first={msg.first_name} last={msg.last_name} size={30} /> : null}
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
                      showAuthor ? (own ? styles.ownFirst : styles.otherFirst) : null,
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

      {error && messages !== null ? <Text style={styles.inlineError}>{error}</Text> : null}

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Napište zprávu…"
            placeholderTextColor={palette.dim}
            style={styles.input}
            multiline
            maxLength={4000}
          />
          <Pressable
            onPress={submit}
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
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  list: { paddingHorizontal: 12, paddingVertical: 12 },
  dayWrap: { alignItems: 'center', marginVertical: 14 },
  day: { color: palette.muted, fontSize: 12, fontWeight: '600', backgroundColor: palette.surface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
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
  inlineError: { color: palette.no, fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: palette.bg },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: palette.surface, borderRadius: 22, paddingLeft: 16, paddingRight: 5, paddingVertical: 5 },
  input: { flex: 1, color: palette.text, fontSize: 16, maxHeight: 120, paddingTop: 8, paddingBottom: 8 },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
})
