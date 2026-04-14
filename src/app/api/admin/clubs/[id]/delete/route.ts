import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { getSupportEmail } from '@/lib/email/config'
import { sendTransactionalEmail } from '@/lib/email/send'
import {
  buildAccountDeletedByAdminEmail,
  buildClubDeletedByAdminEmail,
} from '@/lib/email/templates'

type ClubMember = {
  id: number
  first_name: string | null
  last_name: string | null
  email: string
  admin: boolean
  profile_picture: string | null
}

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

    const { data: membersRaw, error: membersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, admin, profile_picture')
      .eq('organization', club.name)

    if (membersError) {
      return NextResponse.json({ error: 'Nepodarilo se nacist cleny klubu.' }, { status: 500 })
    }

    const members = (membersRaw ?? []) as ClubMember[]

    const ownerInMembers = owner && members.some((m) => m.id === owner.id)
    if (owner && !ownerInMembers) {
      members.push(owner as ClubMember)
    }

    const usersToDelete = members.filter((member) => !member.admin && member.id !== admin.id)
    const usersToKeep = members.filter((member) => member.admin || member.id === admin.id)

    const notifyByEmail = new Map<string, ClubMember>()
    for (const member of members) {
      notifyByEmail.set(member.email.toLowerCase(), member)
    }

    if (owner?.email) {
      notifyByEmail.set(owner.email.toLowerCase(), owner as ClubMember)
    }

    const { error: deleteClubError } = await supabase
      .from('clubs')
      .delete()
      .eq('id', club.id)

    if (deleteClubError) {
      return NextResponse.json({ error: 'Nepodarilo se smazat klub.' }, { status: 500 })
    }

    if (usersToDelete.length > 0) {
      const idsToDelete = usersToDelete.map((u) => u.id)
      const { error: deleteUsersError } = await supabase
        .from('users')
        .delete()
        .in('id', idsToDelete)

      if (deleteUsersError) {
        return NextResponse.json(
          { error: 'Klub byl smazan, ale nepodarilo se odstranit uzivatele klubu.' },
          { status: 500 }
        )
      }

      await Promise.all(
        usersToDelete
          .filter((u) => Boolean(u.profile_picture))
          .map(async (u) => {
            const profilePath = path.join(
              process.cwd(),
              'public',
              'uploads',
              'profiles',
              path.basename(u.profile_picture as string)
            )
            await fs.rm(profilePath, { force: true })
          })
      )
    }

    const userIdsToKeep = usersToKeep.map((u) => u.id)
    let clearOrgError: { message?: string } | null = null
    if (userIdsToKeep.length > 0) {
      const clearResult = await supabase
        .from('users')
        .update({ organization: null })
        .in('id', userIdsToKeep)
      clearOrgError = clearResult.error
    }

    if (clearOrgError) {
      console.error('Clear organization after club delete error:', clearOrgError)
    }

    if (club.logo) {
      const clubLogoPath = path.join(process.cwd(), 'public', 'uploads', 'clubs', path.basename(club.logo))
      await fs.rm(clubLogoPath, { force: true })
    }

    const deleteReason = reason || `Klub ${club.name} byl odstraneny administratorem.`

    const deletionEmailContentById = new Map<number, ReturnType<typeof buildAccountDeletedByAdminEmail>>()
    for (const user of usersToDelete) {
      const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'uzivateli'
      deletionEmailContentById.set(
        user.id,
        buildAccountDeletedByAdminEmail({
          fullName,
          reason: deleteReason,
          supportEmail: getSupportEmail(),
        })
      )
    }

    const clubDeletedEmailContentByEmail = new Map<string, ReturnType<typeof buildClubDeletedByAdminEmail>>()
    for (const member of notifyByEmail.values()) {
      const fullName = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || 'uzivateli'
      clubDeletedEmailContentByEmail.set(
        member.email.toLowerCase(),
        buildClubDeletedByAdminEmail({
          fullName,
          clubName: club.name,
          reason: reason || null,
          supportEmail: getSupportEmail(),
        })
      )
    }

    const emailResults = await Promise.allSettled(
      Array.from(notifyByEmail.values()).map(async (member) => {
        const key = member.email.toLowerCase()
        const content = deletionEmailContentById.get(member.id) ?? clubDeletedEmailContentByEmail.get(key)
        if (!content) return

        await sendTransactionalEmail({
          to: member.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
        })
      })
    )

    const emailFailed = emailResults.filter((result) => result.status === 'rejected').length
    const emailSent = emailResults.length - emailFailed

    if (emailFailed > 0) {
      console.error('Club delete notification email failures:', emailFailed)
    }

    return NextResponse.json({
      success: true,
      deletedUsersCount: usersToDelete.length,
      keptAdminsCount: usersToKeep.length,
      emailSent,
      emailFailed,
    })
  } catch (err) {
    console.error('Admin delete club error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
