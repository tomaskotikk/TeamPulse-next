import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  CLUB_LOGOS_BUCKET,
  fetchUploadedImage,
  sanitizeUploadedObjectName,
} from '@/lib/storage/uploads'

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await context.params
    const objectName = sanitizeUploadedObjectName(file)

    const supabase = await createAdminClient()
    const image = await fetchUploadedImage({
      supabase,
      bucket: CLUB_LOGOS_BUCKET,
      objectName,
      fallbackDir: 'clubs',
    })

    if (!image) {
      return new NextResponse('Not Found', { status: 404 })
    }

    return new NextResponse(image.data, {
      status: 200,
      headers: {
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('Club logo GET error:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
