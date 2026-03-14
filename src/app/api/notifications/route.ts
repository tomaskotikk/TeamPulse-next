import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAppUser } from '@/lib/app-context'

// GET /api/notifications – returns recent notifications for the current user
export async function GET() {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, actor_id, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Notifications GET error:', error)
      return NextResponse.json({ error: 'Nepodařilo se načíst notifikace.' }, { status: 500 })
    }

    const unreadCount = (data ?? []).filter((n) => !n.read_at).length

    return NextResponse.json({
      userId: user.id,
      notifications: data ?? [],
      unreadCount,
    })
  } catch (err) {
    console.error('Notifications GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

// POST /api/notifications/read-all – marks all notifications as read for the current user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const action = body?.action as string | undefined

    const supabase = await createAdminClient()

    if (action === 'read-all') {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      return NextResponse.json({ success: true })
    }

    if (action === 'read-one' && body?.id) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', Number(body.id))
        .eq('user_id', user.id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Neznámá akce.' }, { status: 400 })
  } catch (err) {
    console.error('Notifications POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
