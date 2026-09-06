import { describe, expect, it } from 'vitest'
import { migrate, reducer } from '../../src/core/store'
import { buildReal, buildScenario } from '../../src/core/scenarios'
import { todayISO } from '../../src/core/format'

describe('โหมดใช้จริง', () => {
  it('เริ่มใช้จริงแล้วข้อมูลสมมติต้องไม่เหลือแม้แต่แถวเดียว', () => {
    const demo = buildScenario('default')
    expect(demo.subjects.length).toBeGreaterThan(0)

    const real = reducer(demo, { type: 'startReal' })
    expect(real.mode).toBe('real')
    for (const rows of [real.subjects, real.clients, real.units, real.completions,
      real.invoices, real.payments, real.receipts, real.messages, real.chats]) {
      expect(rows).toHaveLength(0)
    }
  })

  it('เก็บชื่อที่ครูกรอกเองไว้ ไม่ต้องพิมพ์ใหม่', () => {
    let s = buildScenario('default')
    s = reducer(s, { type: 'setProvider', name: 'ครูมายด์', promptpayId: '081-234-5678' })
    const real = reducer(s, { type: 'startReal' })
    expect(real.provider).toEqual({ name: 'ครูมายด์', promptpayId: '081-234-5678' })
  })

  it('ชื่อสมมติของเดโมต้องไม่ติดไปโหมดจริง', () => {
    // ครูที่กดเริ่มใช้จริงทันทีโดยไม่แก้ชื่อ ต้องไม่ส่งบิลในนาม "ครูเบนซ์"
    const real = reducer(buildScenario('default'), { type: 'startReal' })
    expect(real.provider.name).toBe('')
  })

  it('วันในโหมดจริงคือวันตามเครื่อง ไม่ใช่วันที่ล็อกไว้ในเดโม', () => {
    const demo = buildScenario('default')
    expect(demo.today).toBe('2025-09-02')
    expect(buildReal().today).toBe(todayISO())
  })

  it('todayISO ใช้วันตามเครื่อง ไม่ใช่วัน UTC', () => {
    // ตี 00:30 ของวันปีใหม่ที่กรุงเทพ = 31 ธ.ค. 17:30 ตาม UTC
    // ครูที่เช็คชื่อคาบดึกจะถูกบันทึกเป็นเมื่อวานถ้าเผลอใช้ toISOString
    const d = new Date(2026, 0, 1, 0, 30, 0)
    expect(todayISO(d)).toBe('2026-01-01')
    expect(d.toISOString().slice(0, 10)).toBe('2025-12-31') // ยืนยันว่าต่างกันจริง
  })
})

describe('ย้ายข้อมูลเก่า v3 → v5', () => {
  const asV3 = () => {
    const s = JSON.parse(JSON.stringify(buildScenario('default')))
    s.schemaVersion = 3
    delete s.mode
    return s
  }

  it('ข้อมูลเดิมต้องไม่หายแม้แต่แถวเดียว และถูกทำเครื่องหมายว่าเป็นเดโม', () => {
    const before = asV3()
    const after = migrate(before)!
    expect(after.schemaVersion).toBe(5)
    expect(after.revision).toBe(0)
    expect(after.mode).toBe('demo')
    expect(after.subjects).toHaveLength(before.subjects.length)
    expect(after.invoices).toHaveLength(before.invoices.length)
    expect(after.receipts).toHaveLength(before.receipts.length)
    expect(after.messages).toHaveLength(before.messages.length)
    expect(after.provider).toEqual(before.provider)
  })

  it('v4 ที่มีอยู่แล้วผ่านไปเฉย ๆ ไม่ถูกแตะ', () => {
    const v4 = buildScenario('default')
    expect(migrate(JSON.parse(JSON.stringify(v4)))!.mode).toBe('demo')
  })

  it('ข้อมูลพังหรือเวอร์ชันที่ไม่รู้จัก คืน null ให้ไปโหลดชุดใหม่', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate({ schemaVersion: 4 })).toBeNull()
    expect(migrate({ schemaVersion: 99, subjects: [] })).toBeNull()
  })
})
