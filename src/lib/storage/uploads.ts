import fs from 'node:fs/promises'
import path from 'node:path'

export const PROFILE_IMAGES_BUCKET =
  process.env.SUPABASE_STORAGE_PROFILE_BUCKET?.trim() || 'profiles'

export const CLUB_LOGOS_BUCKET =
  process.env.SUPABASE_STORAGE_CLUB_BUCKET?.trim() || 'clubs'

function contentTypeFromFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()

  switch (ext) {
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg'
  }
}

export function sanitizeUploadedObjectName(fileName: string) {
  return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadImageToBucket(params: {
  supabase: {
    storage: {
      from: (bucket: string) => { upload: Function }
      createBucket: Function
    }
  }
  bucket: string
  objectName: string
  buffer: Buffer
  contentType: string
}) {
  const { supabase, bucket, objectName, buffer, contentType } = params

  let uploadResult = await supabase
    .storage
    .from(bucket)
    .upload(objectName, buffer, { contentType, upsert: true })

  if (uploadResult.error && /bucket.*not.*found/i.test(uploadResult.error.message)) {
    const { error: createError } = await supabase.storage.createBucket(bucket, { public: false })

    if (createError && !/already exists/i.test(createError.message)) {
      return uploadResult
    }

    uploadResult = await supabase
      .storage
      .from(bucket)
      .upload(objectName, buffer, { contentType, upsert: true })
  }

  return uploadResult
}

export async function removeImageFromBucket(params: {
  supabase: { storage: { from: (bucket: string) => { remove: Function } } }
  bucket: string
  objectName: string | null | undefined
}) {
  const { supabase, bucket, objectName } = params

  if (!objectName) return

  const safeName = sanitizeUploadedObjectName(objectName)
  await supabase.storage.from(bucket).remove([safeName])
}

export async function fetchUploadedImage(params: {
  supabase: { storage: { from: (bucket: string) => { download: Function } } }
  bucket: string
  objectName: string
  fallbackDir: string
}) {
  const { supabase, bucket, objectName, fallbackDir } = params
  const safeName = sanitizeUploadedObjectName(objectName)

  const { data, error } = await supabase.storage.from(bucket).download(safeName)

  if (!error && data) {
    const arrayBuffer = await data.arrayBuffer()
    return {
      data: new Uint8Array(arrayBuffer),
      contentType: data.type || contentTypeFromFileName(safeName),
    }
  }

  const localPath = path.join(process.cwd(), 'public', 'uploads', fallbackDir, safeName)
  const localBuffer = await fs.readFile(localPath).catch(() => null)

  if (!localBuffer) {
    return null
  }

  return {
    data: new Uint8Array(localBuffer),
    contentType: contentTypeFromFileName(safeName),
  }
}
