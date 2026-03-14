function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function normalizeEmailFrom(value: string) {
  const trimmed = value.trim().replace(/^"|"$/g, '')

  if (!trimmed) {
    return 'TeamPulse <onboarding@resend.dev>'
  }

  if (trimmed.includes('<') && trimmed.includes('>')) {
    return trimmed
  }

  const simpleEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (simpleEmailPattern.test(trimmed)) {
    return trimmed
  }

  const parts = trimmed.split(/\s+/)
  const last = parts[parts.length - 1]

  if (last && simpleEmailPattern.test(last) && parts.length > 1) {
    const name = parts.slice(0, -1).join(' ').trim()
    if (name) {
      return `${name} <${last}>`
    }
  }

  return trimmed
}

export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL

  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://teampulse.cfd'
  }

  if (process.env.VERCEL_URL) {
    return `https://${trimTrailingSlash(process.env.VERCEL_URL)}`
  }

  return 'http://localhost:3000'
}

export function getEmailFrom() {
  return normalizeEmailFrom(process.env.EMAIL_FROM || 'TeamPulse <onboarding@resend.dev>')
}

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || 'podpora@teampulse.cz'
}

export function getInviteAcceptUrl(token: string) {
  const base = process.env.INVITE_ACCEPT_URL_BASE || `${getAppBaseUrl()}/invite/accept`
  return `${trimTrailingSlash(base)}?token=${encodeURIComponent(token)}`
}

export function getPasswordResetUrl(token: string) {
  const base = process.env.PASSWORD_RESET_URL_BASE || `${getAppBaseUrl()}/password/reset`
  return `${trimTrailingSlash(base)}?token=${encodeURIComponent(token)}`
}

export function getEmailVerificationUrl(token: string) {
  const base = process.env.EMAIL_VERIFICATION_URL_BASE || `${getAppBaseUrl()}/verify-email`
  return `${trimTrailingSlash(base)}?token=${encodeURIComponent(token)}`
}
