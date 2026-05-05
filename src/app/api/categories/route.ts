import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import { CATEGORY_TEMPLATES } from '@/lib/category-templates'

function isManager(role: string) {
  return role === 'manažer'
}

export async function GET() {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const supabase = await createAdminClient()

    const { data: categories, error } = await supabase
      .from('club_categories')
      .select('id, club_id, name, birth_year_from, birth_year_to, color, sort_order, created_at')
      .eq('club_id', club.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Categories GET error:', error)
      return NextResponse.json({ error: 'Nepodařilo se načíst kategorie.' }, { status: 500 })
    }

    // Get member counts
    const catIds = (categories ?? []).map((c) => c.id)
    let memberCounts: Record<number, number> = {}

    if (catIds.length > 0) {
      const { data: counts } = await supabase
        .from('category_members')
        .select('category_id')
        .in('category_id', catIds)
        .eq('excluded', false)

      if (counts) {
        for (const row of counts) {
          memberCounts[row.category_id] = (memberCounts[row.category_id] ?? 0) + 1
        }
      }
    }

    const result = (categories ?? []).map((c) => ({
      ...c,
      member_count: memberCounts[c.id] ?? 0,
    }))

    return NextResponse.json({ categories: result, templates: CATEGORY_TEMPLATES })
  } catch (err) {
    console.error('Categories GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (!isManager(user.role)) return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const name = String(body.name ?? '').trim()
    const color = String(body.color ?? '#6366f1').trim()
    const birthYearFrom = body.birth_year_from != null ? Number(body.birth_year_from) : null
    const birthYearTo = body.birth_year_to != null ? Number(body.birth_year_to) : null

    if (!name) return NextResponse.json({ error: 'Název kategorie je povinný.' }, { status: 400 })
    if (name.length > 60) return NextResponse.json({ error: 'Název je příliš dlouhý.' }, { status: 400 })

    const supabase = await createAdminClient()

    // Get next sort_order
    const { data: last } = await supabase
      .from('club_categories')
      .select('sort_order')
      .eq('club_id', club.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (last?.sort_order ?? -1) + 1

    const { data: created, error } = await supabase
      .from('club_categories')
      .insert({
        club_id: club.id,
        name,
        birth_year_from: birthYearFrom,
        birth_year_to: birthYearTo,
        color,
        sort_order: sortOrder,
      })
      .select('id, club_id, name, birth_year_from, birth_year_to, color, sort_order, created_at')
      .single()

    if (error || !created) {
      console.error('Categories POST error:', error)
      return NextResponse.json({ error: 'Nepodařilo se vytvořit kategorii.' }, { status: 500 })
    }

    await fullResyncCategories(supabase, club.id, club.name)

    return NextResponse.json({ success: true, category: { ...created, member_count: 0 } })
  } catch (err) {
    console.error('Categories POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (!isManager(user.role)) return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const id = Number(body.id)
    const name = String(body.name ?? '').trim()
    const color = String(body.color ?? '#6366f1').trim()
    const birthYearFrom = body.birth_year_from != null ? Number(body.birth_year_from) : null
    const birthYearTo = body.birth_year_to != null ? Number(body.birth_year_to) : null

    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Název kategorie je povinný.' }, { status: 400 })

    const supabase = await createAdminClient()

    const { data: updated, error } = await supabase
      .from('club_categories')
      .update({ name, birth_year_from: birthYearFrom, birth_year_to: birthYearTo, color })
      .eq('id', id)
      .eq('club_id', club.id)
      .select('id, club_id, name, birth_year_from, birth_year_to, color, sort_order, created_at')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: 'Nepodařilo se upravit kategorii.' }, { status: 500 })
    }

    await fullResyncCategories(supabase, club.id, club.name)

    return NextResponse.json({ success: true, category: updated })
  } catch (err) {
    console.error('Categories PATCH error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (!isManager(user.role)) return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 })

    const supabase = await createAdminClient()
    const { error } = await supabase
      .from('club_categories')
      .delete()
      .eq('id', id)
      .eq('club_id', club.id)

    if (error) {
      console.error('Categories DELETE error:', error)
      return NextResponse.json({ error: 'Nepodařilo se smazat kategorii.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Categories DELETE error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

// Full resync: each member gets exactly ONE auto-assigned category (first match by sort_order).
// Manual overrides (manual_override=true) are never touched.
export async function fullResyncCategories(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  clubId: number,
  clubName: string,
) {
  // Load all club categories ordered by sort_order
  const { data: cats } = await supabase
    .from('club_categories')
    .select('id, birth_year_from, birth_year_to, sort_order')
    .eq('club_id', clubId)
    .order('sort_order', { ascending: true })

  if (!cats || cats.length === 0) return

  // Load all members with dateBirth
  const { data: members } = await supabase
    .from('users')
    .select('id, dateBirth')
    .eq('organization', clubName)
    .not('dateBirth', 'is', null)

  if (!members || members.length === 0) return

  // Remove all existing auto-assigned (non-manual) entries for these categories
  const catIds = cats.map((c: { id: number }) => c.id)
  await supabase
    .from('category_members')
    .delete()
    .in('category_id', catIds)
    .eq('manual_override', false)

  // For each member, find first matching category by sort_order
  const rows: Array<{ category_id: number; user_id: number; manual_override: boolean; excluded: boolean }> = []

  for (const m of members as Array<{ id: number; dateBirth: string }>) {
    const birthYear = new Date(m.dateBirth).getFullYear()

    for (const cat of cats as Array<{ id: number; birth_year_from: number | null; birth_year_to: number | null }>) {
      const fromOk = cat.birth_year_from == null || birthYear >= cat.birth_year_from
      const toOk = cat.birth_year_to == null || birthYear <= cat.birth_year_to

      if (fromOk && toOk) {
        rows.push({ category_id: cat.id, user_id: m.id, manual_override: false, excluded: false })
        break // exactly one category per member
      }
    }
  }

  if (rows.length > 0) {
    await supabase
      .from('category_members')
      .upsert(rows, { onConflict: 'category_id,user_id' })
  }
}
