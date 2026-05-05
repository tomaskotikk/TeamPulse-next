import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import { fullResyncCategories } from '@/app/api/categories/route'

const ALLOWED_ROLES = ['hráč', 'trenér', 'rodič', 'jiné']

export async function PATCH(
  request: Request,
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
      return NextResponse.json({ error: 'Pouze manažer může měnit role.' }, { status: 403 })
    }

    if (user.id === memberId) {
      return NextResponse.json({ error: 'Nemůžete změnit vlastní roli.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const nextRole = typeof body?.role === 'string' ? body.role.trim() : ''

    if (!ALLOWED_ROLES.includes(nextRole)) {
      return NextResponse.json({ error: 'Neplatná role.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) {
      return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })
    }

    const supabase = await createAdminClient()

    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, role, organization')
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
      return NextResponse.json({ error: 'Manažerovi nelze změnit roli.' }, { status: 400 })
    }

    if (member.role === nextRole) {
      return NextResponse.json({ success: true, id: memberId, role: member.role })
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ role: nextRole })
      .eq('id', memberId)

    if (updateError) {
      return NextResponse.json({ error: 'Nepodařilo se změnit roli.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: memberId, role: nextRole })
  } catch (err) {
    console.error('Member PATCH error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const memberId = Number(id)

    if (!Number.isFinite(memberId) || memberId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID člena.' }, { status: 400 })
    }

    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const dateBirth = typeof body?.dateBirth === 'string' ? body.dateBirth.trim() : ''

    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
    if (!dateBirth || !DATE_RE.test(dateBirth)) {
      return NextResponse.json({ error: 'Neplatné datum narození.' }, { status: 400 })
    }
    if (new Date(dateBirth) >= new Date()) {
      return NextResponse.json({ error: 'Datum narození musí být v minulosti.' }, { status: 400 })
    }

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()

    const { data: member } = await supabase
      .from('users')
      .select('id, organization')
      .eq('id', memberId)
      .maybeSingle()

    if (!member || member.organization !== club.name) {
      return NextResponse.json({ error: 'Člen nebyl nalezen.' }, { status: 404 })
    }

    await supabase.from('users').update({ dateBirth: dateBirth }).eq('id', memberId)

    await fullResyncCategories(supabase, club.id, club.name)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Member PUT dateBirth error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

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
