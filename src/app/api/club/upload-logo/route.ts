import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/server'
import { getClubForUser, getCurrentAppUser } from '@/lib/app-context'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
])

const MAX_SIZE = 5 * 1024 * 1024

function extFromType(type: string) {
  switch (type) {
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/jpg':
    case 'image/jpeg':
    default:
      return 'jpg'
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nejste přihlášeni.' }, { status: 401 })
    }

    if (user.role !== 'manažer') {
      return NextResponse.json({ success: false, error: 'Nemáte oprávnění měnit logo klubu.' }, { status: 403 })
    }

    const club = await getClubForUser(user)
    if (!club || club.owner_user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Klub nebyl nalezen.' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('club_logo')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Chybí soubor club_logo.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Povolené jsou pouze obrázky (JPG, PNG, GIF, WEBP).' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Soubor je příliš velký (max 5MB).' }, { status: 400 })
    }

    const ext = extFromType(file.type)
    const fileName = `club_${club.id}_${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'clubs')
    const absolutePath = path.join(uploadDir, fileName)

    await fs.mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(absolutePath, buffer)

    const supabase = await createAdminClient()
    const oldLogo = club.logo

    const { error } = await supabase
      .from('clubs')
      .update({ logo: fileName })
      .eq('id', club.id)

    if (error) {
      await fs.rm(absolutePath, { force: true })
      return NextResponse.json({ success: false, error: 'Nepodařilo se uložit logo do databáze.' }, { status: 500 })
    }

    if (oldLogo) {
      const oldPath = path.join(uploadDir, path.basename(oldLogo))
      await fs.rm(oldPath, { force: true })
    }

    return NextResponse.json({
      success: true,
      fileName,
      url: `/uploads/clubs/${fileName}`,
    })
  } catch (err) {
    console.error('Club logo upload error:', err)
    return NextResponse.json({ success: false, error: 'Nastala chyba při nahrávání loga.' }, { status: 500 })
  }
}
