import { Stack } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Conversation, { type ConversationMessage } from '@/components/Conversation'
import { ui } from '@/components/ui'
import { API_URL, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ChatMessage } from '@/lib/types'

export default function ClubWallScreen() {
  const { me } = useAuth()
  const insets = useSafeAreaInsets()
  if (!me) return null

  return (
    <View style={[ui.screen, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ title: 'Klubová zeď' }} />
      <Conversation
        myId={me.user.id}
        emptyText="Napište první zprávu celému klubu."
        keyboardOffset={insets.top + 44}
        realtime={{ channel: `club-wall-${me.club.id}`, table: 'chat_messages', filter: `club_id=eq.${me.club.id}` }}
        load={async () => {
          const data = await api<{ messages: ChatMessage[] }>('/api/chat/messages')
          return data.messages.map(
            (m): ConversationMessage => ({
              ...m,
              avatar: m.profile_picture ? `${API_URL}/uploads/profiles/${encodeURIComponent(m.profile_picture)}` : null,
            }),
          )
        }}
        send={async (text) => {
          await api('/api/chat/messages', { method: 'POST', body: { message: text } })
        }}
      />
    </View>
  )
}
