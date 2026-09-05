import type { AppState } from './types'

export const BACKUP_FORMAT = 'solo-backup-1'

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
  if (!f || f.format !== BACKUP_FORMAT || !f.app || !Array.isArray(f.app.subjects)) {
    return { ok: false, reason: 'wrongFile' }
  }
  if (f.app.schemaVersion !== schema) return { ok: false, reason: 'wrongVersion' }
  return { ok: true, state: f.app }
}

/** วันที่ยังไม่ได้สำรอง — ไม่เคยสำรองเลยคืน Infinity */
export function daysSinceBackup(state: AppState, today: string, diff: (a: string, b: string) => number): number {
  return state.lastBackupAt ? diff(today, state.lastBackupAt) : Infinity
}
