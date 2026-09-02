import { describe, it, expect } from 'vitest'
import {
  freshState, emptyState, billOf, totals, statusOf, sessionsOn, needsAttention,
  incomeSeries, expenseTotal, netMonth, buildBackup, parseBackup, initialOf, baht, recordsIn,
  openTasks, minutesSaved, humanMinutes, addRecord, setReceived, receivedOf,
  packState, rateOf, recoveredThisMonth, nextReceiptNo, receiptDescOf, receiptFor,
  buildAttendanceCsv, buildBillingCsv, issueReceipt, voidReceipt, billableStudents,
} from './state.js'
import { TODAY, TODAY_PERIOD } from './data.js'
import { shortDate, longMonth } from './dates.js'

const P = TODAY_PERIOD
const find = (s, id) => s.students.find((x) => x.id === id)

describe('ยอดเงินตั้งต้น — 3 โหมดการจ่าย', () => {
  it('รวม 11,400 (รายครั้ง 5,400 + เหมา 6,000 · แพ็กไม่มีบิลรายเดือน)', () => {
    expect(totals(freshState(), P)).toEqual({ total: 11400, paid: 6000, outstanding: 5400 })
  })

  it('จำนวนครั้งเดือนกันยายนตรงตาม mock', () => {
    const s = freshState()
    const times = Object.fromEntries(s.students.map((x) => [x.id, billOf(x, s, P).times]))
    expect(times).toEqual({ s1: 7, s2: 8, s3: 4, s4: 6, s5: 3, s6: 4, s7: 4, s8: 5 })
  })

  it('มีครบ 3 โหมด: รายครั้ง 3 คน เหมา 2 คน แพ็ก 3 คน', () => {
    const s = freshState()
    const count = { per_session: 0, monthly_flat: 0, package: 0 }
    for (const x of s.students) count[x.billing.mode] += 1
    expect(count).toEqual({ per_session: 3, monthly_flat: 2, package: 3 })
  })
})

describe('โหมดเหมารายเดือน', () => {
  it('ยอดคงที่ ไม่ขึ้นกับจำนวนครั้ง', () => {
    const s = freshState()
    const praew = find(s, 's2')
    expect(billOf(praew, s, P).amount).toBe(3200)
    const more = addRecord(s, 's2', { id: 'x', date: '2026-09-29', kind: 'attended', rate: 0, sessionId: null })
    expect(billOf(praew, more, P).amount).toBe(3200)
  })

  it('สลิปเหมาที่ยอดตรงถูกรับให้อัตโนมัติ', () => {
    const s = freshState()
    expect(statusOf(s, P, find(s, 's2'))).toBe('paid')
    expect(receivedOf(s, P, 's2')).toBe(3200)
  })
})

describe('โหมดแพ็ก', () => {
  it('ไม่มีบิลรายเดือน และรู้ว่าเหลือกี่ครั้ง', () => {
    const s = freshState()
    const ing = find(s, 's7')
    const bill = billOf(ing, s, P)
    expect(bill.status).toBe('package')
    expect(bill.amount).toBe(0)
    expect(bill.pack).toMatchObject({ total: 10, used: 8, left: 2, state: 'low' })
  })

  it('แพ็กหมดแล้วยังมาเรียน = over พร้อมจำนวนครั้งที่ยังไม่ได้เก็บ', () => {
    const s = freshState()
    expect(packState(find(s, 's8'))).toMatchObject({ used: 11, total: 10, over: 1, state: 'over' })
  })

  it('มูลค่าต่อครั้งของแพ็ก = ราคาหารจำนวนครั้ง', () => {
    const s = freshState()
    expect(rateOf(find(s, 's7'), s)).toBe(350)
    expect(rateOf(find(s, 's5'), s)).toBe(325)
  })

  it('ต้องดู: จับทั้งใกล้หมดและเกิน', () => {
    const s = freshState()
    const watch = needsAttention(s, P)
    expect(watch.find((w) => w.student.id === 's7')?.why).toMatch(/ใกล้หมดแพ็ก/)
    expect(watch.find((w) => w.student.id === 's8')?.why).toMatch(/เกิน 1 ครั้ง/)
    expect(watch.find((w) => w.student.id === 's8')?.tone).toBe('bad')
  })

  it('งานที่เหลือให้คนทำ รวมชวนต่อแพ็กของคนที่เกิน', () => {
    const kinds = openTasks(freshState(), P).map((t) => t.kind)
    expect(kinds).toContain('renew')
    expect(kinds).toContain('checkin')
    expect(kinds).toContain('slip')
  })
})

describe('snapshot เรท — ขึ้นราคาแล้วบิลเก่าไม่ขยับ', () => {
  it('เปลี่ยนเรทของนักเรียนไม่กระทบยอดที่บันทึกไว้แล้ว', () => {
    const s = freshState()
    const phum = find(s, 's1')
    const before = billOf(phum, s, P).amount
    const raised = {
      ...s,
      students: s.students.map((x) => (x.id === 's1' ? { ...x, billing: { mode: 'per_session', rate: 600 } } : x)),
    }
    expect(billOf(find(raised, 's1'), raised, P).amount).toBe(before)
  })

  it('เดือนเก่าใช้เรทเก่า (380) ไม่ใช่เรทปัจจุบัน (400)', () => {
    const s = freshState()
    const april = recordsIn(s, 's1', '2026-04')
    expect(april.length).toBeGreaterThan(0)
    expect(april.every((r) => r.rate === 380)).toBe(true)
  })
})

describe('จ่ายบางส่วน', () => {
  it('เพิ่มครั้งหลังปิดยอด (รายครั้ง) ค้างเฉพาะส่วนต่าง', () => {
    const s = freshState()
    const phum = find(s, 's1')
    expect(statusOf(s, P, phum)).toBe('paid')
    const owed = totals(s, P).outstanding
    const next = addRecord(s, 's1', { id: 'x', date: '2026-09-29', kind: 'attended', rate: 400, sessionId: null })
    expect(billOf(phum, next, P).status).toBe('partial')
    expect(totals(next, P).outstanding).toBe(owed + 400)
  })

  it('สลิปโอนขาดของปราง: รับ 1,200 แล้วยังค้าง 400', () => {
    const s = freshState()
    const partial = setReceived(s, P, 's6', 1200)
    expect(billOf(find(s, 's6'), partial, P).status).toBe('partial')
    expect(totals(partial, P).outstanding).toBe(totals(s, P).outstanding - 1200)
  })
})

describe('ใบเสร็จ', () => {
  it('เลขที่รันต่อจากของเดิม รูปแบบ ST-ปีพศ-เดือน-เลขรัน', () => {
    expect(nextReceiptNo(freshState(), P)).toBe('ST-2569-09-0012')
  })

  it('คำอธิบายตามโหมด', () => {
    const s = freshState()
    expect(receiptDescOf(find(s, 's1'), s, P)).toBe('ค่าเรียนฟิสิกส์ กันยายน 2569 — 7 ครั้ง × 400')
    expect(receiptDescOf(find(s, 's2'), s, P)).toMatch(/เหมา/)
    expect(receiptDescOf(find(s, 's7'), s, P)).toBe('แพ็กเรียนอังกฤษ 10 ครั้ง')
  })

  it('แพรวมีใบเสร็จตั้งต้น (ระบบออกให้ตอนสลิปตรง)', () => {
    expect(receiptFor(freshState(), 's2', P)?.no).toBe('ST-2569-09-0011')
  })
})

describe('เงินที่ระบบช่วยกู้คืน — คำนวณจาก state ไม่ใช่เลขตายตัว', () => {
  it('ตั้งต้น: ลืมจด 1,200 + จับแพ็กเกิน 350', () => {
    const r = recoveredThisMonth(freshState(), P)
    expect(r.forgotten).toBe(1200)
    expect(r.packCatch).toBe(350)
    expect(r.total).toBe(1550)
  })

  it('ทวงแล้วได้เงิน ตัวเลขขยับตาม', () => {
    let s = freshState()
    s = { ...s, reminded: { s3: 1 } }
    s = setReceived(s, P, 's3', 1000)
    const r = recoveredThisMonth(s, P)
    expect(r.dunned).toBe(1000)
    expect(r.total).toBe(1000 + 1200 + 350)
  })
})

describe('CSV สองไฟล์ · BOM ให้ Excel ไทย', () => {
  it('attendance.csv มี BOM และแถวตรงจำนวนครั้งรวม', () => {
    const s = freshState()
    const csv = buildAttendanceCsv(s, P)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const rows = csv.split('\n').length - 1
    const total = s.students.reduce((n, x) => n + billOf(x, s, P).times, 0)
    expect(rows).toBe(total)
  })

  it('billing.csv บอกโหมดและสถานะเป็นไทย', () => {
    const csv = buildBillingCsv(freshState(), P)
    expect(csv).toMatch(/เหมารายเดือน/)
    expect(csv).toMatch(/แพ็ก 11\/10 ครั้ง/)
    expect(csv).toMatch(/จ่ายล่วงหน้า/)
  })
})

describe('คาบสอนจากตารางประจำสัปดาห์', () => {
  it('วันนี้ (พุธ) มี 5 คาบ รวมน้องปุณที่แพ็กหมดแล้ว', () => {
    const s = freshState()
    const names = sessionsOn(s, TODAY).map((c) => find(s, c.studentId).nick)
    expect(names).toEqual(['น้องแพรว', 'น้องปุณ', 'น้องต้นน้ำ', 'น้องเจได', 'น้องภูมิ'])
  })

  it('นักเรียนที่พักการเรียนไม่ขึ้นในตาราง', () => {
    const s = freshState()
    const paused = { ...s, students: s.students.map((x) => (x.id === 's2' ? { ...x, life: 'paused' } : x)) }
    expect(sessionsOn(paused, TODAY).some((c) => c.studentId === 's2')).toBe(false)
  })
})

describe('รายจ่ายและเงินเหลือจริง', () => {
  it('นับเฉพาะรายจ่ายของเดือนนั้น', () => {
    expect(expenseTotal(freshState(), P)).toBe(1940)
    expect(expenseTotal(freshState(), '2026-08')).toBe(620)
  })

  it('เหลือจริง = เข้าแล้ว ลบรายจ่าย', () => {
    expect(netMonth(freshState(), P)).toBe(6000 - 1940)
  })
})

describe('แนวโน้มรายรับ', () => {
  it('คืน 6 เดือน เดือนสุดท้ายคือเดือนปัจจุบัน และทุกเดือน > 0', () => {
    const series = incomeSeries(freshState(), P)
    expect(series).toHaveLength(6)
    expect(series[5].period).toBe(P)
    expect(series[5].amount).toBe(11400)
    expect(series.every((m) => m.amount > 0)).toBe(true)
  })
})

describe('สำรองและกู้คืนข้อมูล', () => {
  it('กู้คืนไฟล์ที่ export ออกมาได้ตรงเดิม', () => {
    const s = freshState()
    const restored = parseBackup(buildBackup(s))
    expect(totals(restored, P)).toEqual(totals(s, P))
    expect(restored.students).toHaveLength(s.students.length)
  })

  it('ปฏิเสธไฟล์ที่ไม่ใช่ของแอปนี้', () => {
    expect(() => parseBackup('{"app":"other"}')).toThrow(/ไม่ใช่ไฟล์สำรอง/)
  })
})

describe('ตัวช่วยแสดงผล', () => {
  it('อักษรย่อ avatar ตัด "น้อง" และสระหน้า', () => {
    expect(initialOf('น้องแพรว')).toBe('พ')
    expect(initialOf('น้องปุณ')).toBe('ป')
  })

  it('เงินมี comma และวันที่ไทย', () => {
    expect(baht(11400)).toBe('11,400')
    expect(shortDate('2026-09-30')).toBe('30 ก.ย.')
    expect(longMonth('2026-09')).toBe('กันยายน 2569')
  })

  it('นับเวลาที่ระบบทำแทน', () => {
    expect(minutesSaved(freshState())).toBeGreaterThan(0)
    expect(humanMinutes(63)).toBe('1 ชั่วโมง 3 นาที')
  })
})

describe('เริ่มจากศูนย์', () => {
  it('ล้างข้อมูลแล้วไม่เหลือนักเรียน บิล หรือใบเสร็จ', () => {
    const s = emptyState()
    expect(s.students).toHaveLength(0)
    expect(s.receipts).toHaveLength(0)
    expect(totals(s, P)).toEqual({ total: 0, paid: 0, outstanding: 0 })
  })
})

describe('วงจรใบเสร็จ — เอกสารการเงินห้ามโกหก', () => {
  it('ยกเลิกรับยอดต้องเพิกถอนใบเสร็จด้วย', () => {
    let s = freshState()
    const mina = find(s, 's4')
    s = issueReceipt(setReceived(s, P, 's4', 2800), mina, P).state
    expect(receiptFor(s, 's4', P)).toBeTruthy()
    s = voidReceipt(setReceived(s, P, 's4', 0), 's4', P)
    expect(receiptFor(s, 's4', P)).toBeUndefined()
  })

  it('confirm → undo → confirm ได้ใบเดียว เลขที่ไม่ซ้ำ', () => {
    let s = freshState()
    const mina = find(s, 's4')
    const r1 = issueReceipt(s, mina, P); s = r1.state
    s = voidReceipt(s, 's4', P)
    const r2 = issueReceipt(s, mina, P); s = r2.state
    expect(s.receipts.filter((r) => r.studentId === 's4')).toHaveLength(1)
    expect(r2.receipt.no).not.toBe(r1.receipt.no)
    expect(receiptFor(s, 's4', P).id).toBe(r2.receipt.id)
  })
})

describe('attendance.csv เรียงตามวันที่จริง', () => {
  it('แถวแรกคือวันแรกของเดือน ไม่ใช่ "10 ก.ย." จาก string sort', () => {
    const rows = buildAttendanceCsv(freshState(), P).split('\n').slice(1)
    const days = rows.map((r) => Number(r.split(',')[0].replace(/"/g, '').split(' ')[0]))
    expect(days[0]).toBe(Math.min(...days))
    for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThanOrEqual(days[i - 1])
  })
})

describe('ส่งบิลเฉพาะคนที่มีบิลจริง', () => {
  it('นักเรียนแพ็กไม่อยู่ในลิสต์ส่งบิล', () => {
    const s = freshState()
    const names = billableStudents(s).map((x) => x.id)
    expect(names).toHaveLength(5)
    expect(names).not.toContain('s5')
    expect(names).not.toContain('s7')
    expect(names).not.toContain('s8')
  })

  it('นักเรียนพักการเรียนไม่ถูกส่งบิล', () => {
    const s = freshState()
    const paused = { ...s, students: s.students.map((x) => (x.id === 's1' ? { ...x, life: 'paused' } : x)) }
    expect(billableStudents(paused).map((x) => x.id)).not.toContain('s1')
  })
})
