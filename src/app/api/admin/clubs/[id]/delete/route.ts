import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'

export async function DELETE(
  _request: Request,
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

    const supabase = await createAdminClient()

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, name, logo')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError) {
      return NextResponse.json({ error: 'Nepodařilo se načíst klub.' }, { status: 500 })
    }

    if (!club) {
      return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })
    }

    const { data: usersInTeam } = await supabase
      .from('users')
      .select('id, admin, profile_picture')
      .eq('organization', club.name)

    const members = usersInTeam ?? []
    const adminIds = members.filter((u) => u.admin).map((u) => u.id)
    const nonAdminUsers = members.filter((u) => !u.admin)

    if (adminIds.length > 0) {
      await supabase
        .from('users')
        .update({ organization: null })
        .in('id', adminIds)
    }

    if (nonAdminUsers.length > 0) {
      const nonAdminIds = nonAdminUsers.map((u) => u.id)
      const { error: deleteUsersError } = await supabase
        .from('users')
        .delete()
        .in('id', nonAdminIds)

      if (deleteUsersError) {
        return NextResponse.json({ error: 'Nepodařilo se odstranit členy klubu.' }, { status: 500 })
      }

      const profileDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
      await Promise.all(
        nonAdminUsers
          .map((u) => u.profile_picture)
          .filter((name): name is string => Boolean(name))
          .map((fileName) => fs.rm(path.join(profileDir, path.basename(fileName)), { force: true }))
      )
    }

    const { error: deleteClubError } = await supabase
      .from('clubs')
      .delete()
      .eq('id', club.id)

    if (deleteClubError) {
      return NextResponse.json({ error: 'Nepodařilo se zrušit klub.' }, { status: 500 })
    }

    if (club.logo) {
      const logoPath = path.join(process.cwd(), 'public', 'uploads', 'clubs', path.basename(club.logo))
      await fs.rm(logoPath, { force: true })
    }

    return NextResponse.json({
      success: true,
      deletedUsers: nonAdminUsers.length,
      preservedAdmins: adminIds.length,
    })
  } catch (err) {
    console.error('Admin delete club error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
