import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

type ChatMessageRow = {
  id: number
  user_id: number
  message: string
  created_at: string
  users:
    | {
        first_name: string | null
        last_name: string | null
        role: string | null
        profile_picture: string | null
      }
    | {
        first_name: string | null
        last_name: string | null
        role: string | null
        profile_picture: string | null
      }[]
    | null
}

function normalizeJoinedUser(row: ChatMessageRow) {
  if (Array.isArray(row.users)) {
    return row.users[0] ?? null
  }

  return row.users
}

export async function GET() {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ messages: [] })

    const supabase = await createAdminClient()
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, user_id, message, created_at, users(first_name, last_name, role, profile_picture)')
      .eq('club_id', club.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Nepodařilo se načíst zprávy.' }, { status: 500 })
    }

    const normalized = ((messages ?? []) as ChatMessageRow[]).map((row) => {
      const joinedUser = normalizeJoinedUser(row)

      return {
      id: row.id,
      user_id: row.user_id,
      message: row.message,
      created_at: row.created_at,
      first_name: joinedUser?.first_name ?? '',
      last_name: joinedUser?.last_name ?? '',
      role: joinedUser?.role ?? '',
      profile_picture: joinedUser?.profile_picture ?? null,
      }
    })

    return NextResponse.json({ messages: normalized })
  } catch (err) {
    console.error('Chat GET error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 })

    const club = await getClubForUser(user)
    if (!club) return NextResponse.json({ error: 'Klub nebyl nalezen.' }, { status: 400 })

    const { message } = await request.json()
    const trimmed = (message ?? '').trim()

    if (!trimmed) {
      return NextResponse.json({ error: 'Zpráva je prázdná.' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        club_id: club.id,
        user_id: user.id,
        message: trimmed,
      })
      .select('id, user_id, message, created_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Nepodařilo se odeslat zprávu.' }, { status: 500 })
    }

    return NextResponse.json({
      message: {
        ...data,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_picture: user.profile_picture,
      },
    })
  } catch (err) {
    console.error('Chat POST error:', err)
    return NextResponse.json({ error: 'Nastala chyba serveru.' }, { status: 500 })
  }
}
