type SupabaseClientConfig = {
  url: string
  key: string
}

function isPlaceholder(value?: string) {
  return !value || /^YOUR_[A-Z0-9_]+$/i.test(value)
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function assertValidUrl(rawUrl: string, envName: string) {
  if (!isHttpUrl(rawUrl)) {
    throw new Error(
      `Invalid ${envName}: expected a valid HTTP/HTTPS URL, got "${rawUrl}". Check .env.local.`
    )
  }
}

function assertRequired(value: string | undefined, envName: string) {
  if (isPlaceholder(value)) {
    throw new Error(
      `Missing ${envName}. Set a real value in .env.local (not a placeholder like YOUR_...).`
    )
  }

  return value
}

export function getSupabaseBrowserConfig(): SupabaseClientConfig {
  const url = assertRequired(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
  const key = assertRequired(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )

  assertValidUrl(url, 'NEXT_PUBLIC_SUPABASE_URL')

  return { url, key }
}

export function getSupabaseServerConfig(): SupabaseClientConfig {
  const url = assertRequired(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)'
  )
  const key = assertRequired(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)'
  )

  assertValidUrl(url, 'NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL')

  return { url, key }
}

export function getSupabaseServiceRoleKey() {
  return assertRequired(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY')
}
