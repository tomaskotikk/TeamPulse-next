import * as SecureStore from 'expo-secure-store'

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://www.teampulse.cfd').replace(/\/$/, '')

const TOKEN_KEY = 'tp_token'

let cachedToken: string | null = null
let onUnauthorized: (() => void) | null = null

export async function loadToken() {
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY)
  return cachedToken
}

export async function saveToken(token: string | null) {
  cachedToken = token
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token)
  else await SecureStore.deleteItemAsync(TOKEN_KEY)
}

/** Called when the server rejects the token (expired / revoked) so the app can return to login. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError('Nepodařilo se spojit se serverem. Zkontrolujte připojení k internetu.', 0)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && cachedToken) onUnauthorized?.()
    throw new ApiError((data as { error?: string }).error ?? 'Nastala chyba serveru.', res.status)
  }
  return data as T
}

/** Adds ?child= for parents so the server returns the selected child's data. */
export function withChild(path: string, childId: number | null) {
  if (!childId) return path
  return `${path}${path.includes('?') ? '&' : '?'}child=${childId}`
}
