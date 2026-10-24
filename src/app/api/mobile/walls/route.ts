import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireMobileContext } from '@/lib/mobile-api'
import { getAccessibleCategories } from '@/lib/walls'

type Author = { first_name: string | null; last_name: string | null }

/** Wall list: club wall + accessible category walls with member counts and last post. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireMobileContext(request)
    if (ctx instanceof NextResponse) return ctx

    const categories = await getAccessibleCategories(ctx.user, ctx.club, ctx.memberId)
    const supabase = await createAdminClient()
    const ids = categories.map((c) => c.id)

    const [{ data: members }, { data: posts }, { data: lastChat }] = await Promise.all([
      ids.length
        ? supabase.from('category_members').select('category_id').in('category_id', ids).eq('excluded', false)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from('category_posts')
            .select('category_id, message, created_at, users(first_name, last_name)')
            .in('category_id', ids)
            .order('created_at', { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] }),
      supabase
        .from('chat_messages')
        .select('message, created_at, users(first_name, last_name)')
        .eq('club_id', ctx.club.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const counts = new Map<number, number>()
    for (const m of (members ?? []) as Array<{ category_id: number }>) counts.set(m.category_id, (counts.get(m.category_id) ?? 0) + 1)

    const lastByCat = new Map<number, { message: string; created_at: string; author: string }>()
    for (const p of (posts ?? []) as Array<{ category_id: number; message: string; created_at: string; users: Author | Author[] | null }>) {
      if (lastByCat.has(p.category_id)) continue
      const u = Array.isArray(p.users) ? p.users[0] : p.users
      lastByCat.set(p.category_id, { message: p.message, created_at: p.created_at, author: `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() })
    }

    const chatAuthor = lastChat ? ((Array.isArray(lastChat.users) ? lastChat.users[0] : lastChat.users) as Author | null) : null

    return NextResponse.json({
      club: {
        name: ctx.club.name,
        last: lastChat
          ? { message: lastChat.message, created_at: lastChat.created_at, author: `${chatAuthor?.first_name ?? ''} ${chatAuthor?.last_name ?? ''}`.trim() }
          : null,
      },
      categories: categories.map((c) => ({ ...c, memberCount: counts.get(c.id) ?? 0, last: lastByCat.get(c.id) ?? null })),
    })
  } catch (err) {
    console.error('Mobile walls error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
