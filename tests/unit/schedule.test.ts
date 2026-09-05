import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'
import { complete, isCompleted, subjectById, unitsOn } from '../../src/core/ledger'
import { buildInvoice } from '../../src/core/billing'
import { dashboard } from '../../src/core/selectors'
import { cancelledText, movedText, summaryText } from '../../src/core/messages'

const s0 = () => buildScenario('default')
const billFor = (s: ReturnType<typeof s0>, id: string, p = '2025-09') =>
  buildInvoice(subjectById(s, id)!, p, s)?.total ?? 0

describe('เลื่อนคาบ', () => {
  it('เลื่อนแล้วยอดบิลต้องไม่เปลี่ยน — บิลคิดจากคาบที่เช็คชื่อ ไม่ใช่คาบที่นัด', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's2')!
    s = complete(s, u.id)
    const before = billFor(s, 's2')
    expect(before).toBeGreaterThan(0)

    s = reducer(s, { type: 'rescheduleUnit', unitId: u.id, date: '2025-09-20', time: '18:00' })
    expect(billFor(s, 's2')).toBe(before)
  })

  it('คาบที่ยังไม่เช็คชื่อ เลื่อนไปเดือนหน้าก็ไม่ทำให้เงินขยับ', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's7')!
    const before = dashboard(s, '2025-09').expected
    s = reducer(s, { type: 'rescheduleUnit', unitId: u.id, date: '2025-10-05', time: '18:00' })
    expect(dashboard(s, '2025-09').expected).toBe(before)
  })

  it('คาบที่เลื่อนแล้วหายจากวันเดิม ไปโผล่วันใหม่', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's7')!
    s = reducer(s, { type: 'rescheduleUnit', unitId: u.id, date: '2025-09-20', time: '19:30' })
    expect(unitsOn(s, s.today).some((x) => x.id === u.id)).toBe(false)
    const moved = unitsOn(s, '2025-09-20').find((x) => x.id === u.id)
    expect(moved?.time).toBe('19:30')
    expect(moved?.movedFrom).toBe('2025-09-02')
  })

  it('เลื่อนสองรอบยังจำวันเดิมที่สุดไว้', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's7')!
    s = reducer(s, { type: 'rescheduleUnit', unitId: u.id, date: '2025-09-10', time: '18:00' })
    s = reducer(s, { type: 'rescheduleUnit', unitId: u.id, date: '2025-09-15', time: '18:00' })
    expect(s.units.find((x) => x.id === u.id)?.movedFrom).toBe('2025-09-02')
  })
})

describe('งดคาบ', () => {
  it('คาบที่งดหายจากตาราง และเช็คชื่อไม่ได้', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's7')!
    s = reducer(s, { type: 'cancelUnit', unitId: u.id })
    expect(unitsOn(s, s.today).some((x) => x.id === u.id)).toBe(false)
    expect(isCompleted(complete(s, u.id), u.id)).toBe(false)
  })

  it('งดคาบที่เช็คชื่อไปแล้ว ต้องถอนการนับออกด้วย ไม่ให้ค้างเป็นเงิน', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's2')!
    s = complete(s, u.id)
    const withUnit = billFor(s, 's2')
    s = reducer(s, { type: 'cancelUnit', unitId: u.id })
    expect(isCompleted(s, u.id)).toBe(false)
    expect(billFor(s, 's2')).toBeLessThan(withUnit)
  })

  it('เอากลับมาได้', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's7')!
    s = reducer(s, { type: 'cancelUnit', unitId: u.id })
    s = reducer(s, { type: 'restoreUnit', unitId: u.id })
    expect(unitsOn(s, s.today).some((x) => x.id === u.id)).toBe(true)
  })
})

describe('ข้อความแจ้ง', () => {
  it('แจ้งเลื่อนบอกทั้งวันเดิมและวันใหม่ ไม่มีตัวแปรค้าง', () => {
    const s = s0()
    const text = movedText(s, subjectById(s, 's7')!, { date: '2025-09-02' }, { date: '2025-09-20', time: '18:00' })
    expect(text).toContain('2 ก.ย.')
    expect(text).toContain('20 ก.ย.')
    expect(text).not.toMatch(/\{[a-zA-Z]+\}/)
  })

  it('แจ้งงดคาบไม่มีตัวแปรค้าง', () => {
    const s = s0()
    expect(cancelledText(s, subjectById(s, 's7')!, '2025-09-02')).not.toMatch(/\{[a-zA-Z]+\}/)
  })
})

describe('สรุปกลางเดือน', () => {
  it('รายครั้ง — บอกจำนวนครั้งและยอดตรงกับ ledger', () => {
    let s = s0()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's2')!
    s = complete(s, u.id)
    const text = summaryText(s, subjectById(s, 's2')!, '2025-09')
    expect(text).toContain('2 ครั้ง')  // 1 ก่อนวันนี้ + 1 ที่เพิ่งเช็ค
    expect(text).not.toMatch(/\{[a-zA-Z]+\}/)
  })

  it('แพ็ก — บอกจำนวนครั้งที่เหลือแทนยอดเงิน', () => {
    const s = s0()
    const text = summaryText(s, subjectById(s, 's7')!, '2025-09')
    expect(text).toMatch(/เหลืออีก 2 จาก 10/)
    expect(text).not.toMatch(/บาท/)
  })
})

describe('การเว้นวรรคภาษาไทย', () => {
  it('ไม่มีตัวเลขติดกับคำ และไม่มีคำติดกับชื่อเดือนย่อ', () => {
    const s = s0()
    const texts = [
      summaryText(s, subjectById(s, 's7')!, '2025-09'),
      summaryText(s, subjectById(s, 's2')!, '2025-09'),
      movedText(s, subjectById(s, 's7')!, { date: '2025-09-02' }, { date: '2025-09-20', time: '18:00' }),
      cancelledText(s, subjectById(s, 's7')!, '2025-09-02'),
    ]
    for (const t of texts) {
      expect(t, `เลขติดคำไทย: ${t}`).not.toMatch(/\d[ก-ฮ]/)
      expect(t, `คำติดเดือนย่อ: ${t}`).not.toMatch(/[ก-ฮ](?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/)
    }
  })
})
