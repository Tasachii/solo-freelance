import { download } from '../core/export'
import { fromBackup, toBackup, type RestoreResult } from '../core/backup'
import type { AppState } from '../core/types'

export function saveBackup(state: AppState, schema: number): void {
  void schema
  download(toBackup(state, new Date().toISOString()),
    `solo-backup-${state.today}.json`, 'application/json')
}

/** เปิดตัวเลือกไฟล์แล้วอ่านกลับมา — คืน null ถ้าครูกดยกเลิก */
export function pickBackup(schema: number): Promise<RestoreResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve(fromBackup(String(reader.result ?? ''), schema))
      reader.onerror = () => resolve({ ok: false, reason: 'unreadable' })
      reader.readAsText(file)
    }
    // ผู้ใช้กดยกเลิกไม่ยิง event ใด ๆ ในบางเบราว์เซอร์ — ปล่อย promise ค้างไว้ ไม่เป็นไร
    input.click()
  })
}
