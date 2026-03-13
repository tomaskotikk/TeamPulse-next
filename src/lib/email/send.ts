import { Resend } from 'resend'
import { getEmailFrom } from '@/lib/email/config'

type SendTransactionalEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string | string[]
}

let resendClient: Resend | null = null

export class EmailSendError extends Error {
  details?: string

  constructor(message: string, details?: string) {
    super(message)
    this.name = 'EmailSendError'
    this.details = details
  }
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }

  return resendClient
}

export function isEmailSendingConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const resend = getResendClient()
  const recipients = Array.isArray(input.to) ? input.to : [input.to]
  const from = getEmailFrom()

  const { error } = await resend.emails.send({
    from,
    to: recipients,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  })

  if (error) {
    const raw = error as unknown as {
      name?: string
      statusCode?: number
      message?: string
      error?: string
    }

    const details = [
      raw.name ? `name=${raw.name}` : null,
      typeof raw.statusCode === 'number' ? `status=${raw.statusCode}` : null,
      raw.error ? `error=${raw.error}` : null,
      raw.message ? `message=${raw.message}` : null,
      `from=${from}`,
    ]
      .filter(Boolean)
      .join(' | ')

    throw new EmailSendError(
      raw.message || 'Nepodařilo se odeslat email přes Resend.',
      details || 'No additional provider details.'
    )
  }
}
