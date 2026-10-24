import { NextRequest, NextResponse } from 'next/server'
import { getClubForUser, getCurrentAppUser, type AppClub, type AppUser } from '@/lib/app-context'
import { getChildrenForParent, isParentOf, type ParentChild } from '@/lib/parent'

type MobileContext = {
  user: AppUser
  club: AppClub
  /** member whose events/attendance are shown: the user, or a parent's selected child */
  memberId: number | null
  children: ParentChild[]
}

/** Auth + club + subject resolution shared by /api/mobile routes. */
export async function requireMobileContext(request: NextRequest): Promise<MobileContext | NextResponse> {
  const user = await getCurrentAppUser()
  if (!user) return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 })
  if (user.banned) return NextResponse.json({ error: 'Účet byl zablokován.' }, { status: 403 })

  const club = await getClubForUser(user)
  if (!club) return NextResponse.json({ error: 'Účet není členem žádného klubu.' }, { status: 404 })

  if (user.role !== 'rodič') return { user, club, memberId: user.id, children: [] }

  const children = await getChildrenForParent(user.id)
  const requested = Number(request.nextUrl.searchParams.get('child'))
  let memberId: number | null = children[0]?.id ?? null
  if (requested && (await isParentOf(user.id, requested))) memberId = requested
  return { user, club, memberId, children }
}

export function publicUploadUrl(request: NextRequest, kind: 'clubs' | 'profiles', file: string | null | undefined) {
  if (!file) return null
  return `${request.nextUrl.origin}/uploads/${kind}/${encodeURIComponent(file)}`
}
