import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAppUser } from '@/lib/app-context'

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

    const formData = await request.formData()
    const file = formData.get('profile_picture')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Chybí soubor profile_picture.' }, { status: 400 })
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
    const fileName = `user_${user.id}_${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles')
    const absolutePath = path.join(uploadDir, fileName)

    await fs.mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(absolutePath, buffer)

    const supabase = await createAdminClient()
    const oldPicture = user.profile_picture

    const { error } = await supabase
      .from('users')
      .update({ profile_picture: fileName })
      .eq('id', user.id)

    if (error) {
      await fs.rm(absolutePath, { force: true })
      return NextResponse.json({ success: false, error: 'Nepodařilo se uložit profilovku do databáze.' }, { status: 500 })
    }

    if (oldPicture) {
      const oldPath = path.join(uploadDir, path.basename(oldPicture))
      await fs.rm(oldPath, { force: true })
    }

    return NextResponse.json({
      success: true,
      fileName,
      url: `/uploads/profiles/${fileName}`,
    })
  } catch (err) {
    console.error('Profile picture upload error:', err)
    return NextResponse.json({ success: false, error: 'Nastala chyba při nahrávání obrázku.' }, { status: 500 })
  }
}
