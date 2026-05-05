import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAppUser } from '@/lib/app-context'

export async function GET() {
  try {
    const user = await getCurrentAppUser()
    if (!user) return NextResponse.json({ categories: [], age: null })

    const supabase = await createAdminClient()

    // Get user's dateBirth
    const { data: userData } = await supabase
      .from('users')
      .select('dateBirth')
      .eq('id', user.id)
      .maybeSingle()

    let age: number | null = null
    if (userData?.dateBirth) {
      const birth = new Date(userData.dateBirth)
      const now = new Date()
      age = now.getFullYear() - birth.getFullYear()
      const hadBirthday =
        now.getMonth() > birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
      if (!hadBirthday) age -= 1
    }

    const { data: memberships } = await supabase
      .from('category_members')
      .select('club_categories(id, name, color)')
      .eq('user_id', user.id)
      .eq('excluded', false)

    type CatRow = { id: number; name: string; color: string }
    const categories = (memberships ?? [])
      .map((m) => {
        const cat = m.club_categories as CatRow | CatRow[] | null
        if (!cat || Array.isArray(cat)) return null
        return { id: cat.id, name: cat.name, color: cat.color }
      })
      .filter((c): c is CatRow => c !== null)

    return NextResponse.json({ categories, age })
  } catch (err) {
    console.error('me/categories error:', err)
    return NextResponse.json({ categories: [], age: null })
  }
}
