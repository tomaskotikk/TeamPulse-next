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

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: recipients,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  })

  if (error) {
    throw new Error(error.message || 'Nepodařilo se odeslat email přes Resend.')
  }
}
