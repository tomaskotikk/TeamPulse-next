import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

function isManager(role: string) {
  return role === 'manažer'
}

function canReadMembers(role: string) {
  return role === 'manažer' || role === 'trenér'
}

// GET /api/categories/members?category_id=X
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (!canReadMembers(user.role)) return NextResponse.json({ error: 'Pouze manažer nebo trenér.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const url = new URL(request.url)
    const categoryId = Number(url.searchParams.get('category_id'))
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID kategorie.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Verify category belongs to this club
    const { data: cat } = await supabase
      .from('club_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('club_id', club.id)
      .maybeSingle()

    if (!cat) return NextResponse.json({ error: 'Kategorie nebyla nalezena.' }, { status: 404 })

    const { data: members, error } = await supabase
      .from('category_members')
      .select('id, category_id, user_id, manual_override, excluded, created_at, users(id, first_name, last_name, profile_picture, role, dateBirth)')
      .eq('category_id', categoryId)
      .eq('excluded', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Category members GET error:', error)
      return NextResponse.json({ error: 'Nepodařilo se načíst členy.' }, { status: 500 })
    }

    // Also load all club members for the "add member" picker
    const { data: allMembers } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture, role, dateBirth')
      .eq('organization', club.name)
      .order('first_name', { ascending: true })

    return NextResponse.json({ members: members ?? [], allClubMembers: allMembers ?? [] })
  } catch (err) {
    console.error('Category members GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

// POST /api/categories/members — add member manually
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (!isManager(user.role)) return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const categoryId = Number(body.category_id)
    const userId = Number(body.user_id)

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID kategorie.' }, { status: 400 })
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID uživatele.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: cat } = await supabase
      .from('club_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('club_id', club.id)
      .maybeSingle()

    if (!cat) return NextResponse.json({ error: 'Kategorie nebyla nalezena.' }, { status: 404 })

    const { error } = await supabase
      .from('category_members')
      .upsert(
        { category_id: categoryId, user_id: userId, manual_override: true, excluded: false },
        { onConflict: 'category_id,user_id' },
      )

    if (error) {
      console.error('Category members POST error:', error)
      return NextResponse.json({ error: 'Nepodařilo se přidat člena.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Category members POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

// DELETE /api/categories/members?category_id=X&user_id=Y
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })
    if (!isManager(user.role)) return NextResponse.json({ error: 'Pouze manažer.' }, { status: 403 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 404 })

    const url = new URL(request.url)
    const categoryId = Number(url.searchParams.get('category_id'))
    const userId = Number(url.searchParams.get('user_id'))

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID kategorie.' }, { status: 400 })
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Neplatné ID uživatele.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: cat } = await supabase
      .from('club_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('club_id', club.id)
      .maybeSingle()

    if (!cat) return NextResponse.json({ error: 'Kategorie nebyla nalezena.' }, { status: 404 })

    // Mark as excluded (keeps manual_override=true so auto-assign won't re-add)
    const { error } = await supabase
      .from('category_members')
      .upsert(
        { category_id: categoryId, user_id: userId, manual_override: true, excluded: true },
        { onConflict: 'category_id,user_id' },
      )

    if (error) {
      console.error('Category members DELETE error:', error)
      return NextResponse.json({ error: 'Nepodařilo se odebrat člena.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Category members DELETE error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
