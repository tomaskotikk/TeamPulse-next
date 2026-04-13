import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { getSupportEmail } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'
import { buildAccountDeletedByAdminEmail } from '@/lib/email/templates'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdminUser()
    if (!admin) {
      return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 })
    }

    const { id } = await context.params
    const clubId = Number(id)

    if (!Number.isFinite(clubId) || clubId <= 0) {
      return NextResponse.json({ error: 'Neplatne ID klubu.' }, { status: 400 })
    }

    const payload = await request.json().catch(() => ({}))
    const reason = String(payload?.reason || '').trim().slice(0, 1000)
    const deleteOwnerAccount = Boolean(payload?.deleteOwnerAccount)

    const supabase = await createAdminClient()

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, name, logo, owner_user_id')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError) {
      return NextResponse.json({ error: 'Nepodarilo se nacist klub.' }, { status: 500 })
    }

    if (!club) {
      return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })
    }

    const { data: owner } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, admin, profile_picture')
      .eq('id', club.owner_user_id)
      .maybeSingle()

    const { error: deleteClubError } = await supabase
      .from('clubs')
      .delete()
      .eq('id', club.id)

    if (deleteClubError) {
      return NextResponse.json({ error: 'Nepodarilo se smazat klub.' }, { status: 500 })
    }

    const { error: clearOrgError } = await supabase
      .from('users')
      .update({ organization: null })
      .eq('organization', club.name)

    if (clearOrgError) {
      console.error('Clear organization after club delete error:', clearOrgError)
    }

    let ownerDeleted = false
    let ownerDeleteMessage: string | null = null

    if (deleteOwnerAccount && owner) {
      if (owner.admin) {
        ownerDeleteMessage = 'Ucet spravce je admin, proto nebyl smazan.'
      } else if (owner.id === admin.id) {
        ownerDeleteMessage = 'Nelze smazat vlastni admin ucet.'
      } else {
        const { data: anotherOwnedClub, error: anotherOwnedClubError } = await supabase
          .from('clubs')
          .select('id')
          .eq('owner_user_id', owner.id)
          .limit(1)
          .maybeSingle()

        if (anotherOwnedClubError) {
          console.error('Owner other clubs check error:', anotherOwnedClubError)
          ownerDeleteMessage = 'Klub byl smazan, ale nepodarilo se overit vlastnictvi dalsich klubu u spravce.'
        } else if (anotherOwnedClub) {
          ownerDeleteMessage = 'Spravce vlastni jeste dalsi klub, proto jeho ucet nebyl smazan.'
        } else {
          const fullName = `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim() || 'uzivateli'
          const accountDeleteReason = reason || `Ucet byl odstraneny spolu se smazanim klubu ${club.name}.`

          try {
            const content = buildAccountDeletedByAdminEmail({
              fullName,
              reason: accountDeleteReason,
              supportEmail: getSupportEmail(),
            })

            await sendTransactionalEmail({
              to: owner.email,
              subject: content.subject,
              html: content.html,
              text: content.text,
            })
          } catch (mailErr) {
            console.error('Club delete owner email error:', mailErr)
          }

          const { error: deleteOwnerError } = await supabase
            .from('users')
            .delete()
            .eq('id', owner.id)

          if (deleteOwnerError) {
            console.error('Club delete owner account error:', deleteOwnerError)
            ownerDeleteMessage = 'Klub byl smazan, ale ucet spravce se nepodarilo smazat.'
          } else {
            ownerDeleted = true
          }
        }
      }
    }

    if (club.logo) {
      const clubLogoPath = path.join(process.cwd(), 'public', 'uploads', 'clubs', path.basename(club.logo))
      await fs.rm(clubLogoPath, { force: true })
    }

    if (ownerDeleted && owner?.profile_picture) {
      const ownerProfilePath = path.join(process.cwd(), 'public', 'uploads', 'profiles', path.basename(owner.profile_picture))
      await fs.rm(ownerProfilePath, { force: true })
    }

    return NextResponse.json({
      success: true,
      ownerDeleted,
      ownerDeleteMessage,
    })
  } catch (err) {
    console.error('Admin delete club error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
