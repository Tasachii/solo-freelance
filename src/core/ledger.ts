import type { AppState, CompletionEvent, ServiceUnit, Subject } from './types'
import { periodOf } from './format'

export const unitById = (s: AppState, id: string): ServiceUnit | undefined => s.units.find((u) => u.id === id)
export const subjectById = (s: AppState, id: string): Subject | undefined => s.subjects.find((x) => x.id === id)
export const clientById = (s: AppState, id: string) => s.clients.find((c) => c.id === id)
/**
 * วันที่เรียนจริง — อ่านจาก unit เสมอ ไม่ใช่จาก completedAt ที่ถูกแช่ไว้ตอนเช็คชื่อ
 * ถ้าอ่านสองที่ พอเลื่อนคาบแล้วบิลกับแพ็กจะนับคนละวัน
 */
export const occurredAt = (s: AppState, c: CompletionEvent): string =>
  unitById(s, c.unitId)?.scheduledAt ?? c.completedAt

/** คาบที่ถูกงดยังเก็บ completion ไว้ให้กู้คืนได้ แต่ต้องไม่ถูกนับที่ไหนเลย */
const live = (s: AppState, c: CompletionEvent): boolean => !unitById(s, c.unitId)?.cancelled

export const isCompleted = (s: AppState, unitId: string): boolean =>
  s.completions.some((c) => c.unitId === unitId && live(s, c))

export const unitsOn = (s: AppState, date: string): ServiceUnit[] =>
  s.units
    .filter((u) => u.scheduledAt === date && !u.cancelled)
    .filter((u) => subjectById(s, u.subjectId)?.active !== false)
    .sort((a, b) => a.time.localeCompare(b.time))

/** completions ของ subject ในเดือนหนึ่ง — นับตาม scheduledAt ของ unit */
export function completionsIn(s: AppState, subjectId: string, period: string): CompletionEvent[] {
  return s.completions.filter((c) => {
    const u = unitById(s, c.unitId)
    return !!u && !u.cancelled && u.subjectId === subjectId && periodOf(u.scheduledAt) === period
  })
}

export function completionsOfSubject(s: AppState, subjectId: string): CompletionEvent[] {
  return s.completions.filter((c) => {
    const u = unitById(s, c.unitId)
    return !!u && !u.cancelled && u.subjectId === subjectId
  })
}

/** complete แบบ idempotent — กดซ้ำไม่เพิ่มซ้ำ */
export function complete(s: AppState, unitId: string): AppState {
  if (isCompleted(s, unitId)) return s
  const u = unitById(s, unitId)
  if (!u || u.cancelled) return s // คาบที่ยกเลิกแล้วเช็คชื่อไม่ได้
  return { ...s, completions: [...s.completions, { unitId, completedAt: u.scheduledAt }] }
}

export function uncomplete(s: AppState, unitId: string): AppState {
  if (!isCompleted(s, unitId)) return s
  return { ...s, completions: s.completions.filter((c) => c.unitId !== unitId) }
}

export interface PackageStatus {
  total: number; used: number; remaining: number; overBy: number; price: number
  purchasedAt: string; state: 'ok' | 'low' | 'exhausted'
}

/** ราคาต่อครั้งของแพ็ก — ที่เดียวในระบบ ห้ามคำนวณซ้ำที่อื่น */
export const packageUnitPrice = (b: { total: number; price: number }): number =>
  b.total > 0 ? Math.round(b.price / b.total) : 0

/** used = completions ที่ completedAt >= purchasedAt และยังไม่ถูกแพ็กก่อนหน้านับไป */
export function packageStatus(s: AppState, subject: Subject): PackageStatus | null {
  const b = subject.billing
  if (b.mode !== 'package') return null
  const carried = new Set(b.carriedUnitIds ?? [])
  const used = completionsOfSubject(s, subject.id)
    .filter((c) => occurredAt(s, c) >= b.purchasedAt && !carried.has(c.unitId)).length
  const remaining = Math.max(b.total - used, 0)
  const overBy = Math.max(used - b.total, 0)
  const state = overBy > 0 || remaining === 0 ? 'exhausted' : remaining <= 2 ? 'low' : 'ok'
  return { total: b.total, used, remaining, overBy, price: b.price, purchasedAt: b.purchasedAt, state }
}

/**
 * ต่อแพ็ก: purchasedAt = today ทำให้ used กลับเป็น 0 เพราะ derive
 * คาบที่เรียนไปแล้ว "วันนี้" ถูกแพ็กเก่านับ (และอาจคิดเป็นส่วนเกินไปแล้ว)
 * จึงจดไว้ใน carriedUnitIds ไม่ให้แพ็กใหม่นับซ้ำ
 */
export function renewPackage(s: AppState, subjectId: string): AppState {
  const subject = subjectById(s, subjectId)
  if (!subject || subject.billing.mode !== 'package') return s
  const carried = completionsOfSubject(s, subjectId)
    .filter((c) => occurredAt(s, c) >= s.today)
    .map((c) => c.unitId)
  return {
    ...s,
    subjects: s.subjects.map((x) =>
      x.id === subjectId && x.billing.mode === 'package'
        ? { ...x, billing: { ...x.billing, purchasedAt: s.today, carriedUnitIds: carried } }
        : x),
  }
}
