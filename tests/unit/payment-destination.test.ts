import { describe, expect, it } from 'vitest'
import { normalizePaymentDestination, paymentDestinationKind } from '../../src/core/paymentDestination'

describe('PromptPay destination', () => {
  it('accepts and normalizes a Thai mobile number', () => {
    expect(normalizePaymentDestination('081-234-5678')).toBe('0812345678')
    expect(paymentDestinationKind('081 234 5678')).toBe('phone')
  })

  it('accepts a Thai national ID only when its checksum is valid', () => {
    expect(paymentDestinationKind('1-1017-02000-50-5')).toBe('national-id')
    expect(paymentDestinationKind('1-1017-02000-50-4')).toBeNull()
  })

  it('rejects incomplete, foreign, and mixed-character values', () => {
    expect(paymentDestinationKind('812345678')).toBeNull()
    expect(paymentDestinationKind('+66812345678')).toBeNull()
    expect(paymentDestinationKind('08123abc678')).toBeNull()
  })
})
