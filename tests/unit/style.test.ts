import { describe, expect, it } from 'vitest'
import { STYLES, defaultBillingFor, modesFor, scenarioForStyle, styleOfScenario } from '../../src/core/style'
import { SCENARIOS, buildReal, buildScenario } from '../../src/core/scenarios'
import { migrate, reducer } from '../../src/core/store'
import { validateState } from '../../src/core/validation'
import { fillVocab, professionById } from '../../src/professions'
import { copy } from '../../src/copy'

describe('รูปแบบการเก็บเงิน (style)', () => {
  it('ทุกแบบมีชุดข้อมูลเดโมของตัวเอง และชุดนั้นใช้แบบนั้นเป็นส่วนใหญ่จริง', () => {
    for (const st of STYLES) {
      const s = buildScenario(scenarioForStyle[st])
      expect(s.style).toBe(st)
      expect(s.subjects.length).toBeGreaterThan(3)
      if (st === 'mixed') {
        expect(new Set(s.subjects.map((x) => x.billing.mode)).size).toBe(3)
      } else {
        const share = s.subjects.filter((x) => x.billing.mode === st).length / s.subjects.length
        expect(share, `${st} share`).toBeGreaterThanOrEqual(0.75)
      }
    }
    // ทุก scenario ประกาศ style ของตัวเอง ยกเว้นชุดว่าง
    for (const id of SCENARIOS) expect(buildScenario(id).style === undefined).toBe(id === 'empty')
    expect(styleOfScenario('monthly-heavy')).toBe('mixed')
  })

  it('ค่าเริ่มต้นตอนเพิ่มลูกค้าและตัวกรองตามแบบที่เลือก', () => {
    expect(defaultBillingFor(undefined)).toBe('per_unit')
    expect(defaultBillingFor('mixed')).toBe('per_unit')
    expect(defaultBillingFor('package')).toBe('package')
    expect(modesFor('flat_monthly')).toEqual(['flat_monthly'])
    expect(modesFor('mixed')).toHaveLength(3)
  })

  it('เปลี่ยนแบบในโหมดใช้จริงไม่แตะข้อมูล และปฏิเสธค่าแปลก', () => {
    let s = reducer(buildScenario('default'), { type: 'startReal' })
    s = reducer(s, { type: 'bulkAddSubjects', rows: [{ name: 'A', clientName: 'B' }], billing: { mode: 'per_unit', rate: 400 } })
    const before = JSON.stringify([s.subjects, s.clients, s.invoices])
    const changed = reducer(s, { type: 'setStyle', style: 'package' })
    expect(changed.style).toBe('package')
    expect(JSON.stringify([changed.subjects, changed.clients, changed.invoices])).toBe(before)
    expect(reducer(s, { type: 'setStyle', style: 'weekly' as never })).toBe(s)
  })

  it('เริ่มใช้จริงจากเดโมแบบแพ็ก แบบที่เลือกติดไปด้วย', () => {
    const real = reducer(buildScenario('package-heavy'), { type: 'startReal' })
    expect(real.style).toBe('package')
    expect(real.subjects).toHaveLength(0)
    expect(buildReal(undefined, 'flat_monthly').style).toBe('flat_monthly')
  })

  it('ไฟล์สำรองเก่าไม่มี style ยังโหลดได้ · ค่าแปลกถูกปฏิเสธ', () => {
    const s = buildScenario('default')
    const { style: _drop, ...legacy } = s
    expect(migrate(JSON.parse(JSON.stringify(legacy)))).not.toBeNull()
    const weird = JSON.parse(JSON.stringify({ ...s, style: 'weekly' }))
    expect(validateState(weird).errors.some((e) => e.startsWith('style'))).toBe(true)
    expect(migrate(weird)).toBeNull()
  })

  it('คำอธิบายทุกแบบไม่มีคำของครูฝังตายตัว — เติมจาก vocab ของอาชีพ', () => {
    const texts = [...Object.values(copy.waitlist.modeHow), ...Object.values(copy.start.cards).flatMap((c) => [c.s, ...c.b])]
    for (const t of texts) expect(t, t).not.toMatch(/นักเรียน|ผู้ปกครอง|เช็คชื่อ|คาบ|ครู/)
    const v = professionById('tutor').vocab
    const filled = fillVocab(copy.waitlist.modeHow.package, v)
    expect(filled).toContain('เช็คชื่อ')
    expect(filled).not.toMatch(/\{\w+\}/)
  })
})
