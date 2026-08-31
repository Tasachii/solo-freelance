import { describe, it, expect } from 'vitest'
import {
  freshState, emptyState, billOf, totals, statusOf, sessionsOn, needsAttention,
  incomeSeries, expenseTotal, netMonth, buildBackup, parseBackup, initialOf, baht, recordsIn,
} from './state.js'
import { DEFAULT_SETTINGS, TODAY, TODAY_PERIOD } from './data.js'
import { shiftPeriod, weekday, shortDate, longMonth, shiftPeriod as sp } from './dates.js'

const P = TODAY_PERIOD
const byId = (s, id) => s.students.find((x) => x.id === id)

describe('ยอดเงินตั้งต้นต้องตรงกับบรีฟ', () => {
  it('รวม 11,750 / เข้าแล้ว 5,200 / ค้าง 6,550', () => {
    expect(totals(freshState(), P)).toEqual({ total: 11750, paid: 5200, outstanding: 6550 })
  })

  it('จำนวนครั้งเดือนกันยายนตรงตามบรีฟ', () => {
    const s = freshState()
    const want = { s1: 7, s2: 8, s3: 4, s4: 6, s5: 3, s6: 4 }
    for (const [id, times] of Object.entries(want)) {
      expect(billOf(byId(s, id), s, P).times).toBe(times)
    }
  })

  it('เดี่ยว 400 กลุ่ม 250', () => {
    const s = freshState()
    expect(billOf(byId(s, 's1'), s, P).amount).toBe(7 * 400)
    expect(billOf(byId(s, 's3'), s, P).amount).toBe(4 * 250)
  })
})

describe('snapshot เรท — ขึ้นราคาแล้วบิลเก่าต้องไม่ขยับ', () => {
  it('เปลี่ยนเรทกลางคันไม่กระทบยอดที่บันทึกไว้แล้ว', () => {
    const s = freshState()
    const before = totals(s, P)
    const raised = { ...s, settings: { ...s.settings, rates: { single: 900, group: 900 } } }
    expect(totals(raised, P)).toEqual(before)
  })

  it('เงินที่รับมาแล้วต้องไม่ถูกเขียนทับ', () => {
    const s = freshState()
    const raised = { ...s, settings: { ...s.settings, rates: { single: 900, group: 900 } } }
    expect(totals(raised, P).paid).toBe(5200)
  })

  it('เดือนเก่าใช้เรทเก่า (380) ไม่ใช่เรทปัจจุบัน (400)', () => {
    const s = freshState()
    const old = shiftPeriod(P, -5)
    const rec = recordsIn(s, 's1', old)
    expect(rec.length).toBeGreaterThan(0)
    expect(rec.every((r) => r.rate === 380)).toBe(true)
  })
})

describe('สถานะการจ่าย', () => {
  it('นักเรียนที่ยังไม่มีครั้งเรียน = ยังไม่มียอด ไม่ใช่รอสลิป', () => {
    const s = emptyState(DEFAULT_SETTINGS)
    const stu = { id: 'x1', nick: 'น้องใหม่', type: 'single', plan: 4, life: 'active', schedule: [] }
    const next = { ...s, students: [stu], records: { x1: [] } }
    expect(statusOf(next, P, stu)).toBe('none')
    expect(billOf(stu, next, P).amount).toBe(0)
  })
})

describe('คาบสอนสร้างจากตารางประจำสัปดาห์', () => {
  it('วันนี้เป็นวันพุธ มี 4 คาบตามบรีฟ', () => {
    const s = freshState()
    expect(weekday(TODAY)).toBe(3)
    const list = sessionsOn(s, TODAY)
    expect(list.map((x) => x.time)).toEqual(['16:30', '18:00', '18:00', '19:45'])
  })

  it('นักเรียนใหม่ที่ตั้งตารางวันนี้ ต้องโผล่ในคาบวันนี้', () => {
    const s = freshState()
    const stu = { id: 'x9', nick: 'น้องใหม่', subject: 'คณิต', grade: 'ม.1', type: 'single', plan: 4, life: 'active', schedule: [{ day: 3, time: '09:00' }] }
    const next = { ...s, students: [...s.students, stu] }
    expect(sessionsOn(next, TODAY).some((x) => x.studentId === 'x9')).toBe(true)
  })

  it('นักเรียนที่พักการเรียนไม่ขึ้นในตาราง', () => {
    const s = freshState()
    const paused = { ...s, students: s.students.map((x) => (x.id === 's2' ? { ...x, life: 'paused' } : x)) }
    expect(sessionsOn(paused, TODAY).some((x) => x.studentId === 's2')).toBe(false)
  })
})

describe('รายจ่ายและเงินเหลือจริง', () => {
  it('นับเฉพาะรายจ่ายของเดือนนั้น', () => {
    const s = freshState()
    expect(expenseTotal(s, P)).toBe(480 + 260 + 1200)
    expect(expenseTotal(s, shiftPeriod(P, -1))).toBe(620)
  })

  it('เหลือจริง = เงินที่เข้าแล้ว ลบรายจ่าย', () => {
    const s = freshState()
    expect(netMonth(s, P)).toBe(5200 - 1940)
  })
})

describe('ต้องดู', () => {
  it('ไม่ทักนักเรียนที่ยังไม่เริ่มเรียน', () => {
    const s = freshState()
    const stu = { id: 'x2', nick: 'น้องเพิ่งเพิ่ม', type: 'single', plan: 4, life: 'active', schedule: [] }
    const next = { ...s, students: [...s.students, stu], records: { ...s.records, x2: [] } }
    expect(needsAttention(next, P).some((w) => w.student.id === 'x2')).toBe(false)
  })

  it('ทักคนค้างจ่าย', () => {
    const s = freshState()
    const ids = needsAttention(s, P).filter((w) => w.tone === 'bad').map((w) => w.student.id)
    expect(ids).toContain('s3')
    expect(ids).toContain('s5')
  })
})

describe('แนวโน้มรายรับ', () => {
  it('คืน 6 เดือนและเดือนสุดท้ายคือเดือนปัจจุบัน', () => {
    const s = freshState()
    const series = incomeSeries(s, P)
    expect(series).toHaveLength(6)
    expect(series[5].period).toBe(P)
    expect(series[5].amount).toBe(11750)
  })

  it('ทุกเดือนมีรายรับมากกว่าศูนย์ (กันบั๊ก generator ที่เคยทำเดือนหาย)', () => {
    const s = freshState()
    for (const m of incomeSeries(s, P)) expect(m.amount).toBeGreaterThan(0)
  })
})

describe('สำรองและกู้คืนข้อมูล', () => {
  it('กู้คืนไฟล์ที่ export ออกมาได้ตรงเดิม', () => {
    const s = freshState()
    const restored = parseBackup(buildBackup(s))
    expect(totals(restored, P)).toEqual(totals(s, P))
    expect(restored.students).toHaveLength(6)
  })

  it('ปฏิเสธไฟล์ที่ไม่ใช่ของแอปนี้', () => {
    expect(() => parseBackup('{"app":"other"}')).toThrow(/ไม่ใช่ไฟล์สำรอง/)
    expect(() => parseBackup('ไม่ใช่ json')).toThrow(/JSON/)
  })
})

describe('ตัวช่วยแสดงผล', () => {
  it('อักษรย่อ avatar ตัด "น้อง" และสระหน้า', () => {
    expect(initialOf('น้องภูมิ')).toBe('ภ')
    expect(initialOf('น้องแพรว')).toBe('พ')
    expect(initialOf('น้องเจได')).toBe('จ')
  })
  it('เงินมี comma', () => {
    expect(baht(11750)).toBe('11,750')
    expect(baht(0)).toBe('0')
  })
  it('วันที่และเดือนภาษาไทย', () => {
    expect(shortDate('2026-09-02')).toBe('2 ก.ย.')
    expect(longMonth('2026-09')).toBe('กันยายน 2569')
    expect(sp('2026-01', -1)).toBe('2025-12')
  })
})
