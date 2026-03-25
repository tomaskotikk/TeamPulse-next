import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pendingId = Number(body.pendingId)
    const email = String(body.email || '').trim().toLowerCase()

    if (!pendingId || !Number.isFinite(pendingId) || !email) {
      return NextResponse.json({ error: 'Neplatný dotaz na stav registrace.' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const now = new Date()

    const { data: pending } = await supabase
      .from('pending_registrations')
      .select('id, expires_at')
      .eq('id', pendingId)
      .ilike('email', email)
      .maybeSingle()

    if (pending) {
      const expiresAt = new Date(pending.expires_at)
      if (expiresAt.getTime() <= now.getTime()) {
        return NextResponse.json({ status: 'expired' })
      }

      return NextResponse.json({ status: 'pending' })
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .ilike('email', email)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ status: 'processing' })
    }

    const { data: club } = await supabase
      .from('clubs')
      .select('id, approved')
      .eq('owner_user_id', user.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!club) {
      return NextResponse.json({ status: 'processing' })
    }

    return NextResponse.json({
      status: 'verified',
      redirectPath: '/awaiting-approval',
    })
  } catch (err) {
    console.error('Registration status error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
