import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildReal, buildScenario } from '../../src/core/scenarios'
import { PROMPTPAY_DISPLAY, PROVIDER_NAME } from '../../src/platform/config'

describe('เลขบัญชีของเดโมห้ามหลุดเข้าโหมดจริง', () => {
  it('แก้แค่ชื่อ พร้อมเพย์ต้องว่าง ไม่ใช่เลขตัวอย่าง', () => {
    let s = buildScenario('default')
    // ครูแก้ชื่อตัวเอง แต่ยังไม่ได้แตะช่องพร้อมเพย์
    s = reducer(s, { type: 'setProvider', name: 'ครูมายด์', promptpayId: PROMPTPAY_DISPLAY })
    const real = reducer(s, { type: 'startReal' })
    expect(real.provider.name).toBe('ครูมายด์')
    expect(real.provider.promptpayId).toBe('')
  })

  it('แก้แค่พร้อมเพย์ ชื่อต้องว่าง ไม่ใช่ชื่อเดโม', () => {
    let s = buildScenario('default')
    s = reducer(s, { type: 'setProvider', name: PROVIDER_NAME, promptpayId: '081-234-5678' })
    const real = reducer(s, { type: 'startReal' })
    expect(real.provider.name).toBe('')
    expect(real.provider.promptpayId).toBe('081-234-5678')
  })

  it('กรอกเองทั้งคู่ เก็บไว้ทั้งคู่', () => {
    let s = buildScenario('default')
    s = reducer(s, { type: 'setProvider', name: 'ครูมายด์', promptpayId: '081-234-5678' })
    const real = reducer(s, { type: 'startReal' })
    expect(real.provider).toEqual({ name: 'ครูมายด์', promptpayId: '081-234-5678' })
  })

  it('ไม่แตะอะไรเลย ต้องว่างทั้งคู่ — onboarding จะได้บังคับกรอก', () => {
    expect(buildReal({ name: PROVIDER_NAME, promptpayId: PROMPTPAY_DISPLAY }).provider)
      .toEqual({ name: '', promptpayId: '' })
  })
})
