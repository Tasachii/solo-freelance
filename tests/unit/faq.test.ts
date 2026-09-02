import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { answer, matchSource } from '../../src/core/faq'

const s = buildScenario('default')

describe('faq', () => {
  it('priority paymentStatus over currentInvoice', () => {
    expect(matchSource('tutor', 'จ่ายแล้วนะคะ ยอดเท่าไหร่')).toBe('paymentStatus')
  })
  it('no invoice gives estimate', () => {
    const a = answer(s, 'c1', 'เดือนนี้ค่าเรียนเท่าไหร่คะ')
    expect(a.source).toBe('currentInvoice')
    expect(a.text).toMatch(/ยังไม่ปิดยอด/)
  })
  it('not package gives modeThai', () => {
    const a = answer(s, 'c1', 'เหลือกี่ครั้งคะ')
    expect(a.text).toMatch(/รายครั้ง/)
  })
  it('fallback on unknown', () => {
    const a = answer(s, 'c1', 'สวัสดีค่ะ')
    expect(a.source).toBeNull()
    expect(a.text).toMatch(/ครูตอบเอง/)
  })
  it('multi-subject client answers both', () => {
    const a = answer(s, 'c4', 'เดือนนี้ค่าเรียนเท่าไหร่คะ')
    expect(a.text.split('\n').length).toBeGreaterThanOrEqual(2)
    expect(a.text).toMatch(/น้องต้น/)
    expect(a.text).toMatch(/น้องฟ้า/)
  })
  it('package remaining answers with count', () => {
    const a = answer(s, 'c6', 'เหลือกี่ครั้งคะ')
    expect(a.text).toMatch(/เหลือ 2/)
  })
})
