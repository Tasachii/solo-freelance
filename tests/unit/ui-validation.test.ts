import { describe, expect, it } from 'vitest'
import { buildBilling, parseMoneyInput } from '../../src/app/SubjectSheet'
import { canRenewSubject, mustArchiveSubject } from '../../src/app/SubjectDetail'
import { buildScenario } from '../../src/core/scenarios'

describe('UI billing validation', () => {
  it('accepts only positive safe integer amounts', () => {
    expect(parseMoneyInput('1,200')).toBe(1200)
    expect(parseMoneyInput('12.5')).toBeNull()
    expect(parseMoneyInput('1e309')).toBeNull()
    expect(parseMoneyInput('-1')).toBeNull()
  })

  it('preserves package epoch metadata when editing terms', () => {
    const billing = buildBilling('package', {
      rate: '400', flat: '3000', packageTotal: '12', packagePrice: '4200',
    }, {
      mode: 'package', total: 10, price: 3500, purchasedAt: '2026-09-01',
      carriedCredits: 3, carriedUnitIds: ['u-1', 'u-2'],
    }, '2026-09-06')

    expect(billing).toEqual({
      mode: 'package', total: 12, price: 4200, purchasedAt: '2026-09-01',
      carriedCredits: 3, carriedUnitIds: ['u-1', 'u-2'],
    })
  })

  it('archives real subjects with financial history instead of offering permanent deletion', () => {
    const demo = buildScenario('default')
    expect(mustArchiveSubject(demo, 's2')).toBe(false)
    expect(mustArchiveSubject({ ...demo, mode: 'real' }, 's2')).toBe(true)
    expect(mustArchiveSubject({ ...demo, mode: 'real' }, 'missing')).toBe(false)
  })

  it('does not offer package renewal for an inactive subject', () => {
    const state = buildScenario('default')
    const packaged = state.subjects.find((subject) => subject.billing.mode === 'package')!
    expect(canRenewSubject(packaged)).toBe(true)
    expect(canRenewSubject({ ...packaged, active: false })).toBe(false)
  })
})
