import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const memberId = Number(id)

    if (!Number.isFinite(memberId) || memberId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID člena.' }, { status: 400 })
    }

    const user = await getCurrentAppUser()
    if (!user) {
      return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    }

    if (user.role !== 'manažer') {
      return NextResponse.json({ error: 'Pouze manažer může odebrat člena.' }, { status: 403 })
    }

    if (user.id === memberId) {
      return NextResponse.json({ error: 'Nemůžete odstranit sami sebe.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) {
      return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })
    }

    const supabase = await createAdminClient()

    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, role, organization, profile_picture')
      .eq('id', memberId)
      .maybeSingle()

    if (memberError) {
      return NextResponse.json({ error: 'Nepodařilo se načíst člena.' }, { status: 500 })
    }

    if (!member) {
      return NextResponse.json({ error: 'Člen nebyl nalezen.' }, { status: 404 })
    }

    if (member.organization !== club.name) {
      return NextResponse.json({ error: 'Člen nepatří do vašeho klubu.' }, { status: 403 })
    }

    if (member.role === 'manažer') {
      return NextResponse.json({ error: 'Manažera nelze tímto způsobem odstranit.' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      return NextResponse.json({ error: 'Nepodařilo se odstranit člena.' }, { status: 500 })
    }

    if (member.profile_picture) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
      const profilePath = path.join(uploadDir, path.basename(member.profile_picture))
      await fs.rm(profilePath, { force: true })
    }

    return NextResponse.json({ success: true, id: memberId })
  } catch (err) {
    console.error('Member DELETE error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
