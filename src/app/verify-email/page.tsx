'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthShowcaseLayout from '@/components/AuthShowcaseLayout'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams])

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Ověřujeme váš e-mail…')

  useEffect(() => {
    let cancelled = false

    async function verify() {
      if (!token) {
        setStatus('error')
        setMessage('Neplatný verifikační odkaz.')
        return
      }

      try {
        const res = await fetch('/api/club/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          setStatus('error')
          setMessage(data.error ?? 'Ověření e-mailu se nepodařilo.')
          return
        }

        setStatus('success')
        setMessage('E-mail byl úspěšně ověřen. Žádost o klub nyní čeká na schválení administrátorem. Přesměrováváme vás…')

        window.setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1700)
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Nastala chyba serveru. Zkuste to prosím znovu.')
        }
      }
    }

    verify()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <AuthShowcaseLayout title="Ověření e-mailu" subtitle="Potvrzujeme registraci vašeho klubu v TeamPulse">
      <div className="auth-form-panel">
        <h2>Ověření e-mailu</h2>
        <p className="auth-note">Dokončujeme aktivaci účtu a klubu.</p>

        <div className={`auth-feedback ${status === 'error' ? 'error' : 'success'}`}>
          {message}
        </div>

        {status === 'error' && (
          <p className="auth-switch">
            <Link href="/zalozit-klub">Zkusit registraci znovu</Link>
            {' · '}
            <Link href="/login">Přejít na přihlášení</Link>
          </p>
        )}
      </div>
    </AuthShowcaseLayout>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card">Načítání…</div></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
