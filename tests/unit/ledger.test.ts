import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { complete, packageStatus, renewPackage, subjectById, unitsOn } from '../../src/core/ledger'

const base = buildScenario('default')

describe('ledger', () => {
  it('complete idempotent', () => {
    const u = unitsOn(base, base.today)[0]
    const a = complete(base, u.id)
    const b = complete(a, u.id)
    expect(b.completions.length).toBe(a.completions.length)
  })
  it('package used derives from purchasedAt', () => {
    expect(packageStatus(base, subjectById(base, 's6')!)!.used).toBe(3)
    expect(packageStatus(base, subjectById(base, 's7')!)!.used).toBe(8)
  })
  it('remaining never negative', () => {
    const u8 = unitsOn(base, base.today).find((u) => u.subjectId === 's8')!
    const after = complete(base, u8.id)
    const pk = packageStatus(after, subjectById(after, 's8')!)!
    expect(pk.remaining).toBe(0)
    expect(pk.overBy).toBe(1)
  })
  it('renew resets used', () => {
    const s = renewPackage(base, 's8')
    expect(packageStatus(s, subjectById(s, 's8')!)!.used).toBe(0)
  })
})
