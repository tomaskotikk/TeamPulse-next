import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { SessionPayload } from '@/lib/auth/session'

export const DEVICE_COOKIE_NAME = 'tp_device'
export const DEVICE_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30

function hashToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function parseCookieValue(cookieValue?: string | null) {
  if (!cookieValue) return null

  const parts = cookieValue.split('.')
  if (parts.length !== 2) return null

  const selector = parts[0]?.trim()
  const token = parts[1]?.trim()

  if (!selector || !token) return null

  return { selector, token }
}

function getIpAddress(request?: NextRequest) {
  if (!request) return null

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim().slice(0, 64) || null
  }

  return request.headers.get('x-real-ip')?.slice(0, 64) || null
}

function getUserAgent(request?: NextRequest) {
  if (!request) return null
  return request.headers.get('user-agent')?.slice(0, 255) || null
}

export function clearRememberedDeviceCookie(response: NextResponse) {
  response.cookies.set(DEVICE_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function createRememberedDevice(
  response: NextResponse,
  userId: number,
  request?: NextRequest
) {
  const selector = crypto.randomBytes(12).toString('hex')
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + DEVICE_REMEMBER_MAX_AGE * 1000).toISOString()

  const supabase = await createAdminClient()
  const { error } = await supabase.from('device_tokens').insert({
    user_id: userId,
    token_selector: selector,
    token_hash: tokenHash,
    user_agent: getUserAgent(request),
    ip_address: getIpAddress(request),
    expires_at: expiresAt,
    revoked: false,
    last_used_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Failed to create device token: ${error.message}`)
  }

  response.cookies.set(DEVICE_COOKIE_NAME, `${selector}.${rawToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_REMEMBER_MAX_AGE,
  })
}

export async function revokeRememberedDeviceByCookieValue(cookieValue?: string | null) {
  const parsed = parseCookieValue(cookieValue)
  if (!parsed) return

  const supabase = await createAdminClient()
  await supabase
    .from('device_tokens')
    .update({ revoked: true })
    .eq('token_selector', parsed.selector)
}

export async function resolveSessionFromRememberedDevice(cookieValue?: string): Promise<SessionPayload | null> {
  const parsed = parseCookieValue(cookieValue)
  if (!parsed) return null

  const supabase = await createAdminClient()
  const { data: tokenRecord } = await supabase
    .from('device_tokens')
    .select('user_id, token_hash, expires_at, revoked')
    .eq('token_selector', parsed.selector)
    .maybeSingle()

  if (!tokenRecord) return null

  if (tokenRecord.revoked) {
    return null
  }

  const expiresAt = new Date(tokenRecord.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    await supabase
      .from('device_tokens')
      .update({ revoked: true })
      .eq('token_selector', parsed.selector)

    return null
  }

  const incomingHash = hashToken(parsed.token)
  const hashMatches = safeEqual(incomingHash, tokenRecord.token_hash)
  if (!hashMatches) {
    await supabase
      .from('device_tokens')
      .update({ revoked: true })
      .eq('token_selector', parsed.selector)

    return null
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', tokenRecord.user_id)
    .maybeSingle()

  if (!user) {
    return null
  }

  await supabase
    .from('device_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token_selector', parsed.selector)

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  }
}
