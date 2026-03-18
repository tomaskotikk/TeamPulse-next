import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
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
      .select('id, approved, name, owner_user_id, logo')
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

    const { data: owner } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, profile_picture')
      .eq('id', club.owner_user_id)
      .maybeSingle()

    const { data: usersInOrganization } = await supabase
      .from('users')
      .select('id, admin, profile_picture')
      .eq('organization', club.name)

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

    const { error: deleteClubError } = await supabase
      .from('clubs')
      .delete()
      .eq('id', club.id)

    if (deleteClubError) {
      return NextResponse.json({ error: 'Nepodařilo se odstranit zamítnutý klub.' }, { status: 500 })
    }

    const candidateUsers = usersInOrganization ?? []
    const nonAdminUserIds = candidateUsers.filter((u) => !u.admin).map((u) => u.id)
    const ownerId = owner?.id ?? null

    const userIdsToDelete = Array.from(new Set([
      ...nonAdminUserIds,
      ...(ownerId ? [ownerId] : []),
    ]))

    if (userIdsToDelete.length > 0) {
      const { error: deleteUsersError } = await supabase
        .from('users')
        .delete()
        .in('id', userIdsToDelete)

      if (deleteUsersError) {
        return NextResponse.json({ error: 'Klub byl zamítnut, ale nepodařilo se odstranit související uživatele.' }, { status: 500 })
      }
    }

    const profileDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
    const usersForFileCleanup = [
      ...(candidateUsers ?? []).map((u) => u.profile_picture),
      owner?.profile_picture ?? null,
    ]
      .filter((name): name is string => Boolean(name))

    await Promise.all(
      usersForFileCleanup.map((fileName) =>
        fs.rm(path.join(profileDir, path.basename(fileName)), { force: true })
      )
    )

    if (club.logo) {
      const clubLogoPath = path.join(process.cwd(), 'public', 'uploads', 'clubs', path.basename(club.logo))
      await fs.rm(clubLogoPath, { force: true })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin reject club error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
