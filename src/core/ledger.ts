import type { AppState, CompletionEvent, ServiceUnit, Subject } from './types'
import { periodOf } from './format'

export const unitById = (s: AppState, id: string): ServiceUnit | undefined => s.units.find((u) => u.id === id)
export const subjectById = (s: AppState, id: string): Subject | undefined => s.subjects.find((x) => x.id === id)
export const clientById = (s: AppState, id: string) => s.clients.find((c) => c.id === id)
export const isCompleted = (s: AppState, unitId: string): boolean => s.completions.some((c) => c.unitId === unitId)

export const unitsOn = (s: AppState, date: string): ServiceUnit[] =>
  s.units
    .filter((u) => u.scheduledAt === date)
    .filter((u) => subjectById(s, u.subjectId)?.active !== false)
    .sort((a, b) => a.time.localeCompare(b.time))

/** completions ของ subject ในเดือนหนึ่ง — นับตาม scheduledAt ของ unit */
export function completionsIn(s: AppState, subjectId: string, period: string): CompletionEvent[] {
  return s.completions.filter((c) => {
    const u = unitById(s, c.unitId)
    return !!u && u.subjectId === subjectId && periodOf(u.scheduledAt) === period
  })
}

export function completionsOfSubject(s: AppState, subjectId: string): CompletionEvent[] {
  return s.completions.filter((c) => unitById(s, c.unitId)?.subjectId === subjectId)
}

/** complete แบบ idempotent — กดซ้ำไม่เพิ่มซ้ำ */
export function complete(s: AppState, unitId: string): AppState {
  if (isCompleted(s, unitId)) return s
  const u = unitById(s, unitId)
  if (!u) return s
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

/** used = completions ที่ completedAt >= purchasedAt · remaining ไม่ติดลบ · overBy = ส่วนเกิน */
export function packageStatus(s: AppState, subject: Subject): PackageStatus | null {
  const b = subject.billing
  if (b.mode !== 'package') return null
  const used = completionsOfSubject(s, subject.id).filter((c) => c.completedAt >= b.purchasedAt).length
  const remaining = Math.max(b.total - used, 0)
  const overBy = Math.max(used - b.total, 0)
  const state = overBy > 0 || remaining === 0 ? 'exhausted' : remaining <= 2 ? 'low' : 'ok'
  return { total: b.total, used, remaining, overBy, price: b.price, purchasedAt: b.purchasedAt, state }
}

/** ต่อแพ็ก: purchasedAt = today ทำให้ used กลับเป็น 0 ทันทีเพราะ derive */
export function renewPackage(s: AppState, subjectId: string): AppState {
  const subject = subjectById(s, subjectId)
  if (!subject || subject.billing.mode !== 'package') return s
  return {
    ...s,
    subjects: s.subjects.map((x) =>
      x.id === subjectId && x.billing.mode === 'package'
        ? { ...x, billing: { ...x.billing, purchasedAt: s.today } }
        : x),
  }
}
