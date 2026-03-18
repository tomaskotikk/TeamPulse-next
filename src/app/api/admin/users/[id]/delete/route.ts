import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getSupportEmail } from '@/lib/email/config'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/send'
import { buildAccountDeletedByAdminEmail } from '@/lib/email/templates'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    }

    const { id } = await context.params
    const userId = Number(id)

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID uživatele.' }, { status: 400 })
    }

    if (userId === admin.id) {
      return NextResponse.json({ error: 'Nemůžete smazat vlastní účet.' }, { status: 400 })
    }

    const payload = await request.json().catch(() => ({}))
    const reason = String(payload?.reason || '').trim().slice(0, 1000)

    if (!reason) {
      return NextResponse.json({ error: 'Důvod smazání je povinný.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, admin, profile_picture')
      .eq('id', userId)
      .maybeSingle()

    if (targetUserError) {
      return NextResponse.json({ error: 'Nepodařilo se načíst uživatele.' }, { status: 500 })
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen.' }, { status: 404 })
    }

    const { data: ownedClub } = await supabase
      .from('clubs')
      .select('id')
      .eq('owner_user_id', userId)
      .limit(1)
      .maybeSingle()

    if (ownedClub) {
      return NextResponse.json(
        { error: 'Tento účet vlastní klub. Nejprve je potřeba klub převést nebo smazat.' },
        { status: 400 }
      )
    }

    const fullName = `${targetUser.first_name ?? ''} ${targetUser.last_name ?? ''}`.trim() || 'uživateli'

    try {
      const content = buildAccountDeletedByAdminEmail({
        fullName,
        reason,
        supportEmail: getSupportEmail(),
      })

      await sendTransactionalEmail({
        to: targetUser.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      })
    } catch (mailErr) {
      console.error('Account deletion email error:', mailErr)
      return NextResponse.json(
        { error: 'Nepodařilo se odeslat e-mail o smazání účtu.' },
        { status: 500 }
      )
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      return NextResponse.json({ error: 'Nepodařilo se smazat účet uživatele.' }, { status: 500 })
    }

    if (targetUser.profile_picture) {
      const profilePath = path.join(
        process.cwd(),
        'public',
        'uploads',
        'profiles',
        path.basename(targetUser.profile_picture)
      )
      await fs.rm(profilePath, { force: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin delete user error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
