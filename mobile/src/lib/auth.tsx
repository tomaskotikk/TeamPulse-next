import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, loadToken, saveToken, setUnauthorizedHandler } from './api'
import { ThemeContext, themeFromClub } from './theme'
import type { Me } from './types'

type LoginResult = { ok: true } | { ok: false; error: string } | { ok: false; twoFactorUserId: number }

type AuthState = {
  ready: boolean
  signedIn: boolean
  me: Me | null
  childId: number | null
  setChildId: (id: number) => void
  login: (email: string, password: string) => Promise<LoginResult>
  verifyTwoFactor: (userId: number, code: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [childId, setChildId] = useState<number | null>(null)

  const logout = useCallback(async () => {
    await saveToken(null)
    setToken(null)
    setMe(null)
    setChildId(null)
  }, [])

  const refreshMe = useCallback(async () => {
    const data = await api<Me>('/api/mobile/me')
    setMe(data)
    setChildId((current) => current ?? data.selectedChildId)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout()
    })
    ;(async () => {
      const stored = await loadToken()
      if (stored) {
        setToken(stored)
        try {
          await refreshMe()
        } catch {
          await logout()
        }
      }
      setReady(true)
    })()
    return () => setUnauthorizedHandler(null)
  }, [logout, refreshMe])

  const finishLogin = useCallback(
    async (newToken: string): Promise<LoginResult> => {
      await saveToken(newToken)
      try {
        await refreshMe()
      } catch (err) {
        await saveToken(null)
        return { ok: false, error: err instanceof Error ? err.message : 'Přihlášení se nezdařilo.' }
      }
      setToken(newToken)
      return { ok: true }
    },
    [refreshMe],
  )

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        const res = await api<{ token?: string; requires2FA?: boolean; userId?: number }>('/api/auth/login', {
          method: 'POST',
          body: { email, password, client: 'mobile' },
        })
        if (res.requires2FA && res.userId) return { ok: false, twoFactorUserId: res.userId }
        if (!res.token) return { ok: false, error: 'Přihlášení se nezdařilo.' }
        return finishLogin(res.token)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Přihlášení se nezdařilo.' }
      }
    },
    [finishLogin],
  )

  const verifyTwoFactor = useCallback(
    async (userId: number, code: string): Promise<LoginResult> => {
      try {
        const res = await api<{ token?: string }>('/api/auth/verify-2fa', {
          method: 'POST',
          body: { userId, code, client: 'mobile' },
        })
        if (!res.token) return { ok: false, error: 'Ověření se nezdařilo.' }
        return finishLogin(res.token)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Ověření se nezdařilo.' }
      }
    },
    [finishLogin],
  )

  const value = useMemo<AuthState>(
    () => ({
      ready,
      signedIn: Boolean(token && me),
      me,
      childId,
      setChildId,
      login,
      verifyTwoFactor,
      logout,
      refreshMe,
    }),
    [ready, token, me, childId, login, verifyTwoFactor, logout, refreshMe],
  )

  const theme = useMemo(() => themeFromClub(me?.club.primary_color), [me?.club.primary_color])

  return (
    <AuthContext.Provider value={value}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
