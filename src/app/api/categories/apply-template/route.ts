import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'
import { getTemplateByName } from '@/lib/category-templates'
import { fullResyncCategories } from '@/app/api/categories/route'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (user.role !== 'manažer') return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const templateName = String(body.template ?? '').trim()

    const template = getTemplateByName(templateName)
    if (!template) return NextResponse.json({ error: 'Šablona nebyla nalezena.' }, { status: 404 })

    const supabase = await createAdminClient()

    // Get next sort_order offset
    const { data: last } = await supabase
      .from('club_categories')
      .select('sort_order')
      .eq('club_id', club.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const baseOrder = (last?.sort_order ?? -1) + 1

    const rows = template.categories.map((cat, i) => ({
      club_id: club.id,
      name: cat.name,
      birth_year_from: cat.birth_year_from,
      birth_year_to: cat.birth_year_to,
      color: cat.color,
      sort_order: baseOrder + i,
    }))

    const { data: created, error } = await supabase
      .from('club_categories')
      .insert(rows)
      .select('id, club_id, name, birth_year_from, birth_year_to, color, sort_order, created_at')

    if (error || !created) {
      console.error('Apply template error:', error)
      return NextResponse.json({ error: 'Nepodařilo se aplikovat šablonu.' }, { status: 500 })
    }

    await fullResyncCategories(supabase, club.id, club.name)

    return NextResponse.json({ success: true, categories: created })
  } catch (err) {
    console.error('Apply template error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
