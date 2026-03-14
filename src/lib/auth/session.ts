import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { DEVICE_COOKIE_NAME, resolveSessionFromRememberedDevice } from '@/lib/auth/device-tokens'

export const SESSION_COOKIE_NAME = 'tp_session'

export type SessionPayload = {
  userId: number
  email: string
  role: string | null
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('Missing AUTH_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY')
  }

  return new TextEncoder().encode(secret)
}

async function signSession(payload: SessionPayload, rememberMe: boolean) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? '30d' : '1d')
    .sign(getSessionSecret())
}

export async function attachSessionCookie(
  response: NextResponse,
  payload: SessionPayload,
  rememberMe: boolean
) {
  const token = await signSession(payload, rememberMe)

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function readSessionFromCookieValue(cookieValue?: string) {
  if (!cookieValue) {
    return null
  }

  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function readSessionFromCookies() {
  const cookieStore = await cookies()
  const session = await readSessionFromCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (session) {
    return session
  }

  const rememberedDeviceCookie = cookieStore.get(DEVICE_COOKIE_NAME)?.value
  if (!rememberedDeviceCookie) {
    return null
  }

  return resolveSessionFromRememberedDevice(rememberedDeviceCookie)
}
