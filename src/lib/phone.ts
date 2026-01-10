import { parsePhoneNumber, CountryCode } from 'libphonenumber-js'
import { randomInt } from 'crypto'

export function normalizePhoneNumber(phone: string, defaultCountry: CountryCode = 'US'): string | null {
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry)
    if (!phoneNumber.isValid()) {
      return null
    }
    return phoneNumber.format('E.164')
  } catch (error) {
    return null
  }
}

export function generateVerificationCode(): string {
  return randomInt(100000, 999999).toString()
}

export function isCodeExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return new Date() > expiresAt
}
