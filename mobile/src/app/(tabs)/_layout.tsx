import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, Tabs } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { palette, useTheme } from '@/lib/theme'

export default function TabsLayout() {
  const { signedIn } = useAuth()
  const theme = useTheme()

  if (!signedIn) return <Redirect href="/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: palette.dim,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Přehled',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="walls"
        options={{
          title: 'Zdi',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={25} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Události',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={color as string} />
          ),
        }}
      />
    </Tabs>
  )
}
