export type PaymentDestinationKind = 'phone' | 'national-id'

/** PromptPay accepts a Thai mobile number or a checksum-valid Thai national ID. */
export function normalizePaymentDestination(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!/^[\d\s-]+$/.test(trimmed)) return null
  return trimmed.replace(/[\s-]/g, '')
}

function hasValidThaiIdChecksum(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false
  const sum = value.slice(0, 12).split('').reduce((total, digit, index) =>
    total + Number(digit) * (13 - index), 0)
  return (11 - (sum % 11)) % 10 === Number(value[12])
}

export function paymentDestinationKind(value: string): PaymentDestinationKind | null {
  const normalized = normalizePaymentDestination(value)
  if (!normalized) return null
  if (/^0\d{9}$/.test(normalized)) return 'phone'
  if (hasValidThaiIdChecksum(normalized)) return 'national-id'
  return null
}

export const isPaymentDestination = (value: string): boolean => paymentDestinationKind(value) !== null
