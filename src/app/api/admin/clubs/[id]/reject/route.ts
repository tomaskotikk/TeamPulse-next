import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { buildClubRejectedOwnerEmail } from '@/lib/email/templates'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    }

    const { id } = await context.params
    const clubId = Number(id)

    if (!Number.isFinite(clubId) || clubId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID klubu.' }, { status: 400 })
    }

    const payload = await request.json().catch(() => ({}))
    const reason = String(payload?.reason || '').trim().slice(0, 1000)

    const supabase = await createAdminClient()

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, approved, name, owner_user_id, rejected_at')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError) {
      return NextResponse.json({ error: 'Nepodařilo se načíst klub.' }, { status: 500 })
    }

    if (!club) {
      return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })
    }

    if (club.approved) {
      return NextResponse.json({ error: 'Schválený klub nelze zamítnout.' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('clubs')
      .update({
        approved: false,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', clubId)

    if (updateError) {
      return NextResponse.json({ error: 'Nepodařilo se zamítnout žádost.' }, { status: 500 })
    }

    const { data: owner } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', club.owner_user_id)
      .maybeSingle()

    if (owner?.email) {
      try {
        const content = buildClubRejectedOwnerEmail({
          fullName: `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim() || 'správce',
          clubName: club.name,
          loginUrl: `${getAppBaseUrl()}/login`,
          reason,
        })

        await sendTransactionalEmail({
          to: owner.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
        })
      } catch (mailErr) {
        console.error('Club rejected email error:', mailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin reject club error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
