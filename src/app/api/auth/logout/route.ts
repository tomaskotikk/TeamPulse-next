import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clearSessionCookie } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(`${origin}/login`)
  clearSessionCookie(response)
  return response
}

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
