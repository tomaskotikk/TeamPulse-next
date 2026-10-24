import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { canManageAttendance } from '@/lib/attendance'
import { publicUploadUrl, requireMobileContext } from '@/lib/mobile-api'
import { getAccessibleCategory } from '@/lib/walls'

type Params = { params: Promise<{ id: string }> }
type Author = { first_name: string | null; last_name: string | null; role: string | null; profile_picture: string | null }

async function resolve(request: NextRequest, params: Params['params']) {
  const ctx = await requireMobileContext(request)
  if (ctx instanceof NextResponse) return { error: ctx }
  const categoryId = Number.parseInt((await params).id, 10)
  const category = Number.isInteger(categoryId) ? await getAccessibleCategory(ctx.user, ctx.club, ctx.memberId, categoryId) : null
  if (!category) return { error: NextResponse.json({ error: 'Zeď nebyla nalezena.' }, { status: 404 }) }
  return { ctx, category }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const r = await resolve(request, params)
    if ('error' in r) return r.error

    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('category_posts')
      .select('id, user_id, message, created_at, users(first_name, last_name, role, profile_picture)')
      .eq('category_id', r.category.id)
      .order('created_at', { ascending: false })
      .limit(150)

    const posts = ((data ?? []) as Array<{ id: number; user_id: number; message: string; created_at: string; users: Author | Author[] | null }>)
      .reverse()
      .map((p) => {
        const u = Array.isArray(p.users) ? p.users[0] : p.users
        return {
          id: p.id,
          user_id: p.user_id,
          message: p.message,
          created_at: p.created_at,
          first_name: u?.first_name ?? '',
          last_name: u?.last_name ?? '',
          role: u?.role ?? '',
          avatar: publicUploadUrl(request, 'profiles', u?.profile_picture),
          canDelete: p.user_id === r.ctx.user.id || canManageAttendance(r.ctx.user),
        }
      })

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('Wall posts GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const r = await resolve(request, params)
    if ('error' in r) return r.error

    const body = (await request.json().catch(() => ({}))) as { message?: unknown }
    const message = String(body.message ?? '').trim().slice(0, 4000)
    if (!message) return NextResponse.json({ error: 'Zpráva je prázdná.' }, { status: 400 })

    const supabase = await createAdminClient()
    const { error } = await supabase.from('category_posts').insert({ category_id: r.category.id, user_id: r.ctx.user.id, message })
    if (error) {
      console.error('Wall post insert error:', error)
      return NextResponse.json({ error: 'Příspěvek se nepodařilo odeslat.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Wall posts POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const r = await resolve(request, params)
    if ('error' in r) return r.error

    const postId = Number(request.nextUrl.searchParams.get('post'))
    const supabase = await createAdminClient()
    const { data: post } = await supabase.from('category_posts').select('id, user_id').eq('id', postId).eq('category_id', r.category.id).maybeSingle()
    if (!post) return NextResponse.json({ error: 'Příspěvek nebyl nalezen.' }, { status: 404 })
    if (post.user_id !== r.ctx.user.id && !canManageAttendance(r.ctx.user)) {
      return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 403 })
    }
    await supabase.from('category_posts').delete().eq('id', postId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Wall posts DELETE error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
