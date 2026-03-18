import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getSupabaseServerConfig,
  getSupabaseServiceRoleKey,
} from '@/lib/supabase/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = getSupabaseServerConfig()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Volání ze Server Componentu - ignorovat
          }
        },
      },
    }
  )
}

export async function createAdminClient() {
  const cookieStore = await cookies()
  const { url } = getSupabaseServerConfig()
  const serviceRoleKey = getSupabaseServiceRoleKey()

  return createServerClient(
    url,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
