const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s]{9,20}$/
const ZIP_RE = /^\d{3}\s?\d{2}$/

export const MIN_PASSWORD_LENGTH = 8

export type ApplicationData = {
  firstName: string
  lastName: string
  dateBirth: string
  phone: string | null
  password: string
  street: string
  city: string
  zip: string
  healthInsurance: string
  healthNotes: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  parentFirstName: string | null
  parentLastName: string | null
  parentEmail: string | null
  parentPhone: string | null
  consentGdpr: true
  consentPhotos: boolean
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function getAge(dateBirth: string, now = new Date()) {
  const birth = new Date(`${dateBirth}T00:00:00`)
  let age = now.getFullYear() - birth.getFullYear()
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hadBirthday) age -= 1
  return age
}

export function isMinor(dateBirth: string, now = new Date()) {
  return getAge(dateBirth, now) < 18
}

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value)
}

export function isValidPhone(value: string) {
  return PHONE_RE.test(value)
}

export function isValidZip(value: string) {
  return ZIP_RE.test(value)
}

function str(value: unknown) {
  return String(value ?? '').trim()
}

function optional(value: unknown) {
  const s = str(value)
  return s ? s : null
}

export function validatePassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`
  if (password !== confirm) return 'Hesla se neshodují.'
  return null
}

export type ProfileData = {
  street: string
  city: string
  zip: string
  healthInsurance: string
  healthNotes: string | null
  emergencyName: string | null
  emergencyPhone: string | null
}

/** Validates the address/health/emergency part shared by the application and profile edits. */
export function parseProfile(body: Record<string, unknown>, requireEmergency: boolean): ParseResult<ProfileData> {
  const street = str(body.street)
  const city = str(body.city)
  const zip = str(body.zip)
  const healthInsurance = str(body.healthInsurance)
  const emergencyName = optional(body.emergencyName)
  const emergencyPhone = optional(body.emergencyPhone)

  if (!street || !city || !zip) return { ok: false, error: 'Vyplňte prosím celou adresu.' }
  if (!isValidZip(zip)) return { ok: false, error: 'PSČ musí mít 5 číslic.' }
  if (!healthInsurance) return { ok: false, error: 'Vyplňte prosím zdravotní pojišťovnu.' }

  if (requireEmergency && (!emergencyName || !emergencyPhone)) {
    return { ok: false, error: 'Vyplňte prosím kontakt pro případ nouze.' }
  }
  if (emergencyPhone && !isValidPhone(emergencyPhone)) {
    return { ok: false, error: 'Neplatný telefon nouzového kontaktu.' }
  }

  return {
    ok: true,
    data: {
      street,
      city,
      zip,
      healthInsurance,
      healthNotes: optional(body.healthNotes),
      emergencyName,
      emergencyPhone,
    },
  }
}

export function parseApplication(body: Record<string, unknown>, playerEmail: string): ParseResult<ApplicationData> {
  const firstName = str(body.firstName)
  const lastName = str(body.lastName)
  const dateBirth = str(body.dateBirth)
  const phone = optional(body.phone)
  const password = String(body.password ?? '')
  const passwordConfirm = String(body.passwordConfirm ?? '')

  if (!firstName || !lastName) return { ok: false, error: 'Vyplňte prosím jméno a příjmení.' }
  if (!DATE_RE.test(dateBirth)) return { ok: false, error: 'Neplatné datum narození.' }

  const age = getAge(dateBirth)
  if (Number.isNaN(age) || age < 0 || age > 100 || new Date(dateBirth) >= new Date()) {
    return { ok: false, error: 'Neplatné datum narození.' }
  }
  const minor = age < 18

  const passwordError = validatePassword(password, passwordConfirm)
  if (passwordError) return { ok: false, error: passwordError }

  if (!minor && !phone) return { ok: false, error: 'Vyplňte prosím telefon.' }
  if (phone && !isValidPhone(phone)) return { ok: false, error: 'Neplatný formát telefonu.' }

  const profile = parseProfile(body, !minor)
  if (!profile.ok) return profile

  let parentFirstName: string | null = null
  let parentLastName: string | null = null
  let parentEmail: string | null = null
  let parentPhone: string | null = null

  if (minor) {
    parentFirstName = str(body.parentFirstName)
    parentLastName = str(body.parentLastName)
    parentEmail = str(body.parentEmail).toLowerCase()
    parentPhone = str(body.parentPhone)

    if (!parentFirstName || !parentLastName || !parentEmail || !parentPhone) {
      return { ok: false, error: 'Vyplňte prosím všechny údaje rodiče.' }
    }
    if (!isValidEmail(parentEmail)) return { ok: false, error: 'Neplatný e-mail rodiče.' }
    if (parentEmail === playerEmail.toLowerCase()) {
      return { ok: false, error: 'E-mail rodiče musí být jiný než e-mail hráče.' }
    }
    if (!isValidPhone(parentPhone)) return { ok: false, error: 'Neplatný telefon rodiče.' }
  }

  if (body.consentGdpr !== true) {
    return { ok: false, error: 'Pro registraci je nutný souhlas se zpracováním osobních údajů.' }
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      dateBirth,
      phone,
      password,
      ...profile.data,
      // emergency contact only for adults, the parent covers minors
      emergencyName: minor ? null : profile.data.emergencyName,
      emergencyPhone: minor ? null : profile.data.emergencyPhone,
      parentFirstName,
      parentLastName,
      parentEmail,
      parentPhone,
      consentGdpr: true,
      consentPhotos: body.consentPhotos === true,
    },
  }
}
