import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearSessionCookie } from '@/lib/auth/session'
import {
  DEVICE_COOKIE_NAME,
  clearRememberedDeviceCookie,
  revokeRememberedDeviceByCookieValue,
} from '@/lib/auth/device-tokens'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(`${origin}/login`)
  await revokeRememberedDeviceByCookieValue(request.cookies.get(DEVICE_COOKIE_NAME)?.value)
  clearRememberedDeviceCookie(response)
  clearSessionCookie(response)
  return response
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.json({ success: true })
  await revokeRememberedDeviceByCookieValue(request.cookies.get(DEVICE_COOKIE_NAME)?.value)
  clearRememberedDeviceCookie(response)
  clearSessionCookie(response)
  return response
}
