import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAppUser } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import { getMemberProfile, getProfileAccess } from '@/lib/member-profiles'
import { parseProfile } from '@/lib/onboarding/validation'

type Params = { params: Promise<{ id: string }> }

async function resolve(params: Params['params']) {
  const user = await getCurrentAppUser()
  if (!user) return { error: NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 }) }

  const memberId = Number.parseInt((await params).id, 10)
  if (!Number.isInteger(memberId)) return { error: NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 }) }

  const access = await getProfileAccess(user, memberId)
  return { user, memberId, access }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params)
    if ('error' in ctx) return ctx.error
    if (!ctx.access.canView) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 403 })

    return NextResponse.json({ profile: await getMemberProfile(ctx.memberId), canEdit: ctx.access.canEdit })
  } catch (err) {
    console.error('Member profile GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await resolve(params)
    if ('error' in ctx) return ctx.error
    if (!ctx.access.canEdit) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const parsed = parseProfile(body, false)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createAdminClient()
    const { error } = await supabase.from('member_profiles').upsert(
      {
        user_id: ctx.memberId,
        street: parsed.data.street,
        city: parsed.data.city,
        zip: parsed.data.zip,
        health_insurance: parsed.data.healthInsurance,
        health_notes: parsed.data.healthNotes,
        emergency_name: parsed.data.emergencyName,
        emergency_phone: parsed.data.emergencyPhone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (error) {
      console.error('Member profile PATCH error:', error)
      return NextResponse.json({ error: 'Nepodařilo se uložit údaje.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: await getMemberProfile(ctx.memberId) })
  } catch (err) {
    console.error('Member profile PATCH error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
