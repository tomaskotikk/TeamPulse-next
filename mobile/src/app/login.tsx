import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import { Redirect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState, type ComponentRef } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { palette } from '@/lib/theme'

const BRAND = '#FF3300'

/** Slowly drifting sport icon in the background. */
function FloatingBall({ icon, size, x, y, delay }: { icon: 'football-outline' | 'american-football-outline' | 'basketball-outline' | 'tennisball-outline'; size: number; x: number; y: number; delay: number }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 7000 + delay, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [t, delay])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -14 + t.value * 28 }, { rotate: `${-10 + t.value * 20}deg` }],
  }))
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]} pointerEvents="none">
      <Ionicons name={icon} size={size} color="rgba(243,245,248,0.07)" />
    </Animated.View>
  )
}

export default function LoginScreen() {
  const { signedIn, login, verifyTwoFactor } = useAuth()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [twoFactorUserId, setTwoFactorUserId] = useState<number | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null)

  const shake = useSharedValue(0)
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }))
  const glow = useSharedValue(0)
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [glow])
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + glow.value * 0.25, transform: [{ scale: 1 + glow.value * 0.08 }] }))

  if (signedIn) return <Redirect href="/" />

  function fail(message: string) {
    setError(message)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    )
  }

  async function submit() {
    if (loading) return
    setError(null)
    if (twoFactorUserId) {
      if (code.length !== 6) return fail('Zadejte 6místný kód z e-mailu.')
      setLoading(true)
      const res = await verifyTwoFactor(twoFactorUserId, code)
      setLoading(false)
      if (!res.ok && 'error' in res) fail(res.error)
      return
    }
    if (!email.trim() || !password) return fail('Vyplňte e-mail i heslo.')
    setLoading(true)
    const res = await login(email.trim().toLowerCase(), password)
    setLoading(false)
    if (res.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } else if ('twoFactorUserId' in res) {
      setTwoFactorUserId(res.twoFactorUserId)
    } else {
      fail(res.error)
    }
  }

  return (
    <View style={styles.screen}>
      {/* ambient background */}
      <Animated.View style={[styles.glow, { width: width * 1.3, height: width * 1.3, left: -width * 0.15, top: -width * 0.75 }, glowStyle]} pointerEvents="none" />
      <FloatingBall icon="american-football-outline" size={88} x={width * 0.68} y={height * 0.08} delay={0} />
      <FloatingBall icon="football-outline" size={64} x={width * 0.06} y={height * 0.2} delay={1200} />
      <FloatingBall icon="basketball-outline" size={54} x={width * 0.78} y={height * 0.44} delay={2100} />
      <FloatingBall icon="tennisball-outline" size={40} x={width * 0.12} y={height * 0.62} delay={800} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.brand}>
            <Image source={require('../../assets/tp-logo.png')} style={styles.logo} contentFit="contain" />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.title}>
            {twoFactorUserId ? 'Ověření' : 'Vítejte zpět'}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.subtitle}>
            {twoFactorUserId
              ? 'Na váš e-mail jsme poslali 6místný kód.'
              : 'Přihlaste se ke svému klubu v TeamPulse.'}
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Animated.View style={[styles.form, shakeStyle]}>
            {twoFactorUserId ? (
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={palette.dim}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                style={[styles.input, styles.codeInput, focused === 'code' && styles.inputFocused]}
                onFocus={() => setFocused('code')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={submit}
              />
            ) : (
              <>
                <View style={[styles.field, focused === 'email' && styles.inputFocused]}>
                  <Ionicons name="mail-outline" size={19} color={focused === 'email' ? BRAND : palette.dim} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="E-mail"
                    placeholderTextColor={palette.dim}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    style={styles.fieldInput}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
                <View style={[styles.field, focused === 'password' && styles.inputFocused]}>
                  <Ionicons name="lock-closed-outline" size={19} color={focused === 'password' ? BRAND : palette.dim} />
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Heslo"
                    placeholderTextColor={palette.dim}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="go"
                    style={styles.fieldInput}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={submit}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityLabel={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.dim} />
                  </Pressable>
                </View>
              </>
            )}

            {error ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
                <Ionicons name="alert-circle" size={16} color={palette.no} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{twoFactorUserId ? 'Ověřit' : 'Přihlásit se'}</Text>}
            </Pressable>

            {twoFactorUserId ? (
              <Pressable
                onPress={() => {
                  setTwoFactorUserId(null)
                  setCode('')
                  setError(null)
                }}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Zpět na přihlášení</Text>
              </Pressable>
            ) : (
              <Text style={styles.hint}>Účet vám vytvoří klub pozvánkou. Heslo obnovíte na webu teampulse.cfd.</Text>
            )}
          </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg, overflow: 'hidden' },
  glow: { position: 'absolute', borderRadius: 9999, backgroundColor: 'rgba(255,51,0,0.2)' },
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { alignItems: 'flex-start', marginBottom: 28 },
  logo: { width: 72, height: 44 },
  title: { color: palette.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { color: palette.muted, fontSize: 16, marginTop: 6, marginBottom: 32, lineHeight: 22 },
  form: { gap: 12 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  fieldInput: { flex: 1, color: palette.text, fontSize: 16, height: '100%' },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    color: palette.text,
    fontSize: 16,
  },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: '600', height: 64 },
  inputFocused: { borderColor: BRAND },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  errorText: { color: palette.no, fontSize: 14, flex: 1 },
  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkButton: { alignItems: 'center', paddingVertical: 12 },
  linkText: { color: palette.muted, fontSize: 15, fontWeight: '500' },
  hint: { color: palette.dim, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19 },
})
