import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { dashboard } from '../../src/core/selectors'
import { complete, unitsOn } from '../../src/core/ledger'

describe('selectors', () => {
  it('dashboard default 1300', () => {
    expect(dashboard(buildScenario('default'), '2025-09').recovered).toBe(1300)
  })
  it('after two checks 2150', () => {
    let s = buildScenario('default')
    const units = unitsOn(s, s.today)
    s = complete(s, units.find((u) => u.subjectId === 's2')!.id)
    s = complete(s, units.find((u) => u.subjectId === 's8')!.id)
    expect(dashboard(s, '2025-09').recovered).toBe(2150)
  })
  it('outstanding counts sent and overdue', () => {
    expect(dashboard(buildScenario('default'), '2025-09').outstanding).toBe(7400)
  })
})
