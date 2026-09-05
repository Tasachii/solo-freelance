import type { AppState } from './types'
import { validateState } from './validation'

export const BACKUP_FORMAT = 'solo-backup-1'

/**
 * state ใช้งานได้จริงไหม — ไม่ใช่แค่ 'มี subjects'
 * ใช้ร่วมกับ migrate() เพราะไฟล์ที่ขาดครึ่งกับ storage ที่เขียนไม่จบ พังแบบเดียวกัน
 */
export function isWellFormed(app: unknown): app is AppState {
  return validateState(app).ok
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
  | { ok: false; reason: 'unreadable' | 'wrongFile' | 'wrongVersion'; details?: string[] }

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
  if (!f || f.format !== BACKUP_FORMAT || !f.app || typeof f.app !== 'object') {
    return { ok: false, reason: 'wrongFile' }
  }
  if (f.app.schemaVersion !== schema) return { ok: false, reason: 'wrongVersion' }
  const app = f.app as unknown as Record<string, unknown>
  const requiredArrays = ['clients', 'subjects', 'units', 'completions', 'invoices', 'payments', 'receipts', 'messages', 'chats', 'waitlist', 'events']
  if (requiredArrays.some((key) => !Array.isArray(app[key]))
    || !app.counters || typeof app.counters !== 'object'
    || !app.provider || typeof app.provider !== 'object') return { ok: false, reason: 'wrongFile' }
  const validation = validateState(f.app)
  if (!validation.ok) return { ok: false, reason: 'wrongFile', details: validation.errors }
  return { ok: true, state: f.app }
}

/** วันที่ยังไม่ได้สำรอง — ไม่เคยสำรองเลยคืน Infinity */
export function daysSinceBackup(state: AppState, today: string, diff: (a: string, b: string) => number): number {
  return state.lastBackupAt ? diff(today, state.lastBackupAt) : Infinity
}
