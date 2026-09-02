import type { AppState } from './types'
import { completionsIn, packageStatus, subjectById } from './ledger'
import { invoiceFor } from './billing'
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
    overflow += pk.overBy * Math.round(pk.price / pk.total)
  }

  return { expected, received, outstanding, recovered: dunned + counted + overflow, breakdown: { dunned, counted, overflow } }
}

export const draftCount = (state: AppState): number => state.messages.filter((m) => m.status === 'draft').length

export function overdueDaysBySubject(state: AppState, subjectId: string): number {
  const inv = state.invoices.find(
    (i) => i.subjectId === subjectId && (i.status === 'overdue' || i.status === 'sent') && i.dueAt)
  if (!inv?.dueAt || state.today <= inv.dueAt) return 0
  const [ay, am, ad] = state.today.split('-').map(Number)
  const [by, bm, bd] = inv.dueAt.split('-').map(Number)
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000)
}

export const clientsWithChats = (state: AppState): string[] => {
  const ids = new Set(state.chats.map((c) => c.clientId))
  for (const s of state.subjects) ids.add(s.clientId)
  return [...ids]
}

export const _subjectById = subjectById
