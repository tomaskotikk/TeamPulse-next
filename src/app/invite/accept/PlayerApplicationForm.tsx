'use client'

import { FormEvent, useState } from 'react'
import {
  MIN_PASSWORD_LENGTH,
  isMinor,
  isValidEmail,
  isValidPhone,
  isValidZip,
  validatePassword,
} from '@/lib/onboarding/validation'

type Props = {
  token: string
  email: string
  clubName: string
}

type FormState = {
  firstName: string
  lastName: string
  dateBirth: string
  phone: string
  password: string
  passwordConfirm: string
  street: string
  city: string
  zip: string
  healthInsurance: string
  healthNotes: string
  emergencyName: string
  emergencyPhone: string
  parentFirstName: string
  parentLastName: string
  parentEmail: string
  parentPhone: string
  consentGdpr: boolean
  consentPhotos: boolean
}

const INITIAL: FormState = {
  firstName: '',
  lastName: '',
  dateBirth: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  street: '',
  city: '',
  zip: '',
  healthInsurance: '',
  healthNotes: '',
  emergencyName: '',
  emergencyPhone: '',
  parentFirstName: '',
  parentLastName: '',
  parentEmail: '',
  parentPhone: '',
  consentGdpr: false,
  consentPhotos: false,
}

const STEPS = ['Osobní údaje', 'Adresa a zdraví', 'Kontakty a souhlasy']

const INSURERS = [
  'VZP – Všeobecná zdravotní pojišťovna (111)',
  'VoZP – Vojenská zdravotní pojišťovna (201)',
  'ČPZP – Česká průmyslová zdravotní pojišťovna (205)',
  'OZP – Oborová zdravotní pojišťovna (207)',
  'ZPŠ – Zaměstnanecká pojišťovna Škoda (209)',
  'ZPMV – Zdravotní pojišťovna ministerstva vnitra (211)',
  'RBP – Revírní bratrská pokladna (213)',
  'Jiná / zahraniční',
]

export default function PlayerApplicationForm({ token, email, clubName }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ minor: boolean } | null>(null)

  const minor = form.dateBirth ? isMinor(form.dateBirth) : false

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) return 'Vyplňte jméno a příjmení.'
      if (!form.dateBirth) return 'Vyplňte datum narození.'
      if (!minor && !form.phone.trim()) return 'Vyplňte telefon.'
      if (form.phone.trim() && !isValidPhone(form.phone.trim())) return 'Neplatný formát telefonu.'
      return validatePassword(form.password, form.passwordConfirm)
    }
    if (index === 1) {
      if (!form.street.trim() || !form.city.trim() || !form.zip.trim()) return 'Vyplňte celou adresu.'
      if (!isValidZip(form.zip.trim())) return 'PSČ musí mít 5 číslic.'
      if (!form.healthInsurance) return 'Vyberte zdravotní pojišťovnu.'
      return null
    }
    if (minor) {
      if (!form.parentFirstName.trim() || !form.parentLastName.trim()) return 'Vyplňte jméno a příjmení rodiče.'
      if (!isValidEmail(form.parentEmail.trim())) return 'Vyplňte platný e-mail rodiče.'
      if (form.parentEmail.trim().toLowerCase() === email.toLowerCase()) return 'E-mail rodiče musí být jiný než váš.'
      if (!isValidPhone(form.parentPhone.trim())) return 'Vyplňte platný telefon rodiče.'
    } else {
      if (!form.emergencyName.trim()) return 'Vyplňte jméno nouzového kontaktu.'
      if (!isValidPhone(form.emergencyPhone.trim())) return 'Vyplňte platný telefon nouzového kontaktu.'
    }
    if (!form.consentGdpr) return 'Pro registraci je nutný souhlas se zpracováním osobních údajů.'
    return null
  }

  function next() {
    const stepError = validateStep(step)
    setError(stepError)
    if (!stepError) setStep((s) => s + 1)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (step < STEPS.length - 1) {
      next()
      return
    }

    const stepError = validateStep(step)
    setError(stepError)
    if (stepError) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Přihlášku se nepodařilo odeslat.')
        return
      }
      setDone({ minor: Boolean(data.minor) })
    } catch {
      setError('Nastala chyba serveru. Zkuste to znovu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="onb-done">
        <h3>Přihláška odeslána</h3>
        <p>
          Děkujeme. Klub <strong>{clubName}</strong> nyní zkontroluje vaše údaje.
        </p>
        {done.minor ? (
          <p>
            Po schválení přijde e-mail rodiči na <strong>{form.parentEmail}</strong>. Účet se aktivuje,
            jakmile rodič dokončí registraci.
          </p>
        ) : (
          <p>Jakmile klub přihlášku schválí, přijde vám e-mail a můžete se přihlásit.</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ol className="onb-steps" aria-label="Kroky registrace">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={i === step ? 'is-current' : i < step ? 'is-done' : undefined}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="onb-step-num">{i + 1}</span>
            <span className="onb-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {error && <div className="auth-feedback error" role="alert">{error}</div>}

      {step === 0 && (
        <fieldset className="onb-fieldset">
          <legend>Osobní údaje</legend>
          <div className="auth-two-columns">
            <Field id="firstName" label="Jméno" required value={form.firstName} onChange={(v) => set('firstName', v)} autoComplete="given-name" />
            <Field id="lastName" label="Příjmení" required value={form.lastName} onChange={(v) => set('lastName', v)} autoComplete="family-name" />
          </div>
          <div className="auth-two-columns">
            <Field
              id="dateBirth"
              label="Datum narození"
              type="date"
              required
              value={form.dateBirth}
              onChange={(v) => set('dateBirth', v)}
              max={new Date().toISOString().split('T')[0]}
            />
            <Field
              id="phone"
              label="Telefon"
              type="tel"
              required={!minor}
              value={form.phone}
              onChange={(v) => set('phone', v)}
              placeholder="+420 777 123 456"
              autoComplete="tel"
            />
          </div>
          <div className="form-group">
            <span className="form-label">E-mail</span>
            <div className="onb-readonly">{email}</div>
          </div>
          <div className="auth-two-columns">
            <Field
              id="password"
              label="Heslo"
              type="password"
              required
              value={form.password}
              onChange={(v) => set('password', v)}
              autoComplete="new-password"
              help={`Alespoň ${MIN_PASSWORD_LENGTH} znaků.`}
            />
            <Field
              id="passwordConfirm"
              label="Potvrzení hesla"
              type="password"
              required
              value={form.passwordConfirm}
              onChange={(v) => set('passwordConfirm', v)}
              autoComplete="new-password"
            />
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="onb-fieldset">
          <legend>Adresa bydliště</legend>
          <Field id="street" label="Ulice a číslo popisné" required value={form.street} onChange={(v) => set('street', v)} autoComplete="street-address" />
          <div className="auth-two-columns">
            <Field id="city" label="Město" required value={form.city} onChange={(v) => set('city', v)} autoComplete="address-level2" />
            <Field id="zip" label="PSČ" required value={form.zip} onChange={(v) => set('zip', v)} placeholder="110 00" autoComplete="postal-code" />
          </div>

          <h4 className="onb-sublegend">Zdravotní údaje</h4>
          <div className="form-group">
            <label htmlFor="healthInsurance" className="form-label">Zdravotní pojišťovna *</label>
            <select
              id="healthInsurance"
              className="form-select"
              value={form.healthInsurance}
              onChange={(e) => set('healthInsurance', e.target.value)}
              required
            >
              <option value="">Vyberte…</option>
              {INSURERS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="healthNotes" className="form-label">Alergie, zdravotní omezení, léky</label>
            <textarea
              id="healthNotes"
              className="form-input onb-textarea"
              rows={3}
              value={form.healthNotes}
              onChange={(e) => set('healthNotes', e.target.value)}
              placeholder="Např. astma – inhalátor v tašce, alergie na pyl…"
            />
            <div className="form-help">Uvidí je jen trenéři a vedení klubu. Pomůže to v případě úrazu.</div>
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="onb-fieldset">
          {minor ? (
            <>
              <legend>Zákonný zástupce</legend>
              <p className="form-help onb-hint">
                Jste mladší 18 let, proto je potřeba souhlas rodiče. Po schválení klubem mu přijde e-mail s registrací.
              </p>
              <div className="auth-two-columns">
                <Field id="parentFirstName" label="Jméno rodiče" required value={form.parentFirstName} onChange={(v) => set('parentFirstName', v)} />
                <Field id="parentLastName" label="Příjmení rodiče" required value={form.parentLastName} onChange={(v) => set('parentLastName', v)} />
              </div>
              <div className="auth-two-columns">
                <Field id="parentEmail" label="E-mail rodiče" type="email" required value={form.parentEmail} onChange={(v) => set('parentEmail', v)} />
                <Field id="parentPhone" label="Telefon rodiče" type="tel" required value={form.parentPhone} onChange={(v) => set('parentPhone', v)} placeholder="+420 777 123 456" />
              </div>
            </>
          ) : (
            <>
              <legend>Kontakt pro případ nouze</legend>
              <div className="auth-two-columns">
                <Field id="emergencyName" label="Jméno a příjmení" required value={form.emergencyName} onChange={(v) => set('emergencyName', v)} />
                <Field id="emergencyPhone" label="Telefon" type="tel" required value={form.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} placeholder="+420 777 123 456" />
              </div>
            </>
          )}

          <h4 className="onb-sublegend">Souhlasy</h4>
          <label className="onb-check">
            <input type="checkbox" checked={form.consentGdpr} onChange={(e) => set('consentGdpr', e.target.checked)} />
            <span>
              Souhlasím se zpracováním osobních údajů klubem {clubName} pro účely evidence členů. *
            </span>
          </label>
          <label className="onb-check">
            <input type="checkbox" checked={form.consentPhotos} onChange={(e) => set('consentPhotos', e.target.checked)} />
            <span>Souhlasím s pořizováním a zveřejňováním fotografií z klubových akcí.</span>
          </label>
        </fieldset>
      )}

      <div className="onb-actions">
        {step > 0 && (
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => {
              setError(null)
              setStep((s) => s - 1)
            }}
          >
            Zpět
          </button>
        )}
        <button type="submit" className="auth-btn-primary" disabled={submitting}>
          {step < STEPS.length - 1 ? 'Pokračovat' : submitting ? 'Odesílám…' : 'Odeslat přihlášku'}
        </button>
      </div>
    </form>
  )
}

type FieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
  max?: string
  help?: string
}

function Field({ id, label, value, onChange, type = 'text', required, placeholder, autoComplete, max, help }: FieldProps) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        max={max}
      />
      {help && <div className="form-help">{help}</div>}
    </div>
  )
}
