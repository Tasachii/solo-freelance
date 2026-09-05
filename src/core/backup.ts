import type { AppState } from './types'

export const BACKUP_FORMAT = 'solo-backup-1'

/** ทุก collection ที่โค้ดวนลูปโดยไม่เช็คก่อน — ขาดตัวใดตัวหนึ่งคือจอขาว */
const COLLECTIONS = [
  'clients', 'subjects', 'units', 'completions', 'invoices',
  'payments', 'receipts', 'messages', 'chats', 'waitlist', 'events',
] as const

/**
 * state ใช้งานได้จริงไหม — ไม่ใช่แค่ 'มี subjects'
 * ใช้ร่วมกับ migrate() เพราะไฟล์ที่ขาดครึ่งกับ storage ที่เขียนไม่จบ พังแบบเดียวกัน
 */
export function isWellFormed(app: unknown): app is AppState {
  const a = app as Record<string, unknown> | null
  if (!a || typeof a !== 'object') return false
  if (COLLECTIONS.some((k) => !Array.isArray(a[k]))) return false
  const c = a.counters as Record<string, unknown> | undefined
  if (!c || typeof c.receipt !== 'number' || typeof c.invoice !== 'number') return false
  const p = a.provider as Record<string, unknown> | undefined
  if (!p || typeof p.name !== 'string') return false
  return typeof a.today === 'string' && a.today.length === 10
}

export interface BackupFile {
  format: string
  exportedAt: string
  app: AppState
}

export function toBackup(state: AppState, at: string): string {
  const file: BackupFile = { format: BACKUP_FORMAT, exportedAt: at, app: state }
  return JSON.stringify(file, null, 2)
}

export type RestoreResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: 'unreadable' | 'wrongFile' | 'wrongVersion' }

/**
 * กู้คืนไฟล์สำรอง — ปฏิเสธไฟล์ที่ไม่ใช่ของเรา
 * ยอมเสียเวลาให้ครูเลือกไฟล์ใหม่ ดีกว่าเขียนทับข้อมูลด้วยของมั่ว
 */
export function fromBackup(text: string, schema: number): RestoreResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  const f = raw as Partial<BackupFile>
  if (!f || f.format !== BACKUP_FORMAT || !isWellFormed(f.app)) {
    return { ok: false, reason: 'wrongFile' }
  }
  if (f.app.schemaVersion !== schema) return { ok: false, reason: 'wrongVersion' }
  return { ok: true, state: f.app }
}

/** วันที่ยังไม่ได้สำรอง — ไม่เคยสำรองเลยคืน Infinity */
export function daysSinceBackup(state: AppState, today: string, diff: (a: string, b: string) => number): number {
  return state.lastBackupAt ? diff(today, state.lastBackupAt) : Infinity
}
