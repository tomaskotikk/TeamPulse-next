import bcrypt from 'bcryptjs'

export function generateTwoFactorCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
}

export async function hashTwoFactorCode(code: string) {
  return bcrypt.hash(code, 10)
}

export async function verifyTwoFactorCode(inputCode: string, hashedCode: string) {
  return bcrypt.compare(inputCode.trim(), hashedCode)
}

export function getTwoFactorExpiryIso(expiresMinutes: number) {
  return new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString()
}
