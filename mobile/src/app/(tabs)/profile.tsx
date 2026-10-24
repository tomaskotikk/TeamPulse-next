import * as Haptics from 'expo-haptics'
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar, Group, GroupLabel, Row, ui } from '@/components/ui'
import { API_URL } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { palette } from '@/lib/theme'

function age(dateBirth: string | null) {
  if (!dateBirth) return null
  const b = new Date(dateBirth)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1
  return a
}

export default function ProfileScreen() {
  const { me, logout, childId, setChildId } = useAuth()
  const insets = useSafeAreaInsets()
  if (!me) return null

  const u = me.user
  const years = age(u.dateBirth)

  function confirmLogout() {
    Alert.alert('Odhlásit se?', 'Na tomto zařízení budete odhlášeni.', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odhlásit',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
          void logout()
        },
      },
    ])
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={[ui.content, { paddingTop: insets.top + 12 }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Avatar uri={u.avatar} first={u.first_name} last={u.last_name} size={96} />
        <Text style={styles.name}>{u.last_name} {u.first_name}</Text>
        <Text style={styles.sub}>
          {u.dateBirth ? new Date(u.dateBirth).toLocaleDateString('cs-CZ') : u.role}
          {years !== null ? ` · ${years} let` : ''}
        </Text>
        <Text style={styles.club}>{me.club.name}</Text>
      </Animated.View>

      <GroupLabel>Účet</GroupLabel>
      <Group>
        <Row icon="person-outline" label="Role" value={u.role} />
        <Row icon="mail-outline" label="E-mail" value={u.email} />
        <Row icon="call-outline" label="Telefon" value={u.phone ?? '–'} last />
      </Group>

      {me.children.length > 0 ? (
        <>
          <GroupLabel>Moje děti</GroupLabel>
          <Group>
            {me.children.map((c, i) => (
              <Row
                key={c.id}
                icon={c.id === childId ? 'checkmark-circle' : 'ellipse-outline'}
                label={`${c.first_name} ${c.last_name}`}
                value={c.id === childId ? 'zobrazeno' : undefined}
                onPress={() => setChildId(c.id)}
                last={i === me.children.length - 1}
              />
            ))}
          </Group>
        </>
      ) : null}

      <GroupLabel>Klub</GroupLabel>
      <Group>
        <Row icon="shield-outline" label={me.club.name} value={[me.club.sport, me.club.city].filter(Boolean).join(' · ')} />
        <Row icon="globe-outline" label="Otevřít web TeamPulse" onPress={() => Linking.openURL(`${API_URL}/login`)} last />
      </Group>

      <GroupLabel>Zabezpečení</GroupLabel>
      <Group>
        <Row icon="key-outline" label="Změnit heslo" onPress={() => Linking.openURL(`${API_URL}/profile`)} />
        <Row icon="log-out-outline" label="Odhlásit se" destructive onPress={confirmLogout} last />
      </Group>

      <Text style={styles.version}>TeamPulse · verze 1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  name: { color: palette.text, fontSize: 26, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 },
  sub: { color: palette.muted, fontSize: 16 },
  club: { color: palette.dim, fontSize: 13, fontWeight: '600', letterSpacing: 0.8, marginTop: 2, textTransform: 'uppercase' },
  version: { color: palette.dim, fontSize: 12, textAlign: 'center', marginTop: 28 },
})
