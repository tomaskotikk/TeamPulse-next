'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ApplicationStatus } from '@/lib/onboarding/applications'
import type { ParentResolution } from '@/lib/onboarding/activation'
import styles from '../applications.module.css'

type Props = {
  applicationId: number
  status: ApplicationStatus
  minor: boolean
  parentEmail: string | null
  parentCheck: ParentResolution | null
}

type Feedback = { kind: 'ok' | 'error'; text: string } | null

export default function ApplicationActions({ applicationId, status, minor, parentEmail, parentCheck: initialCheck }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState(parentEmail ?? '')
  const [savedEmail, setSavedEmail] = useState(parentEmail ?? '')
  const [parentCheck, setParentCheck] = useState(initialCheck)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function call(action: string, url: string, body?: unknown, method = 'POST') {
    setBusy(action)
    setFeedback(null)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ kind: 'error', text: data.error ?? 'Akce se nezdařila.' })
        return null
      }
      return data
    } catch {
      setFeedback({ kind: 'error', text: 'Nastala chyba serveru.' })
      return null
    } finally {
      setBusy(null)
    }
  }

  async function saveEmail() {
    const data = await call('email', `/api/applications/${applicationId}`, { parentEmail: email }, 'PATCH')
    if (!data) return
    setSavedEmail(data.parentEmail)
    setEmail(data.parentEmail)
    setParentCheck(data.parentCheck)

    if (status === 'pending_parent') {
      const resent = await call('resend', `/api/applications/${applicationId}/resend-parent`)
      if (resent) setFeedback({ kind: 'ok', text: `E-mail uložen a registrace odeslána na ${data.parentEmail}.` })
      return
    }
    setFeedback({ kind: 'ok', text: 'E-mail rodiče byl upraven.' })
  }

  async function approve() {
    const data = await call('approve', `/api/applications/${applicationId}/approve`)
    if (!data) return
    router.refresh()
  }

  async function reject() {
    const data = await call('reject', `/api/applications/${applicationId}/reject`, { reason })
    if (!data) return
    router.refresh()
  }

  async function resend() {
    const data = await call('resend', `/api/applications/${applicationId}/resend-parent`)
    if (data) setFeedback({ kind: 'ok', text: `Registrace znovu odeslána na ${savedEmail}.` })
  }

  const emailDirty = email.trim().toLowerCase() !== savedEmail.toLowerCase()
  const blocked = parentCheck?.kind === 'conflict'

  return (
    <div>
      {minor && (
        <>
          <label htmlFor="parent-email" className="form-label">E-mail rodiče</label>
          <div className={styles.emailEdit}>
            <input
              id="parent-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="button" className="btn" onClick={saveEmail} disabled={!emailDirty || busy !== null}>
              {busy === 'email' ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>

          {parentCheck?.kind === 'existing' && (
            <p className={`${styles.notice} ${styles.noticeOk}`}>
              Rodič už v klubu má účet. Po schválení se hráč rovnou připojí k jeho účtu.
            </p>
          )}
          {parentCheck?.kind === 'new' && status === 'pending_manager' && (
            <p className={styles.notice}>Po schválení přijde rodiči e-mail s registrací. Účty se aktivují po jeho dokončení.</p>
          )}
          {blocked && <p className={`${styles.notice} ${styles.noticeWarn}`}>{parentCheck.reason}</p>}
          {status === 'pending_parent' && (
            <p className={styles.notice}>
              Čekáme, až rodič dokončí registraci přes odkaz v e-mailu.
            </p>
          )}
        </>
      )}

      {feedback && (
        <p className={`${styles.notice} ${feedback.kind === 'ok' ? styles.noticeOk : styles.noticeError}`} role="status">
          {feedback.text}
        </p>
      )}

      <div className={styles.actions} style={{ marginTop: 'var(--space-4)' }}>
        {status === 'pending_manager' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={approve}
            disabled={busy !== null || blocked || emailDirty}
            title={emailDirty ? 'Nejdřív uložte e-mail rodiče' : undefined}
          >
            {busy === 'approve' ? 'Schvaluji…' : minor && parentCheck?.kind === 'new' ? 'Schválit a poslat rodiči' : 'Schválit'}
          </button>
        )}
        {status === 'pending_parent' && (
          <button type="button" className="btn" onClick={resend} disabled={busy !== null}>
            {busy === 'resend' ? 'Odesílám…' : 'Znovu poslat e-mail rodiči'}
          </button>
        )}
        {!rejecting && (
          <button type="button" className="btn btn-danger" onClick={() => setRejecting(true)} disabled={busy !== null}>
            Zamítnout
          </button>
        )}
      </div>

      {rejecting && (
        <div className={styles.reject}>
          <label htmlFor="reject-reason" className="form-label">Důvod zamítnutí (pošle se hráči)</label>
          <textarea
            id="reject-reason"
            className="form-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <div className={styles.actions}>
            <button type="button" className="btn btn-danger" onClick={reject} disabled={busy !== null}>
              {busy === 'reject' ? 'Zamítám…' : 'Potvrdit zamítnutí'}
            </button>
            <button type="button" className="btn" onClick={() => setRejecting(false)} disabled={busy !== null}>
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
