function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

export function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL

  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (process.env.VERCEL_URL) {
    return `https://${trimTrailingSlash(process.env.VERCEL_URL)}`
  }

  return 'http://localhost:3000'
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM || 'TeamPulse <onboarding@resend.dev>'
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
