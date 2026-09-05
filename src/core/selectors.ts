import type { AppState, Invoice } from './types'
import { completionsIn, packageStatus, packageUnitPrice } from './ledger'
import { daysOverdue, invoiceFor } from './billing'
import { periodOf } from './format'

export interface Dashboard {
  expected: number; received: number; outstanding: number
  recovered: number
  breakdown: { dunned: number; counted: number; overflow: number }
}

/** ตัวเลขทุกตัวคำนวณจาก ledger เท่านั้น — ห้าม hard-code (หลักการข้อ 2) */
export function dashboard(state: AppState, period: string): Dashboard {
  let expected = 0
  for (const inv of state.invoices) if (inv.period === period && inv.kind === 'monthly') expected += inv.total
  for (const s of state.subjects) {
    if (!s.active) continue
    if (s.billing.mode === 'package') continue
    if (invoiceFor(state, s.id, period)) continue
    if (s.billing.mode === 'flat_monthly') expected += s.billing.amount
    else expected += completionsIn(state, s.id, period).length * s.billing.rate
  }

  const received = state.payments
    .filter((p) => periodOf(p.paidAt) === period)
    .reduce((n, p) => n + p.amount, 0)

  const outstanding = state.invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((n, i) => n + i.total, 0)

  // 1) บิลที่เก็บได้หลังเคยทวง
  let dunned = 0
  for (const inv of state.invoices) {
    if (inv.status !== 'paid') continue
    const reminded = state.messages.some(
      (m) => m.kind === 'reminder' && m.status === 'sent' && m.meta?.invoiceId === inv.id)
    if (reminded) dunned += inv.total
  }
  // 2) ครั้งที่นับได้ในระบบเดือนนี้ (รายครั้ง)
  let counted = 0
  for (const s of state.subjects) {
    if (s.billing.mode !== 'per_unit') continue
    counted += completionsIn(state, s.id, period).length * s.billing.rate
  }
  // 3) ครั้งที่เกินแพ็กซึ่งจับได้
  let overflow = 0
  for (const s of state.subjects) {
    const pk = packageStatus(state, s)
    if (!pk || pk.overBy === 0) continue
    overflow += pk.overBy * packageUnitPrice(pk)
  }

  return { expected, received, outstanding, recovered: dunned + counted + overflow, breakdown: { dunned, counted, overflow } }
}

export const draftCount = (state: AppState): number => state.messages.filter((m) => m.status === 'draft').length

/** ค้างนานสุดของวิชานี้ — ใบแรกในอาร์เรย์ไม่ใช่ใบที่ค้างนานสุดเสมอไป */
export function overdueDaysBySubject(state: AppState, subjectId: string): number {
  const days = state.invoices
    .filter((i) => i.subjectId === subjectId && (i.status === 'overdue' || i.status === 'sent') && i.dueAt)
    .map((i) => daysOverdue(state, i))
  return days.length ? Math.max(...days) : 0
}

export const clientsWithChats = (state: AppState): string[] => {
  const ids = new Set(state.chats.map((c) => c.clientId))
  for (const s of state.subjects) ids.add(s.clientId)
  return [...ids]
}


/**
 * ใบที่ควรโชว์ในแถวของวิชานี้ — เรียงตาม "ต้องลงมือทำแค่ไหน"
 * เกินกำหนด > ส่งแล้วรอเงิน > ร่างของเดือนนี้ > ล่าสุด
 * ถ้าเอาใบเดือนปัจจุบันมาก่อนเสมอ พอปิดยอดเดือนใหม่ บิลค้างเดือนก่อนจะหายไปจากจอ
 * ทั้งที่ยอด "ค้าง" ยังนับมันอยู่ — ครูจะเก็บเงินก้อนนั้นไม่ได้เลย
 */
export function invoiceToActOn(state: AppState, subjectId: string, period: string): Invoice | undefined {
  const mine = state.invoices.filter((i) => i.subjectId === subjectId && i.kind === 'monthly')
  const rank = (i: Invoice): number =>
    i.status === 'overdue' ? 0 : i.status === 'sent' ? 1 : i.period === period ? 2 : 3
  return [...mine].sort((a, b) =>
    rank(a) - rank(b) || b.period.localeCompare(a.period))[0]
}
